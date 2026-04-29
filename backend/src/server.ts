import express from 'express'
import nodemailer from 'nodemailer'
import cors from 'cors'
import dotenv from 'dotenv'
import * as cron from 'node-cron'
import { pool, inicializarDB } from './database'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})
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
    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:12px 16px;">
          <p style="font-size:13px;font-weight:600;color:#0f172a;margin:0;">${a.descricao}</p>
          <p style="font-size:11px;color:#94a3b8;margin:2px 0 0;">${a.marca} ${a.modelo} · ${a.numeroSAP}</p>
        </td>
        <td style="padding:12px 16px;font-size:12px;color:#64748b;">${a.localizacao || '—'}</td>
        <td style="padding:12px 16px;font-size:12px;color:#64748b;">${a.proximaCalib}</td>
        <td style="padding:12px 16px;">
          <span style="background:${bgEstado[a.estado]};color:${corEstado[a.estado]};font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;">
            ${a.diasRestantes < 0 ? `Venceu há ${Math.abs(a.diasRestantes)} dias` : `Em ${a.diasRestantes} dias`}
          </span>
        </td>
      </tr>
    `
  }

  function secao(titulo: string, lista: Alerta[], cor: string) {
    if (lista.length === 0) return ''
    return `
      <div style="margin-bottom:24px;">
        <div style="background:${cor};padding:10px 16px;border-radius:8px 8px 0 0;">
          <h3 style="color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0;">${titulo} (${lista.length})</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-top:none;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Equipamento</th>
              <th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Localização</th>
              <th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Próxima Calib.</th>
              <th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Estado</th>
            </tr>
          </thead>
          <tbody>${lista.map(linhaEquip).join('')}</tbody>
        </table>
      </div>
    `
  }

  const hoje = new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:700px;margin:0 auto;padding:32px 16px;">
      <div style="background:#C0001A;border-radius:12px;padding:24px 32px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <span style="color:#fff;font-size:36px;font-weight:900;font-family:Arial Black,Arial,sans-serif;letter-spacing:-1px;line-height:1;">ATM</span>
          <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:4px 0 0;">Manutenção Total · Eletromedicina</p>
        </div>
        <div style="text-align:right;">
          <p style="color:rgba(255,255,255,0.5);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0;">Relatório de Alertas</p>
          <p style="color:#fff;font-size:12px;font-weight:600;margin:4px 0 0;text-transform:capitalize;">${hoje}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
        ${[
          { label: 'Vencidas', valor: vencidos.length, cor: '#dc2626', bg: '#fef2f2' },
          { label: 'Urgentes', valor: urgentes.length, cor: '#ea580c', bg: '#fff7ed' },
          { label: 'Em breve', valor: avisos.length,   cor: '#d97706', bg: '#fffbeb' },
        ].map(s => `
          <div style="background:${s.bg};border:1px solid ${s.cor}22;border-radius:10px;padding:16px;text-align:center;">
            <p style="color:${s.cor};font-size:28px;font-weight:800;font-family:monospace;margin:0;">${s.valor}</p>
            <p style="color:${s.cor};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:4px 0 0;">${s.label}</p>
          </div>
        `).join('')}
      </div>
      ${secao('Calibrações Vencidas', vencidos, '#dc2626')}
      ${secao('Calibrações Urgentes', urgentes, '#ea580c')}
      ${secao('A Vencer em Breve', avisos, '#d97706')}
      <div style="text-align:center;padding:20px;border-top:1px solid #e2e8f0;margin-top:16px;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">Este email foi gerado automaticamente pelo sistema ATM Eletromedicina.</p>
      </div>
    </div>
    </body></html>
  `
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

