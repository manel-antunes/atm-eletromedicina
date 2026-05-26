import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import * as cron from 'node-cron'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import webpush from 'web-push'

import { pool, inicializarDB } from './database'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const JWT_SECRET = process.env.JWT_SECRET ?? 'atm-eletromedicina-2026'

// ── GMAIL SMTP ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

// ── VAPID ──────────────────────────────────────────────────
webpush.setVapidDetails(
  'mailto:atm@eletromedicina.pt',
  process.env.VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
)
let subscricoesPush: webpush.PushSubscription[] = []

// ── UTILIZADORES ──────────────────────────────────────────
const UTILIZADORES = [
  { username: 'admin',   password: process.env.PASS_ADMIN   ?? 'atm2026',  nome: 'Administrador' },
  { username: 'tecnico', password: process.env.PASS_TECNICO ?? 'hprt2026', nome: 'Técnico HPRT' },
]

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

// ── LOGIN ──────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  const user = UTILIZADORES.find(u => u.username === username)
  if (!user || user.password !== password) {
    return res.status(401).json({ erro: 'Utilizador ou password incorretos' })
  }
  const token = jwt.sign({ username, nome: user.nome }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, nome: user.nome, username })
})

app.get('/api/me', autenticar, (req: any, res) => {
  res.json({ username: req.utilizador.username, nome: req.utilizador.nome })
})

