import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import * as cron from 'node-cron'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import webpush from 'web-push'
import { pool, inicializarDB } from './database'

dotenv.config()

const app = express()
const FRONTEND_URL = process.env.FRONTEND_URL

app.use(cors({
  origin: (origin, callback) => {
    // Permite: sem origin (apps nativas/Postman), localhost, e o domínio do frontend configurado
    if (!origin) return callback(null, true)
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return callback(null, true)
    if (FRONTEND_URL && origin === FRONTEND_URL) return callback(null, true)
    // Fallback: aceita qualquer origem HTTPS (para deploy sem FRONTEND_URL definido)
    if (origin.startsWith('https://')) return callback(null, true)
    callback(new Error('CORS: origem não permitida'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

const JWT_SECRET         = process.env.JWT_SECRET          ?? 'atm-eletromedicina-2026'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  ?? 'atm-refresh-2026'
const BCRYPT_ROUNDS      = 10

// ── GMAIL SMTP ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
})

// ── VAPID ──────────────────────────────────────────────────
webpush.setVapidDetails(
  'mailto:atm@eletromedicina.pt',
  process.env.VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
)

// ── HELPERS ────────────────────────────────────────────────
function getIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket?.remoteAddress ?? ''
}

// ── AUDIT LOG ──────────────────────────────────────────────
async function registarAudit(
  userId: number | null,
  username: string,
  acao: string,
  entidade: string | null = null,
  entidadeId: string | null = null,
  detalhes: object | null = null,
  ip: string = ''
) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, username, acao, entidade, entidade_id, detalhes, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, username, acao, entidade, entidadeId, detalhes ? JSON.stringify(detalhes) : null, ip]
    )
  } catch (err) {
    console.error('Erro ao registar audit:', err)
  }
}

// ── MIDDLEWARE AUTH ────────────────────────────────────────
function autenticar(req: any, res: any, next: any) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ erro: 'Não autenticado' })
  try {
    req.utilizador = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' })
  }
}

// Middleware só para admins
function apenasAdmin(req: any, res: any, next: any) {
  if (req.utilizador?.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' })
  }
  next()
}

// ── SEED UTILIZADORES ──────────────────────────────────────
async function seedUtilizadores() {
  const count = await pool.query('SELECT COUNT(*) FROM users')
  if (parseInt(count.rows[0].count) > 0) return

  const passAdmin   = process.env.PASS_ADMIN   ?? 'atm2026'
  const passTecnico = process.env.PASS_TECNICO ?? 'hprt2026'

  const hashAdmin   = await bcrypt.hash(passAdmin,   BCRYPT_ROUNDS)
  const hashTecnico = await bcrypt.hash(passTecnico, BCRYPT_ROUNDS)

  await pool.query(
    `INSERT INTO users (username, password_hash, nome, role) VALUES
     ('admin',   $1, 'Administrador', 'admin'),
     ('tecnico', $2, 'Técnico HPRT',  'tecnico')`,
    [hashAdmin, hashTecnico]
  )
  console.log('✅ Utilizadores iniciais criados (admin + tecnico)')
}

// ── LOGIN ──────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND ativo = TRUE',
      [username]
    )
    const user = result.rows[0]
    if (!user) return res.status(401).json({ erro: 'Utilizador ou password incorretos' })

    const passwordOk = await bcrypt.compare(password, user.password_hash)
    if (!passwordOk) {
      await registarAudit(user.id, username, 'LOGIN_FALHOU', null, null, null, getIP(req))
      return res.status(401).json({ erro: 'Utilizador ou password incorretos' })
    }

    // Access token (8h)
    const token = jwt.sign(
      { id: user.id, username: user.username, nome: user.nome, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    // Refresh token (7 dias)
    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const deviceInfo = req.headers['user-agent'] ?? ''
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, device_info, ip, expira_em)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, refreshToken, deviceInfo, getIP(req), expiraEm]
    )

    // Atualiza último login
    await pool.query('UPDATE users SET ultimo_login = NOW() WHERE id = $1', [user.id])
    await registarAudit(user.id, username, 'LOGIN', null, null, null, getIP(req))

    res.json({ token, refreshToken, nome: user.nome, username: user.username, role: user.role })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// ── REFRESH TOKEN ──────────────────────────────────────────