async function iniciarCron() {
  const config = await carregarConfig()
  if (cronJob) { cronJob.stop(); cronJob = null }
  if (!config.agendamento.ativo) return
  const [hora, minuto] = config.agendamento.hora.split(':')
  const expressao = `${minuto} ${hora} * * ${config.agendamento.diaSemana}`
  cronJob = cron.schedule(expressao, async () => {
    if (ultimosAlertasCache.length === 0) return
    try {
      await transporter.sendMail({
        from: `"ATM Eletromedicina" <${process.env.EMAIL_USER}>`,
        to: config.destinatarios.join(', '),
        subject: `⚠️ ATM — Alertas de calibração · ${new Date().toLocaleDateString('pt-PT')}`,
        html: gerarHTML(ultimosAlertasCache),
      })
      await pool.query(
        `INSERT INTO historico_emails (data, hora, destinatarios, total_alertas, vencidas, urgentes, em_breve, sucesso)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          new Date().toLocaleDateString('pt-PT'),
          new Date().toLocaleTimeString('pt-PT'),
          JSON.stringify(config.destinatarios),
          ultimosAlertasCache.length,
          ultimosAlertasCache.filter(a => a.estado === 'vencido').length,
          ultimosAlertasCache.filter(a => a.estado === 'urgente').length,
          ultimosAlertasCache.filter(a => a.estado === 'aviso').length,
          true,
        ]
      )
    } catch (err) {
      await pool.query(
        `INSERT INTO historico_emails (data, hora, destinatarios, total_alertas, vencidas, urgentes, em_breve, sucesso, erro)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [new Date().toLocaleDateString('pt-PT'), new Date().toLocaleTimeString('pt-PT'),
         JSON.stringify(config.destinatarios), 0, 0, 0, 0, false, String(err)]
      )
    }
  }, { timezone: 'Europe/Lisbon' })
}

// --- ROTAS ---

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Equipamentos
app.get('/api/equipamentos', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipamentos ORDER BY id')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/equipamentos/importar', async (req, res) => {
  const { equipamentos } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM equipamentos')
    for (const eq of equipamentos) {
      await client.query(
        `INSERT INTO equipamentos (numero_sap, descricao, marca, modelo, numero_serie, data_calibracao, responsavel, warning, localizacao, obs, obs2, obs3, cc_pasta_2025, periodicidade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (numero_sap) DO UPDATE SET
           descricao=$2, marca=$3, modelo=$4, numero_serie=$5, data_calibracao=$6,
           responsavel=$7, warning=$8, localizacao=$9, obs=$10, obs2=$11, obs3=$12,
           cc_pasta_2025=$13, periodicidade=$14, atualizado_em=NOW()`,
        [eq.numeroSAP, eq.descricao, eq.marca, eq.modelo, eq.numeroSerie,
         eq.dataCalibracao, eq.responsavel, eq.warning, eq.localizacao,
         eq.obs, eq.obs2, eq.obs3, eq.ccPasta2025, eq.periodicidade ?? 'Anual']
      )
    }
    await client.query('COMMIT')
    res.json({ sucesso: true, total: equipamentos.length })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ erro: String(err) })
  } finally {
    client.release()
  }
})

// Calibrações
app.get('/api/calibracoes/:sap', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM calibracoes WHERE equipamento_sap=$1 ORDER BY data_calibracao DESC',
      [req.params.sap]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/calibracoes', async (req, res) => {
  const { equipamentoSAP, dataCalibracao, tecnico, entidade, observacoes, relatorio, aprovadoPor, novaProximaCalib } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO calibracoes (equipamento_sap, data_calibracao, tecnico, entidade, observacoes, relatorio, aprovado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [equipamentoSAP, dataCalibracao, tecnico, entidade, observacoes, relatorio, aprovadoPor]
    )
    await client.query(
      `UPDATE equipamentos SET data_calibracao=$1, atualizado_em=NOW() WHERE numero_sap=$2`,
      [novaProximaCalib, equipamentoSAP]
    )
    await client.query('COMMIT')
    res.json({ sucesso: true })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ erro: String(err) })
  } finally {
    client.release()
  }
})