// ── EMAIL ──────────────────────────────────────────────────
interface Alerta {
  descricao: string
  marca: string
  modelo: string
  numeroSAP: string
  localizacao: string
  diasRestantes: number
  proximaCalib: string
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
    subject,
    html,
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

// ── ROTAS PROTEGIDAS ───────────────────────────────────────
app.get('/api/equipamentos', autenticar, async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM equipamentos ORDER BY id')).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/equipamentos/importar', autenticar, async (req, res) => {
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
    res.json({ sucesso: true, total: equipamentos.length })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

app.get('/api/calibracoes/:sap', autenticar, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM calibracoes WHERE equipamento_sap=$1 ORDER BY data_calibracao DESC', [req.params.sap])).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/calibracoes', autenticar, async (req, res) => {
  const { equipamentoSAP, dataCalibracao, tecnico, entidade, observacoes, relatorio, aprovadoPor, novaProximaCalib } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`INSERT INTO calibracoes (equipamento_sap,data_calibracao,tecnico,entidade,observacoes,relatorio,aprovado_por) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [equipamentoSAP,dataCalibracao,tecnico,entidade,observacoes,relatorio,aprovadoPor])
    await client.query(`UPDATE equipamentos SET data_calibracao=$1,atualizado_em=NOW() WHERE numero_sap=$2`, [novaProximaCalib,equipamentoSAP])
    await client.query('COMMIT')
    res.json({ sucesso: true })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

app.get('/api/cedencias', autenticar, async (_req, res) => {
  try { res.json((await pool.query('SELECT * FROM cedencias ORDER BY criado_em DESC')).rows) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/cedencias', autenticar, async (req, res) => {
  const { equipamentoSAP, equipamentoNome, destino, responsavel, contacto, dataSaida, dataRetornoPrevista, observacoes } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`INSERT INTO cedencias (equipamento_sap,equipamento_nome,destino,responsavel,contacto,data_saida,data_retorno_prevista,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [equipamentoSAP,equipamentoNome,destino,responsavel,contacto,dataSaida,dataRetornoPrevista,observacoes])
    await client.query(`UPDATE equipamentos SET localizacao=$1,atualizado_em=NOW() WHERE numero_sap=$2`, [destino,equipamentoSAP])
    await client.query('COMMIT')
    res.json({ sucesso: true })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

app.patch('/api/cedencias/:id/retorno', autenticar, async (req, res) => {
  const { dataRetornoEfetiva } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const sap = (await client.query('SELECT equipamento_sap FROM cedencias WHERE id=$1', [req.params.id])).rows[0]?.equipamento_sap
    await client.query(`UPDATE cedencias SET ativa=FALSE,data_retorno_efetiva=$1 WHERE id=$2`, [dataRetornoEfetiva,req.params.id])
    if (sap) await client.query(`UPDATE equipamentos SET localizacao='FIXO HPRT',atualizado_em=NOW() WHERE numero_sap=$1`, [sap])
    await client.query('COMMIT')
    res.json({ sucesso: true })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

app.get('/api/config', autenticar, async (_req, res) => {
  try { res.json(await carregarConfig()) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.post('/api/config', autenticar, async (req, res) => {
  const config = req.body
  try {
    await pool.query('DELETE FROM config_email')
    await pool.query(`INSERT INTO config_email (destinatarios,agendamento_ativo,dia_semana,hora,incluir_vencidas,incluir_urgentes,incluir_em_breve) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [JSON.stringify(config.destinatarios),config.agendamento.ativo,config.agendamento.diaSemana,config.agendamento.hora,config.filtros.incluirVencidas,config.filtros.incluirUrgentes,config.filtros.incluirEmBreve])
    await iniciarCron()
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

app.post('/api/enviar-alertas', autenticar, async (req, res) => {
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

app.post('/api/documentos', autenticar, async (req, res) => {
  const { equipamentoSAP, nome, tipo, tamanho, dados } = req.body
  try {
    await pool.query(`INSERT INTO documentos (equipamento_sap,nome,tipo,tamanho,dados) VALUES ($1,$2,$3,$4,$5)`, [equipamentoSAP||null,nome,tipo,tamanho,dados])
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.delete('/api/documentos/:id', autenticar, async (req, res) => {
  try { await pool.query('DELETE FROM documentos WHERE id=$1', [req.params.id]); res.json({ sucesso: true }) }
  catch (err) { res.status(500).json({ erro: String(err) }) }
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

// ── PUSH NOTIFICATIONS ─────────────────────────────────────
app.post('/api/push/subscrever', autenticar, (req, res) => {
  const sub = req.body as webpush.PushSubscription
  const jaExiste = subscricoesPush.some(s => s.endpoint === sub.endpoint)
  if (!jaExiste) subscricoesPush.push(sub)
  res.json({ sucesso: true, total: subscricoesPush.length })
})

app.post('/api/push/notificar', autenticar, async (req, res) => {
  const { vencidas, urgentes, emBreve } = req.body
  const total = (vencidas ?? 0) + (urgentes ?? 0) + (emBreve ?? 0)
  if (total === 0) return res.json({ sucesso: true, enviados: 0 })

  const partes = [
    vencidas  > 0 ? `${vencidas} vencida${vencidas  > 1 ? 's' : ''}` : '',
    urgentes  > 0 ? `${urgentes} urgente${urgentes  > 1 ? 's' : ''}` : '',
    emBreve   > 0 ? `${emBreve} em breve`                            : '',
  ].filter(Boolean).join(' · ')

  const payload = JSON.stringify({
    titulo: '⚠️ ATM — Alertas de calibração',
    corpo: partes,
    tag: 'atm-calibracao',
    url: '/?page=relatorios',
  })

  const resultados = await Promise.allSettled(
    subscricoesPush.map(sub => webpush.sendNotification(sub, payload))
  )
  subscricoesPush = subscricoesPush.filter((_, i) => resultados[i].status === 'fulfilled')
  const enviados = resultados.filter(r => r.status === 'fulfilled').length
  res.json({ sucesso: true, enviados })
})

// ── PLANO DE PREVENTIVAS ───────────────────────────────────
app.post('/api/preventivas/importar', autenticar, async (req, res) => {
  const { mes, ano, equipamentos } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM preventivas_equipamentos WHERE mes=$1 AND ano=$2`, [mes, ano])
    await client.query(`DELETE FROM preventivas_plano WHERE mes=$1 AND ano=$2`, [mes, ano])
    const plano = await client.query(
      `INSERT INTO preventivas_plano (mes, ano, total) VALUES ($1,$2,$3) RETURNING id`,
      [mes, ano, equipamentos.length]
    )
    const planoId = plano.rows[0].id
    for (const eq of equipamentos) {
      await client.query(
        `INSERT INTO preventivas_equipamentos (plano_id,mes,ano,cod_ativo,nome,marca,modelo,numero_serie,cod_localizacao,localizacao,setor,area)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [planoId, mes, ano, eq.codAtivo, eq.nome, eq.marca, eq.modelo, eq.numeroSerie, eq.codLocalizacao, eq.localizacao, eq.setor, eq.area]
      )
    }
    await client.query('COMMIT')
    res.json({ sucesso: true, total: equipamentos.length })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})

app.get('/api/preventivas/:mes/:ano', autenticar, async (req, res) => {
  try {
    const equipamentos = await pool.query(
      `SELECT * FROM preventivas_equipamentos WHERE mes=$1 AND ano=$2 ORDER BY setor, nome`,
      [req.params.mes, req.params.ano]
    )
    res.json(equipamentos.rows)
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.patch('/api/preventivas/:id/concluir', autenticar, async (req: any, res) => {
  const { observacoes } = req.body
  try {
    await pool.query(
      `UPDATE preventivas_equipamentos SET concluido=TRUE, concluido_em=NOW(), concluido_por=$1, observacoes=$2 WHERE id=$3`,
      [req.utilizador.nome, observacoes ?? '', req.params.id]
    )
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})

app.patch('/api/preventivas/:id/desconcluir', autenticar, async (req, res) => {
  try {
    await pool.query(
      `UPDATE preventivas_equipamentos SET concluido=FALSE, concluido_em=NULL, concluido_por=NULL WHERE id=$1`,
      [req.params.id]
    )
    res.json({ sucesso: true })
  } catch (err) { res.status(500).json({ erro: String(err) }) }
})
app.post('/api/preventivas/importar-anual', autenticar, async (req, res) => {
  const { ano, meses } = req.body
  // meses = [{ mes: 1, equipamentos: [...] }, { mes: 2, equipamentos: [...] }, ...]
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Apaga todo o ano
    await client.query(`DELETE FROM preventivas_equipamentos WHERE ano=$1`, [ano])
    await client.query(`DELETE FROM preventivas_plano WHERE ano=$1`, [ano])

    for (const { mes, equipamentos: eqs } of meses) {
      if (!eqs.length) continue
      const plano = await client.query(
        `INSERT INTO preventivas_plano (mes, ano, total) VALUES ($1,$2,$3) RETURNING id`,
        [mes, ano, eqs.length]
      )
      const planoId = plano.rows[0].id
      for (const eq of eqs) {
        await client.query(
          `INSERT INTO preventivas_equipamentos (plano_id,mes,ano,cod_ativo,nome,marca,modelo,numero_serie,cod_localizacao,localizacao,setor,area)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [planoId, mes, ano, eq.codAtivo, eq.nome, eq.marca, eq.modelo, eq.numeroSerie ?? '', eq.codLocalizacao ?? '', eq.localizacao, eq.setor, eq.area ?? '']
        )
      }
    }
    await client.query('COMMIT')
    const total = meses.reduce((acc: number, m: any) => acc + m.equipamentos.length, 0)
    res.json({ sucesso: true, total, meses: meses.length })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ erro: String(err) }) }
  finally { client.release() }
})  

// ── ARRANQUE ───────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001
inicializarDB().then(() => {
  iniciarCron()
  app.listen(PORT, () => console.log(`✅ Servidor ATM a correr em http://localhost:${PORT}`))
}).catch(err => {
  console.error('❌ Erro ao inicializar base de dados:', err)
  process.exit(1)
})