app.post('/api/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ erro: 'Refresh token em falta' })

  try {
    const payload: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET)

    // Verifica se existe e não foi revogado
    const result = await pool.query(
      `SELECT rt.*, u.nome, u.role, u.ativo
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.revogado = FALSE AND rt.expira_em > NOW()`,
      [refreshToken]
    )
    if (!result.rows.length) return res.status(401).json({ erro: 'Refresh token inválido ou expirado' })

    const row = result.rows[0]
    if (!row.ativo) return res.status(401).json({ erro: 'Utilizador inativo' })

    // Novo access token
    const newToken = jwt.sign(
      { id: payload.id, username: payload.username, nome: row.nome, role: row.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({ token: newToken })
  } catch {
    res.status(401).json({ erro: 'Refresh token inválido' })
  }
})

// ── LOGOUT ─────────────────────────────────────────────────
app.post('/api/logout', autenticar, async (req: any, res) => {
  const { refreshToken } = req.body
  try {
    if (refreshToken) {
      await pool.query('UPDATE refresh_tokens SET revogado = TRUE WHERE token = $1', [refreshToken])
    }
    await registarAudit(req.utilizador.id, req.utilizador.username, 'LOGOUT', null, null, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// ── ME ─────────────────────────────────────────────────────
app.get('/api/me', autenticar, (req: any, res) => {
  res.json({
    id: req.utilizador.id,
    username: req.utilizador.username,
    nome: req.utilizador.nome,
    role: req.utilizador.role,
  })
})

// ── PERFIL — alterar password ─────────────────────────────
app.post('/api/perfil/password', autenticar, async (req: any, res) => {
  const { passwordAtual, passwordNova } = req.body
  if (!passwordAtual || !passwordNova) return res.status(400).json({ erro: 'Campos obrigatórios em falta' })
  if (passwordNova.length < 6) return res.status(400).json({ erro: 'A password deve ter pelo menos 6 caracteres' })
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.utilizador.id])
    const user = result.rows[0]
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' })
    const ok = await bcrypt.compare(passwordAtual, user.password_hash)
    if (!ok) return res.status(401).json({ erro: 'Password atual incorreta' })
    const novoHash = await bcrypt.hash(passwordNova, BCRYPT_ROUNDS)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [novoHash, req.utilizador.id])
    await registarAudit(req.utilizador.id, req.utilizador.username, 'ALTERAR_PASSWORD', null, null, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

// ── SESSÕES ATIVAS (admin) ────────────────────────────────
app.get('/api/sessoes', autenticar, apenasAdmin, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT rt.id, u.username, u.nome, rt.device_info, rt.ip, rt.criado_em, rt.expira_em
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.revogado = FALSE AND rt.expira_em > NOW()
       ORDER BY rt.criado_em DESC`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.delete('/api/sessoes/:id', autenticar, apenasAdmin, async (req: any, res) => {
  try {
    await pool.query('UPDATE refresh_tokens SET revogado = TRUE WHERE id = $1', [req.params.id])
    await registarAudit(req.utilizador.id, req.utilizador.username, 'REVOGAR_SESSAO', 'sessao', req.params.id, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// ── GESTÃO DE UTILIZADORES (admin) ───────────────────────
app.get('/api/users', autenticar, apenasAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, nome, role, ativo, criado_em, ultimo_login FROM users ORDER BY criado_em'
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/users', autenticar, apenasAdmin, async (req: any, res) => {
  const { username, password, nome, role } = req.body
  if (!username || !password || !nome || !role) return res.status(400).json({ erro: 'Campos obrigatórios em falta' })
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, nome, role) VALUES ($1, $2, $3, $4) RETURNING id, username, nome, role',
      [username, hash, nome, role]
    )
    await registarAudit(req.utilizador.id, req.utilizador.username, 'CRIAR_USER', 'user', String(result.rows[0].id), { username, nome, role }, getIP(req))
    res.json(result.rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Username já existe' })
    res.status(500).json({ erro: String(err) })
  }
})

app.patch('/api/users/:id', autenticar, apenasAdmin, async (req: any, res) => {
  const { nome, role, ativo, password } = req.body
  try {
    if (password) {
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id])
    }
    if (nome || role !== undefined || ativo !== undefined) {
      await pool.query(
        `UPDATE users SET
          nome = COALESCE($1, nome),
          role = COALESCE($2, role),
          ativo = COALESCE($3, ativo)
         WHERE id = $4`,
        [nome ?? null, role ?? null, ativo ?? null, req.params.id]
      )
    }
    await registarAudit(req.utilizador.id, req.utilizador.username, 'EDITAR_USER', 'user', req.params.id, { nome, role, ativo }, getIP(req))
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// ── AUDIT LOG (admin) ─────────────────────────────────────
app.get('/api/audit', autenticar, apenasAdmin, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_log ORDER BY criado_em DESC LIMIT 200`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// ── EMAIL ──────────────────────────────────────────────────
interface Alerta {
  descricao: string; marca: string; modelo: string; numeroSAP: string
  localizacao: string; diasRestantes: number; proximaCalib: string
  estado: 'vencido' | 'urgente' | 'aviso'
}

function gerarHTML(alertas: Alerta[]): string {
  const vencidos = alertas.filter(a => a.estado === 'vencido')
  const urgentes = alertas.filter(a => a.estado === 'urgente')
  const avisos   = alertas.filter(a => a.estado === 'aviso')
  const corEstado = { vencido: '#dc2626', urgente: '#ea580c', aviso: '#d97706' }
  const bgEstado  = { vencido: '#fef2f2', urgente: '#fff7ed', aviso: '#fffbeb' }

  function linhaEquip(a: Alerta) {
    return `<tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:12px 16px;"><p style="font-size:13px;font-weight:600;color:#0f172a;margin:0;">${a.descricao}</p><p style="font-size:11px;color:#94a3b8;margin:2px 0 0;">${a.marca} ${a.modelo} · ${a.numeroSAP}</p></td>
      <td style="padding:12px 16px;font-size:12px;color:#64748b;">${a.localizacao || '—'}</td>
      <td style="padding:12px 16px;font-size:12px;color:#64748b;">${a.proximaCalib}</td>
      <td style="padding:12px 16px;"><span style="background:${bgEstado[a.estado]};color:${corEstado[a.estado]};font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;">${a.diasRestantes < 0 ? `Venceu há ${Math.abs(a.diasRestantes)} dias` : `Em ${a.diasRestantes} dias`}</span></td>
    </tr>`
  }

  function secao(titulo: string, lista: Alerta[], cor: string) {
    if (lista.length === 0) return ''
    return `<div style="margin-bottom:24px;"><div style="background:${cor};padding:10px 16px;border-radius:8px 8px 0 0;"><h3 style="color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0;">${titulo} (${lista.length})</h3></div>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-top:none;">
      <thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Equipamento</th><th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Localização</th><th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Próxima Calib.</th><th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Estado</th></tr></thead>
      <tbody>${lista.map(linhaEquip).join('')}</tbody>
    </table></div>`
  }

  const hoje = new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;">
  <div style="max-width:700px;margin:0 auto;padding:32px 16px;">
    <div style="background:#C0001A;border-radius:12px;padding:24px 32px;margin-bottom:24px;">
      <span style="color:#fff;font-size:36px;font-weight:900;">ATM</span>
      <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:4px 0 0;">Manutenção Total · Eletromedicina</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
      ${[{label:'Vencidas',valor:vencidos.length,cor:'#dc2626',bg:'#fef2f2'},{label:'Urgentes',valor:urgentes.length,cor:'#ea580c',bg:'#fff7ed'},{label:'Em breve',valor:avisos.length,cor:'#d97706',bg:'#fffbeb'}].map(s=>`<div style="background:${s.bg};border:1px solid ${s.cor}22;border-radius:10px;padding:16px;text-align:center;"><p style="color:${s.cor};font-size:28px;font-weight:800;margin:0;">${s.valor}</p><p style="color:${s.cor};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:4px 0 0;">${s.label}</p></div>`).join('')}
    </div>
    ${secao('Calibrações Vencidas', vencidos, '#dc2626')}
    ${secao('Calibrações Urgentes', urgentes, '#ea580c')}
    ${secao('A Vencer em Breve', avisos, '#d97706')}
    <div style="text-align:center;padding:20px;border-top:1px solid #e2e8f0;margin-top:16px;"><p style="color:#94a3b8;font-size:11px;margin:0;">Gerado automaticamente pelo sistema ATM Eletromedicina · ${hoje}</p></div>
  </div></body></html>`
}

async function carregarConfig() {
  const res = await pool.query('SELECT * FROM config_email ORDER BY id DESC LIMIT 1')
  if (res.rows.length === 0) {
    return {
      destinatarios: (process.env.EMAIL_DESTINO ?? '').split(',').map((e: string) => e.trim()).filter(Boolean),
      agendamento: { ativo: false, diaSemana: '1', hora: '08:00' },
      filtros: { incluirVencidas: true, incluirUrgentes: true, incluirEmBreve: true },
    }
  }
  const r = res.rows[0]
  return {
    destinatarios: JSON.parse(r.destinatarios || '[]'),
    agendamento: { ativo: r.agendamento_ativo, diaSemana: r.dia_semana, hora: r.hora },
    filtros: { incluirVencidas: r.incluir_vencidas, incluirUrgentes: r.incluir_urgentes, incluirEmBreve: r.incluir_em_breve },
  }
}

let cronJob: cron.ScheduledTask | null = null
let ultimosAlertasCache: Alerta[] = []

async function enviarEmail(destinatarios: string[], subject: string, html: string) {
  await transporter.sendMail({
    from: `"ATM Eletromedicina" <${process.env.GMAIL_USER}>`,
    to: destinatarios.join(', '),
    subject, html,
  })
}

async function iniciarCron() {
  const config = await carregarConfig()
  if (cronJob) { cronJob.stop(); cronJob = null }
  if (!config.agendamento.ativo) return
  const [hora, minuto] = config.agendamento.hora.split(':')
  cronJob = cron.schedule(`${minuto} ${hora} * * ${config.agendamento.diaSemana}`, async () => {
    if (ultimosAlertasCache.length === 0) return
    try {
      await enviarEmail(config.destinatarios, `⚠️ ATM — Alertas de calibração · ${new Date().toLocaleDateString('pt-PT')}`, gerarHTML(ultimosAlertasCache))
      await pool.query(`INSERT INTO historico_emails (data,hora,destinatarios,total_alertas,vencidas,urgentes,em_breve,sucesso) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [new Date().toLocaleDateString('pt-PT'), new Date().toLocaleTimeString('pt-PT'), JSON.stringify(config.destinatarios), ultimosAlertasCache.length,
         ultimosAlertasCache.filter(a=>a.estado==='vencido').length, ultimosAlertasCache.filter(a=>a.estado==='urgente').length, ultimosAlertasCache.filter(a=>a.estado==='aviso').length, true])
    } catch (err) {
      await pool.query(`INSERT INTO historico_emails (data,hora,destinatarios,total_alertas,vencidas,urgentes,em_breve,sucesso,erro) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [new Date().toLocaleDateString('pt-PT'), new Date().toLocaleTimeString('pt-PT'), JSON.stringify(config.destinatarios), 0, 0, 0, 0, false, String(err)])
    }
  }, { timezone: 'Europe/Lisbon' })
}

// ── ROTAS PÚBLICAS ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── EQUIPAMENTOS ───────────────────────────────────────────
app.get('/api/equipamentos', autenticar, async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM equipamentos ORDER BY id')).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/equipamentos/importar', autenticar, apenasAdmin, async (req: any, res) => {
  const { equipamentos } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM equipamentos')
    for (const eq of equipamentos) {
      await client.query(
        `INSERT INTO equipamentos (numero_sap,descricao,marca,modelo,numero_serie,data_calibracao,responsavel,warning,localizacao,obs,obs2,obs3,cc_pasta_2025,periodicidade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (numero_sap) DO UPDATE SET descricao=$2,marca=$3,modelo=$4,numero_serie=$5,data_calibracao=$6,responsavel=$7,warning=$8,localizacao=$9,obs=$10,obs2=$11,obs3=$12,cc_pasta_2025=$13,periodicidade=$14,atualizado_em=NOW()`,
        [eq.numeroSAP,eq.descricao,eq.marca,eq.modelo,eq.numeroSerie,eq.dataCalibracao,eq.responsavel,eq.warning,eq.localizacao,eq.obs,eq.obs2,eq.obs3,eq.ccPasta2025,eq.periodicidade??'Anual']
      )
    }
    await client.query('COMMIT')
    await registarAudit(req.utilizador.id, req.utilizador.username, 'IMPORTAR_EQUIPAMENTOS', 'equipamentos', null, { total: equipamentos.length }, getIP(req))
    res.json({ sucesso: true, total: equipamentos.length })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

// ── CALIBRAÇÕES ────────────────────────────────────────────
app.get('/api/calibracoes/:sap', autenticar, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM calibracoes WHERE equipamento_sap=$1 ORDER BY data_calibracao DESC', [req.params.sap])).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/calibracoes', autenticar, async (req: any, res) => {
  const { equipamentoSAP, dataCalibracao, tecnico, entidade, observacoes, relatorio, aprovadoPor, novaProximaCalib } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`INSERT INTO calibracoes (equipamento_sap,data_calibracao,tecnico,entidade,observacoes,relatorio,aprovado_por) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [equipamentoSAP,dataCalibracao,tecnico,entidade,observacoes,relatorio,aprovadoPor])
    await client.query(`UPDATE equipamentos SET data_calibracao=$1,atualizado_em=NOW() WHERE numero_sap=$2`, [novaProximaCalib,equipamentoSAP])
    await client.query('COMMIT')
    await registarAudit(req.utilizador.id, req.utilizador.username, 'REGISTAR_CALIBRACAO', 'equipamento', equipamentoSAP, { tecnico, entidade }, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

// ── CEDÊNCIAS ──────────────────────────────────────────────
app.get('/api/cedencias', autenticar, async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM cedencias ORDER BY criado_em DESC')).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/cedencias', autenticar, async (req: any, res) => {
  const { equipamentoSAP, equipamentoNome, destino, responsavel, contacto, dataSaida, dataRetornoPrevista, observacoes } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`INSERT INTO cedencias (equipamento_sap,equipamento_nome,destino,responsavel,contacto,data_saida,data_retorno_prevista,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [equipamentoSAP,equipamentoNome,destino,responsavel,contacto,dataSaida,dataRetornoPrevista,observacoes])
    await client.query(`UPDATE equipamentos SET localizacao=$1,atualizado_em=NOW() WHERE numero_sap=$2`, [destino,equipamentoSAP])
    await client.query('COMMIT')
    await registarAudit(req.utilizador.id, req.utilizador.username, 'CRIAR_CEDENCIA', 'equipamento', equipamentoSAP, { destino, responsavel }, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

app.patch('/api/cedencias/:id/retorno', autenticar, async (req: any, res) => {
  const { dataRetornoEfetiva } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const sap = (await client.query('SELECT equipamento_sap FROM cedencias WHERE id=$1', [req.params.id])).rows[0]?.equipamento_sap
    await client.query(`UPDATE cedencias SET ativa=FALSE,data_retorno_efetiva=$1 WHERE id=$2`, [dataRetornoEfetiva,req.params.id])
    if (sap) await client.query(`UPDATE equipamentos SET localizacao='FIXO HPRT',atualizado_em=NOW() WHERE numero_sap=$1`, [sap])
    await client.query('COMMIT')
    await registarAudit(req.utilizador.id, req.utilizador.username, 'REGISTAR_RETORNO', 'cedencia', req.params.id, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

// ── CONFIG EMAIL ───────────────────────────────────────────
app.get('/api/config', autenticar, async (_req, res) => {
  try { res.json(await carregarConfig()) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/config', autenticar, apenasAdmin, async (req: any, res) => {
  const config = req.body
  try {
    await pool.query('DELETE FROM config_email')
    await pool.query(`INSERT INTO config_email (destinatarios,agendamento_ativo,dia_semana,hora,incluir_vencidas,incluir_urgentes,incluir_em_breve) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [JSON.stringify(config.destinatarios),config.agendamento.ativo,config.agendamento.diaSemana,config.agendamento.hora,config.filtros.incluirVencidas,config.filtros.incluirUrgentes,config.filtros.incluirEmBreve])
    await iniciarCron()
    await registarAudit(req.utilizador.id, req.utilizador.username, 'ATUALIZAR_CONFIG_EMAIL', null, null, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.get('/api/historico', autenticar, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM historico_emails ORDER BY criado_em DESC LIMIT 50')
    res.json(result.rows.map(r => ({ id: String(r.id), data: r.data, hora: r.hora, destinatarios: JSON.parse(r.destinatarios||'[]'), totalAlertas: r.total_alertas, vencidas: r.vencidas, urgentes: r.urgentes, emBreve: r.em_breve, sucesso: r.sucesso, erro: r.erro })))
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/alertas-cache', autenticar, (req, res) => {
  ultimosAlertasCache = req.body.alertas
  res.json({ sucesso: true })
})

app.post('/api/enviar-alertas', autenticar, async (req: any, res) => {
  const { alertas, destinatarios } = req.body
  if (!alertas?.length) return res.status(400).json({ erro: 'Sem alertas.' })
  ultimosAlertasCache = alertas
  const config = await carregarConfig()
  const destinos = destinatarios ?? config.destinatarios
  try {
    await enviarEmail(destinos, `⚠️ ATM — ${alertas.filter((a:Alerta)=>a.estado==='vencido').length} vencidas · ${new Date().toLocaleDateString('pt-PT')}`, gerarHTML(alertas))
    await pool.query(`INSERT INTO historico_emails (data,hora,destinatarios,total_alertas,vencidas,urgentes,em_breve,sucesso) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [new Date().toLocaleDateString('pt-PT'),new Date().toLocaleTimeString('pt-PT'),JSON.stringify(destinos),alertas.length,
       alertas.filter((a:Alerta)=>a.estado==='vencido').length,alertas.filter((a:Alerta)=>a.estado==='urgente').length,alertas.filter((a:Alerta)=>a.estado==='aviso').length,true])
    await registarAudit(req.utilizador.id, req.utilizador.username, 'ENVIAR_EMAIL_ALERTAS', null, null, { total: alertas.length }, getIP(req))
    res.json({ sucesso: true, enviados: alertas.length })
  } catch (err) {
    await pool.query(`INSERT INTO historico_emails (data,hora,destinatarios,total_alertas,vencidas,urgentes,em_breve,sucesso,erro) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [new Date().toLocaleDateString('pt-PT'),new Date().toLocaleTimeString('pt-PT'),JSON.stringify(destinos),0,0,0,0,false,String(err)])
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/testar-email', autenticar, async (_req, res) => {
  const config = await carregarConfig()
  try {
    await enviarEmail(config.destinatarios, '✅ ATM — Teste de configuração',
      `<div style="padding:32px;max-width:500px;margin:0 auto;"><h2 style="color:#C0001A;">ATM Eletromedicina</h2><p>O sistema de notificações está a funcionar corretamente.</p><p style="color:#94a3b8;font-size:12px;">Enviado em ${new Date().toLocaleString('pt-PT')}</p></div>`)
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

// ── DESCRIÇÕES IA ──────────────────────────────────────────
app.get('/api/descricao/:sap', autenticar, async (req, res) => {
  try { res.json({ descricao: (await pool.query('SELECT descricao_tecnica FROM descricoes_equipamentos WHERE equipamento_sap=$1', [req.params.sap])).rows[0]?.descricao_tecnica ?? null }) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/descricao/:sap', autenticar, async (req, res) => {
  const { descricao } = req.body
  try {
    await pool.query(`INSERT INTO descricoes_equipamentos (equipamento_sap,descricao_tecnica) VALUES ($1,$2) ON CONFLICT (equipamento_sap) DO UPDATE SET descricao_tecnica=$2,gerado_em=NOW()`, [req.params.sap,descricao])
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/descricao-ia', autenticar, async (req, res) => {
  const { descricao, marca, modelo } = req.body
  const nome = `${descricao} ${marca} ${modelo}`.toLowerCase()
  const base: Record<string, string[]> = {
    'multiparametrico': [`**Função principal**\nEquipamento de simulação multiparamétrica para verificação de monitores de sinais vitais.\n\n**Normas relevantes**\nIEC 60601-1, IEC 60601-2-27.\n\n**Calibração**\nAnual obrigatória.`],
    'analisador de seguranca': [`**Função principal**\nAnalisador de segurança elétrica para dispositivos médicos.\n\n**Normas relevantes**\nIEC 60601-1, IEC 62353.\n\n**Calibração**\nSemestral ou anual.`],
    'multimetro': [`**Função principal**\nInstrumento de medição elétrica multifunções de alta precisão.\n\n**Normas relevantes**\nIEC 61010-1, CAT III/IV.\n\n**Calibração**\nAnual obrigatória.`],
  }
  const basePadrao = [`**Função principal**\nEquipamento de teste e medição especializado da Unidade de Eletromedicina da ATM.\n\n**Normas aplicáveis**\nIEC 60601-1.\n\n**Calibração**\nAnual obrigatória por entidade acreditada pelo IPAC.`]
  let candidatos: string[] = []
  let melhorScore = 0
  for (const [chave, textos] of Object.entries(base)) {
    const score = chave.split(' ').filter(p => nome.includes(p)).length
    if (score > melhorScore) { melhorScore = score; candidatos = textos }
  }
  if (candidatos.length === 0) candidatos = basePadrao
  res.json({ descricao: candidatos[Math.floor(Math.random() * candidatos.length)] })
})

// ── DOCUMENTOS ─────────────────────────────────────────────
app.get('/api/documentos', autenticar, async (_req, res) => {
  try { res.json((await pool.query('SELECT id,equipamento_sap,nome,tipo,tamanho,criado_em FROM documentos ORDER BY criado_em DESC')).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.get('/api/documentos/download/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT nome,tipo,dados FROM documentos WHERE id=$1', [req.params.id])
    if (!result.rows.length) return res.status(404).json({ erro: 'Documento não encontrado' })
    const { nome, dados } = result.rows[0]
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`)
    res.send(Buffer.from(dados, 'base64'))
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.get('/api/documentos/:sap', autenticar, async (req, res) => {
  try { res.json((await pool.query('SELECT id,equipamento_sap,nome,tipo,tamanho,criado_em FROM documentos WHERE equipamento_sap=$1 ORDER BY criado_em DESC', [req.params.sap])).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/documentos', autenticar, async (req: any, res) => {
  const { equipamentoSAP, nome, tipo, tamanho, dados } = req.body
  try {
    await pool.query(`INSERT INTO documentos (equipamento_sap,nome,tipo,tamanho,dados) VALUES ($1,$2,$3,$4,$5)`, [equipamentoSAP||null,nome,tipo,tamanho,dados])
    await registarAudit(req.utilizador.id, req.utilizador.username, 'UPLOAD_DOCUMENTO', 'equipamento', equipamentoSAP, { nome, tipo }, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.delete('/api/documentos/:id', autenticar, async (req: any, res) => {
  try {
    await pool.query('DELETE FROM documentos WHERE id=$1', [req.params.id])
    await registarAudit(req.utilizador.id, req.utilizador.username, 'APAGAR_DOCUMENTO', 'documento', req.params.id, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

// ── PUSH NOTIFICATIONS ─────────────────────────────────────
app.post('/api/push/subscrever', autenticar, async (req, res) => {
  const sub = req.body as webpush.PushSubscription
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, subscription) VALUES ($1, $2)
       ON CONFLICT (endpoint) DO UPDATE SET subscription = $2`,
      [sub.endpoint, JSON.stringify(sub)]
    )
    const { rows } = await pool.query('SELECT COUNT(*) FROM push_subscriptions')
    res.json({ sucesso: true, total: parseInt(rows[0].count) })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/push/notificar', autenticar, async (req, res) => {
  const { vencidas, urgentes, emBreve } = req.body
  const total = (vencidas ?? 0) + (urgentes ?? 0) + (emBreve ?? 0)
  if (total === 0) return res.json({ sucesso: true, enviados: 0 })
  const partes = [
    vencidas  > 0 ? `${vencidas} vencida${vencidas  > 1 ? 's' : ''}` : '',
    urgentes  > 0 ? `${urgentes} urgente${urgentes  > 1 ? 's' : ''}` : '',
    emBreve   > 0 ? `${emBreve} em breve` : '',
  ].filter(Boolean).join(' · ')
  const payload = JSON.stringify({ titulo: '⚠️ ATM — Alertas de calibração', corpo: partes, tag: 'atm-calibracao', url: '/?page=relatorios' })
  try {
    const { rows } = await pool.query('SELECT id, subscription FROM push_subscriptions')
    const resultados = await Promise.allSettled(
      rows.map((r: { id: number; subscription: webpush.PushSubscription }) =>
        webpush.sendNotification(r.subscription, payload)
      )
    )
    // Remove subscrições expiradas/inválidas
    const idsParaRemover = rows
      .filter((_: unknown, i: number) => resultados[i].status === 'rejected')
      .map((r: { id: number }) => r.id)
    if (idsParaRemover.length > 0) {
      await pool.query(`DELETE FROM push_subscriptions WHERE id = ANY($1)`, [idsParaRemover])
    }
    res.json({ sucesso: true, enviados: resultados.filter(r => r.status === 'fulfilled').length })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

// ── PREVENTIVAS ────────────────────────────────────────────
app.post('/api/preventivas/importar', autenticar, async (req: any, res) => {
  const { mes, ano, equipamentos } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM preventivas_equipamentos WHERE mes=$1 AND ano=$2`, [mes, ano])
    await client.query(`DELETE FROM preventivas_plano WHERE mes=$1 AND ano=$2`, [mes, ano])
    const plano = await client.query(`INSERT INTO preventivas_plano (mes, ano, total) VALUES ($1,$2,$3) RETURNING id`, [mes, ano, equipamentos.length])
    const planoId = plano.rows[0].id
    for (const eq of equipamentos) {
      await client.query(
        `INSERT INTO preventivas_equipamentos (plano_id,mes,ano,cod_ativo,nome,marca,modelo,numero_serie,cod_localizacao,localizacao,setor,area) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [planoId, mes, ano, eq.codAtivo, eq.nome, eq.marca, eq.modelo, eq.numeroSerie, eq.codLocalizacao, eq.localizacao, eq.setor, eq.area]
      )
    }
    await client.query('COMMIT')
    await registarAudit(req.utilizador.id, req.utilizador.username, 'IMPORTAR_PREVENTIVAS', null, null, { mes, ano, total: equipamentos.length }, getIP(req))
    res.json({ sucesso: true, total: equipamentos.length })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

app.get('/api/preventivas/:mes/:ano', autenticar, async (req, res) => {
  try {
    res.json((await pool.query(`SELECT * FROM preventivas_equipamentos WHERE mes=$1 AND ano=$2 ORDER BY setor, nome`, [req.params.mes, req.params.ano])).rows)
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.patch('/api/preventivas/:id/concluir', autenticar, async (req: any, res) => {
  const { observacoes } = req.body
  try {
    await pool.query(`UPDATE preventivas_equipamentos SET concluido=TRUE, concluido_em=NOW(), concluido_por=$1, observacoes=$2 WHERE id=$3`,
      [req.utilizador.nome, observacoes ?? '', req.params.id])
    await registarAudit(req.utilizador.id, req.utilizador.username, 'CONCLUIR_PREVENTIVA', 'preventiva', req.params.id, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.patch('/api/preventivas/:id/desconcluir', autenticar, async (req: any, res) => {
  try {
    await pool.query(`UPDATE preventivas_equipamentos SET concluido=FALSE, concluido_em=NULL, concluido_por=NULL WHERE id=$1`, [req.params.id])
    await registarAudit(req.utilizador.id, req.utilizador.username, 'DESCONCLUIR_PREVENTIVA', 'preventiva', req.params.id, null, getIP(req))
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/preventivas/importar-anual', autenticar, async (req: any, res) => {
  const { ano, meses } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM preventivas_equipamentos WHERE ano=$1`, [ano])
    await client.query(`DELETE FROM preventivas_plano WHERE ano=$1`, [ano])
    for (const { mes, equipamentos: eqs } of meses) {
      if (!eqs.length) continue
      const plano = await client.query(`INSERT INTO preventivas_plano (mes, ano, total) VALUES ($1,$2,$3) RETURNING id`, [mes, ano, eqs.length])
      const planoId = plano.rows[0].id
      for (const eq of eqs) {
        await client.query(
          `INSERT INTO preventivas_equipamentos (plano_id,mes,ano,cod_ativo,nome,marca,modelo,numero_serie,cod_localizacao,localizacao,setor,area) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [planoId, mes, ano, eq.codAtivo, eq.nome, eq.marca, eq.modelo, eq.numeroSerie ?? '', eq.codLocalizacao ?? '', eq.localizacao, eq.setor, eq.area ?? '']
        )
      }
    }
    await client.query('COMMIT')
    const total = meses.reduce((acc: number, m: any) => acc + m.equipamentos.length, 0)
    await registarAudit(req.utilizador.id, req.utilizador.username, 'IMPORTAR_PREVENTIVAS_ANUAL', null, null, { ano, total, meses: meses.length }, getIP(req))
    res.json({ sucesso: true, total, meses: meses.length })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

// ── ROTA PÚBLICA EQUIPAMENTO ───────────────────────────────
app.get('/api/pub/equipamento/:sap', async (req, res) => {
  try {
    const { sap } = req.params
    const eqCalib = await pool.query('SELECT * FROM equipamentos WHERE numero_sap=$1', [sap])
    if (eqCalib.rows.length > 0) {
      const eq = eqCalib.rows[0]
      return res.json({ tipo: 'calibracao', numeroSAP: eq.numero_sap, descricao: eq.descricao, marca: eq.marca, modelo: eq.modelo, numeroSerie: eq.numero_serie, localizacao: eq.localizacao, dataCalibracao: eq.data_calibracao, periodicidade: eq.periodicidade, responsavel: eq.responsavel })
    }
    const eqPrev = await pool.query('SELECT DISTINCT ON (cod_ativo) * FROM preventivas_equipamentos WHERE cod_ativo=$1 ORDER BY cod_ativo, ano DESC, mes DESC', [sap])
    if (eqPrev.rows.length > 0) {
      const eq = eqPrev.rows[0]
      return res.json({ tipo: 'preventiva', numeroSAP: eq.cod_ativo, descricao: eq.nome, marca: eq.marca, modelo: eq.modelo, numeroSerie: eq.numero_serie, localizacao: eq.localizacao, setor: eq.setor, area: eq.area })
    }
    res.status(404).json({ erro: 'Equipamento não encontrado' })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

// ── ARRANQUE ───────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001
inicializarDB().then(async () => {
  await seedUtilizadores()
  iniciarCron()
  app.listen(PORT, () => console.log(`✅ Servidor ATM a correr em http://localhost:${PORT}`))
}).catch(err => {
  console.error('❌ Erro ao inicializar base de dados:', err)
  process.exit(1)
})