// Cedências
app.get('/api/cedencias', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cedencias ORDER BY criado_em DESC')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/cedencias', async (req, res) => {
  const { equipamentoSAP, equipamentoNome, destino, responsavel, contacto, dataSaida, dataRetornoPrevista, observacoes } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO cedencias (equipamento_sap, equipamento_nome, destino, responsavel, contacto, data_saida, data_retorno_prevista, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [equipamentoSAP, equipamentoNome, destino, responsavel, contacto, dataSaida, dataRetornoPrevista, observacoes]
    )
    await client.query(
      `UPDATE equipamentos SET localizacao=$1, atualizado_em=NOW() WHERE numero_sap=$2`,
      [destino, equipamentoSAP]
    )
    await client.query('COMMIT')
    res.json({ sucesso: true })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ erro: String(err) })
  } finally {
    client.release()
  }
})

app.patch('/api/cedencias/:id/retorno', async (req, res) => {
  const { dataRetornoEfetiva } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const cedResult = await client.query('SELECT equipamento_sap FROM cedencias WHERE id=$1', [req.params.id])
    const sap = cedResult.rows[0]?.equipamento_sap
    await client.query(
      `UPDATE cedencias SET ativa=FALSE, data_retorno_efetiva=$1 WHERE id=$2`,
      [dataRetornoEfetiva, req.params.id]
    )
    if (sap) {
      await client.query(`UPDATE equipamentos SET localizacao='FIXO HPRT', atualizado_em=NOW() WHERE numero_sap=$1`, [sap])
    }
    await client.query('COMMIT')
    res.json({ sucesso: true })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ erro: String(err) })
  } finally {
    client.release()
  }
})

// Config email
app.get('/api/config', async (_req, res) => {
  try {
    res.json(await carregarConfig())
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/config', async (req, res) => {
  const config = req.body
  try {
    await pool.query('DELETE FROM config_email')
    await pool.query(
      `INSERT INTO config_email (destinatarios, agendamento_ativo, dia_semana, hora, incluir_vencidas, incluir_urgentes, incluir_em_breve)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        JSON.stringify(config.destinatarios),
        config.agendamento.ativo,
        config.agendamento.diaSemana,
        config.agendamento.hora,
        config.filtros.incluirVencidas,
        config.filtros.incluirUrgentes,
        config.filtros.incluirEmBreve,
      ]
    )
    await iniciarCron()
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Histórico emails
app.get('/api/historico', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM historico_emails ORDER BY criado_em DESC LIMIT 50')
    res.json(result.rows.map(r => ({
      id: String(r.id),
      data: r.data,
      hora: r.hora,
      destinatarios: JSON.parse(r.destinatarios || '[]'),
      totalAlertas: r.total_alertas,
      vencidas: r.vencidas,
      urgentes: r.urgentes,
      emBreve: r.em_breve,
      sucesso: r.sucesso,
      erro: r.erro,
    })))
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Enviar alertas
app.post('/api/alertas-cache', (req, res) => {
  ultimosAlertasCache = req.body.alertas
  res.json({ sucesso: true })
})

app.post('/api/enviar-alertas', async (req, res) => {
  const { alertas, destinatarios } = req.body
  if (!alertas?.length) return res.status(400).json({ erro: 'Sem alertas.' })
  ultimosAlertasCache = alertas
  const config = await carregarConfig()
  const destinos = destinatarios ?? config.destinatarios
  try {
    await transporter.sendMail({
      from: `"ATM Eletromedicina" <${process.env.EMAIL_USER}>`,
      to: destinos.join(', '),
      subject: `⚠️ ATM — ${alertas.filter((a: Alerta) => a.estado==='vencido').length} vencidas · ${new Date().toLocaleDateString('pt-PT')}`,
      html: gerarHTML(alertas),
    })
    await pool.query(
      `INSERT INTO historico_emails (data, hora, destinatarios, total_alertas, vencidas, urgentes, em_breve, sucesso)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [new Date().toLocaleDateString('pt-PT'), new Date().toLocaleTimeString('pt-PT'),
       JSON.stringify(destinos), alertas.length,
       alertas.filter((a: Alerta) => a.estado==='vencido').length,
       alertas.filter((a: Alerta) => a.estado==='urgente').length,
       alertas.filter((a: Alerta) => a.estado==='aviso').length, true]
    )
    res.json({ sucesso: true, enviados: alertas.length })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/testar-email', async (_req, res) => {
  const config = await carregarConfig()
  try {
    await transporter.sendMail({
      from: `"ATM Eletromedicina" <${process.env.EMAIL_USER}>`,
      to: config.destinatarios.join(', '),
      subject: '✅ ATM — Teste de configuração',
      html: `<div style="font-family:sans-serif;padding:32px;max-width:500px;margin:0 auto;">
        <h2 style="color:#C0001A;">ATM Eletromedicina</h2>
        <p>O sistema de notificações está a funcionar corretamente.</p>
        <p style="color:#94a3b8;font-size:12px;">Enviado em ${new Date().toLocaleString('pt-PT')}</p>
      </div>`,
    })
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// ... resto do código ...

app.get('/api/descricao/:sap', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT descricao_tecnica FROM descricoes_equipamentos WHERE equipamento_sap=$1',
      [req.params.sap]
    )
    res.json({ descricao: result.rows[0]?.descricao_tecnica ?? null })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/descricao/:sap', async (req, res) => {
  const { descricao } = req.body
  try {
    await pool.query(
      `INSERT INTO descricoes_equipamentos (equipamento_sap, descricao_tecnica)
       VALUES ($1, $2)
       ON CONFLICT (equipamento_sap) DO UPDATE SET descricao_tecnica=$2, gerado_em=NOW()`,
      [req.params.sap, descricao]
    )
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Documentos
app.get('/api/documentos', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, equipamento_sap, nome, tipo, tamanho, criado_em FROM documentos ORDER BY criado_em DESC')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.get('/api/documentos/:sap', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, equipamento_sap, nome, tipo, tamanho, criado_em FROM documentos WHERE equipamento_sap=$1 ORDER BY criado_em DESC',
      [req.params.sap]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.get('/api/documentos/download/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT nome, tipo, dados FROM documentos WHERE id=$1', [req.params.id])
    if (!result.rows.length) return res.status(404).json({ erro: 'Documento não encontrado' })
    const { nome, tipo, dados } = result.rows[0]
    const buffer = Buffer.from(dados, 'base64')
    res.setHeader('Content-Type', tipo || 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.post('/api/documentos', async (req, res) => {
  const { equipamentoSAP, nome, tipo, tamanho, dados } = req.body
  try {
    await pool.query(
      `INSERT INTO documentos (equipamento_sap, nome, tipo, tamanho, dados) VALUES ($1,$2,$3,$4,$5)`,
      [equipamentoSAP || null, nome, tipo, tamanho, dados]
    )
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

app.delete('/api/documentos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM documentos WHERE id=$1', [req.params.id])
    res.json({ sucesso: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Iniciar
const PORT = process.env.PORT ?? 3001
// Rota para gerar descrição com IA
app.post('/api/descricao-ia', async (req, res) => {
  const { descricao, marca, modelo } = req.body
  const nome = `${descricao} ${marca} ${modelo}`.toLowerCase()

  const base: Record<string, string[]> = {
    'multiparametrico': [
      `**Função principal**\nEquipamento de simulação multiparamétrica para verificação de monitores de sinais vitais. Gera sinais fisiológicos com elevada precisão para validar o correto funcionamento de monitores de doente.\n\n**Princípio de funcionamento**\nProduz sinais elétricos simulados de ECG, SpO2, NIBP, temperatura e respiração, permitindo testar monitores sem necessidade de doente real.\n\n**Aplicações clínicas**\nVerificação de monitores em UCI, bloco operatório, urgência e enfermarias durante manutenção preventiva e corretiva.\n\n**Parâmetros medidos**\nECG (12 derivações), frequência cardíaca, SpO2, NIBP, temperatura, frequência respiratória.\n\n**Normas relevantes**\nIEC 60601-1, IEC 60601-2-27, IEC 62133.\n\n**Cuidados de calibração**\nCalibração anual obrigatória para garantir rastreabilidade metrológica e conformidade com acreditação hospitalar.`,

      `**Função principal**\nSimulador de sinais vitais de alta precisão para manutenção e verificação de monitores de doente multiparamétricos.\n\n**Princípio de funcionamento**\nGera formas de onda fisiológicas digitalmente sintetizadas com tolerâncias rigorosas. Simula condições normais e patológicas para teste completo dos monitores.\n\n**Aplicações clínicas**\nIndispensável em programas de manutenção preventiva hospitalar. Utilizado em UCI, blocos operatórios, urgência e transporte de doentes críticos.\n\n**Parâmetros simulados**\nECG multiderivações com arritmias, saturação periférica de oxigénio, pressão arterial não invasiva, temperatura corporal e capnografia.\n\n**Normas aplicáveis**\nIEC 60601-1, IEC 60601-2-27, EN ISO 80601-2-61.\n\n**Periodicidade de calibração**\nCalibração anual por entidade acreditada. Fundamental para validação do programa de manutenção preventiva.`,

      `**Descrição técnica**\nO simulador multiparamétrico é o equipamento central de qualquer unidade de engenharia biomédica. Permite verificar a totalidade dos parâmetros monitorizados em doentes críticos sem recurso a voluntários ou pacientes.\n\n**Funcionamento**\nBaseado em geração digital de sinais com conversores D/A de alta resolução. Produz sinais elétricos, óticos e de pressão que imitam fielmente os sinais fisiológicos humanos.\n\n**Uso clínico**\nVerificação periódica de monitores em todas as áreas críticas do hospital. Deteção precoce de deriva de calibração antes que afete a segurança do doente.\n\n**Grandezas simuladas**\nECG, SpO2, IBP, NIBP, temperatura, respiração, capnografia e débito cardíaco.\n\n**Referências normativas**\nIEC 60601-1 (3ª edição), IEC 60601-2-27, IEC 60601-2-49.\n\n**Manutenção metrológica**\nCalibração anual com emissão de certificado de calibração rastreável ao IPQ.`,
    ],

    'analisador de segurança': [
      `**Função principal**\nAnalisador de segurança elétrica para dispositivos médicos. Verifica a conformidade elétrica segundo normas IEC internacionais.\n\n**Princípio de funcionamento**\nMede correntes de fuga, resistência de terra e rigidez dielétrica. Compara automaticamente com limites normativos.\n\n**Aplicações clínicas**\nTeste de aceitação de novos equipamentos, manutenção preventiva periódica e verificação após reparação.\n\n**Parâmetros medidos**\nCorrente de fuga para terra, corrente de fuga de chassis, corrente de fuga de doente, resistência de terra de proteção.\n\n**Normas relevantes**\nIEC 60601-1, IEC 62353, ABNT NBR IEC 60601-1.\n\n**Cuidados de calibração**\nCalibração semestral ou anual conforme política hospitalar. Essencial para segurança de doentes e profissionais.`,

      `**Função principal**\nInstrumento de referência para avaliação da segurança elétrica de equipamentos eletromédicos em ambiente hospitalar.\n\n**Princípio de funcionamento**\nAplica tensões de teste controladas e mede correntes de fuga com resolução de microamperes. Verifica integridade do condutor de terra e isolamento elétrico.\n\n**Aplicações clínicas**\nObrigatório em programas de manutenção preventiva. Utilizado em todas as áreas do hospital onde existam equipamentos médicos ligados à rede elétrica.\n\n**Grandezas medidas**\nCorrente de fuga de terra, chassis e doente (modo normal e de falha). Resistência de terra de proteção. Rigidez dielétrica.\n\n**Base normativa**\nIEC 60601-1 (3ª edição), IEC 62353 (testes após reparação), EN 60601-1.\n\n**Frequência de calibração**\nCalibração anual obrigatória. Verificação intermédia semestral recomendada para uso intensivo.`,

      `**Descrição**\nO analisador de segurança elétrica é o equipamento mais crítico de uma unidade de eletromedicina. Garante que todos os dispositivos médicos ligados a doentes respeitam os limites de segurança elétrica definidos internacionalmente.\n\n**Como funciona**\nSimula condições de falha elétrica (falha do neutro, falha da terra) e mede as correntes que poderiam fluir através do doente. Qualquer valor acima dos limites normativos implica rejeição do equipamento.\n\n**Onde é usado**\nEm todos os departamentos hospitalares, com especial atenção a UCI, bloco operatório e salas de hemodinâmica onde os doentes têm menor resistência elétrica.\n\n**O que mede**\nCorrente de fuga de terra (<500µA), corrente de chassis (<100µA), corrente de doente (<10µA em modo CF).\n\n**Normas**\nIEC 60601-1, IEC 62353, HD 60364.\n\n**Calibração**\nSemestral ou anual dependendo da frequência de uso. Certificado rastreável ao BIPM.`,
    ],

    'multímetro': [
      `**Função principal**\nInstrumento de medição elétrica multifunções de alta precisão para diagnóstico e manutenção de equipamentos médicos.\n\n**Princípio de funcionamento**\nUtiliza conversores analógico-digitais de alta resolução para medir grandezas elétricas com auto-seleção de fundo de escala.\n\n**Aplicações clínicas**\nDiagnóstico de falhas, verificação de alimentações e medição de resistências de terra em equipamentos médicos.\n\n**Parâmetros medidos**\nTensão DC/AC, corrente DC/AC, resistência, continuidade, díodos e capacitância.\n\n**Normas relevantes**\nIEC 61010-1, CAT III/IV.\n\n**Cuidados de calibração**\nCalibração anual obrigatória para garantir rastreabilidade metrológica.`,

      `**Função principal**\nMultímetro digital de precisão para uso em ambiente de engenharia biomédica e eletromedicina.\n\n**Princípio de funcionamento**\nConversor A/D de dupla rampa com elevada resolução. Medição verdadeira de valor eficaz (TRMS) para sinais não sinusoidais frequentes em equipamentos médicos.\n\n**Aplicações em biomédica**\nVerificação de fontes de alimentação de equipamentos médicos, medição de resistências em circuitos de segurança, diagnóstico de avarias e controlo de qualidade após reparação.\n\n**Gamas de medição**\nTensão DC: 0.1mV a 1000V. Tensão AC TRMS: 0.1mV a 750V. Corrente: 0.1µA a 10A. Resistência: 0.01Ω a 50MΩ.\n\n**Categoria de segurança**\nCAT III 1000V / CAT IV 600V conforme IEC 61010-1.\n\n**Rastreabilidade metrológica**\nCalibração anual com rastreabilidade ao IPQ. Incerteza de medição declarada no certificado de calibração.`,
    ],

    'osciloscópio': [
      `**Função principal**\nOsciloscópio digital para visualização e análise de sinais elétricos em equipamentos médicos.\n\n**Princípio de funcionamento**\nAmostragem digital de sinais analógicos com conversão A/D de alta velocidade. Visualização em tempo real e análise de formas de onda.\n\n**Aplicações clínicas**\nAnálise de sinais ECG, verificação de desfibrilhadores e diagnóstico de falhas em equipamentos médicos.\n\n**Parâmetros medidos**\nTensão, frequência, tempo, fase e forma de onda.\n\n**Normas relevantes**\nIEC 61010-1, ANSI/IEEE 1057.\n\n**Cuidados de calibração**\nCalibração anual recomendada incluindo verificação de sondas.`,

      `**Função principal**\nInstrumento de visualização e análise de sinais elétricos variáveis no tempo. Indispensável para diagnóstico avançado em equipamentos eletromédicos.\n\n**Princípio de funcionamento**\nAquisição digital com taxas de amostragem elevadas. Processamento FFT para análise espetral. Modo de captura de transitórios para deteção de falhas intermitentes.\n\n**Aplicações em eletromedicina**\nCaracterização de formas de onda de desfibrilhadores, análise de sinais de unidades de eletrocirurgia, verificação de geradores de RF e diagnóstico de interferências eletromagnéticas.\n\n**Capacidades de medição**\nBanda passante até 200MHz. Taxa de amostragem até 1GSa/s. Memória de forma de onda profunda para análise offline.\n\n**Normas aplicáveis**\nIEC 61010-1 (segurança), ANSI/IEEE 1057 (características de desempenho).\n\n**Manutenção**\nCalibração anual de todos os canais e verificação de sondas incluída.`,
    ],
  }

  const basePadrao = [
    `**Função principal**\nEquipamento de teste e medição especializado utilizado pela Unidade de Eletromedicina da ATM para verificação, calibração e manutenção de dispositivos médicos hospitalares.\n\n**Aplicações clínicas**\nIntegrado no programa de manutenção preventiva hospitalar. Utilizado para garantir o correto funcionamento e segurança dos equipamentos médicos em uso clínico.\n\n**Importância metrológica**\nA calibração periódica deste equipamento garante a rastreabilidade das medições às normas nacionais e internacionais, sendo fundamental para a segurança do doente e conformidade regulatória.\n\n**Normas aplicáveis**\nIEC 60601-1, normas específicas da categoria do equipamento testado.\n\n**Periodicidade de calibração**\nCalibração anual obrigatória por entidade acreditada pelo IPAC, com emissão de certificado de calibração.`,

    `**Descrição técnica**\nInstrumento de medição de uso profissional integrado no parque de equipamentos da Unidade de Eletromedicina. Essencial para a execução de programas de manutenção preventiva e verificação de conformidade de dispositivos médicos.\n\n**Aplicação**\nUtilizado por técnicos de eletromedicina no âmbito de procedimentos de manutenção preventiva, corretiva e de aceitação de equipamentos médicos.\n\n**Rastreabilidade**\nTodas as medições realizadas com este equipamento têm rastreabilidade metrológica garantida através de calibração periódica por laboratório acreditado.\n\n**Documentação**\nMantém-se arquivo de certificados de calibração conforme requisitos da norma ISO 15189 e política de gestão da qualidade hospitalar.\n\n**Frequência de calibração**\nAnual, podendo ser semestral em função da criticidade das medições realizadas.`,

    `**Equipamento de eletromedicina**\nIntegrado no inventário da Unidade de Eletromedicina da ATM. Utilizado em procedimentos técnicos de verificação e manutenção de dispositivos médicos.\n\n**Função no contexto hospitalar**\nPermite aos técnicos de eletromedicina verificar o correto funcionamento de equipamentos médicos, assegurando a sua conformidade com requisitos técnicos e normativos antes do uso clínico.\n\n**Gestão metrológica**\nSujeito a plano de calibração periódica com rastreabilidade ao Sistema Português da Qualidade. Certificado de calibração arquivado e disponível para auditorias.\n\n**Referências normativas**\nIEC 60601-1, normas de produto aplicáveis, requisitos de acreditação hospitalar.\n\n**Intervalo de calibração**\nDefinido em conformidade com a política de manutenção da ATM e recomendações do fabricante.`,
  ]

  // Encontra correspondência
  let candidatos: string[] = []
  let melhorScore = 0

  for (const [chave, textos] of Object.entries(base)) {
    const palavras = chave.split(' ')
    const score = palavras.filter(p => nome.includes(p)).length
    if (score > melhorScore) {
      melhorScore = score
      candidatos = textos
    }
  }

  if (candidatos.length === 0) candidatos = basePadrao

  // Escolhe aleatoriamente
  const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)]
  res.json({ descricao: escolhido })
})
inicializarDB().then(() => {
  iniciarCron()
  app.listen(PORT, () => console.log(`✅ Servidor ATM a correr em http://localhost:${PORT}`))
}).catch(err => {
  console.error('❌ Erro ao inicializar base de dados:', err)
  process.exit(1)
})