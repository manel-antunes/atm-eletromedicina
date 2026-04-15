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


// Iniciar
const PORT = process.env.PORT ?? 3001
// Rota para gerar descrição com IA
app.post('/api/descricao-ia', async (req, res) => {
  const { descricao, marca, modelo } = req.body
  const nome = `${descricao} ${marca} ${modelo}`.toLowerCase()

  const base: Record<string, string> = {
    'multiparametrico': `**Função principal**\nEquipamento de monitorização multiparamétrica utilizado para avaliar e simular sinais vitais de doentes. Essencial para verificar o correto funcionamento de monitores de sinais vitais.\n\n**Princípio de funcionamento**\nGera sinais elétricos e fisiológicos simulados (ECG, SpO2, NIBP, temperatura, respiração) com elevada precisão, permitindo testar monitores de paciente sem necessidade de doente real.\n\n**Aplicações clínicas**\nVerificação de monitores em UCI, bloco operatório, urgência e enfermarias. Usado durante manutenção preventiva e corretiva.\n\n**Parâmetros medidos**\nECG (12 derivações), frequência cardíaca, SpO2, NIBP, temperatura, frequência respiratória.\n\n**Normas relevantes**\nIEC 60601-1, IEC 60601-2-27, IEC 62133.\n\n**Cuidados de calibração**\nCalibração anual obrigatória para garantir rastreabilidade metrológica. Fundamental para acreditação hospitalar.`,

    'analisador de segurança': `**Função principal**\nAnalisador de segurança elétrica para equipamentos médicos. Verifica a conformidade elétrica de dispositivos médicos segundo normas internacionais.\n\n**Princípio de funcionamento**\nMede correntes de fuga, resistência de terra, rigidez dielétrica e outras grandezas elétricas de segurança. Compara com limites definidos nas normas IEC.\n\n**Aplicações clínicas**\nTeste de aceitação de novos equipamentos, manutenção preventiva periódica, verificação após reparação e inspeções de segurança obrigatórias.\n\n**Parâmetros medidos**\nCorrente de fuga para terra, corrente de fuga de chassis, corrente de fuga de doente, resistência de terra de proteção.\n\n**Normas relevantes**\nIEC 60601-1, IEC 62353, ABNT NBR IEC 60601-1.\n\n**Cuidados de calibração**\nCalibração semestral ou anual conforme política hospitalar. Essencial para garantir segurança dos doentes e profissionais.`,

    'osciloscópio': `**Função principal**\nInstrumento de medição que permite visualizar graficamente sinais elétricos variáveis no tempo. Indispensável para análise de formas de onda em equipamentos médicos.\n\n**Princípio de funcionamento**\nConverte sinais elétricos analógicos em representação digital, exibindo amplitude e frequência em função do tempo. Permite análise de transitórios e distorções.\n\n**Aplicações clínicas**\nAnálise de sinais de ECG, verificação de desfibrilhadores, teste de unidades de eletrocirurgia e diagnóstico de falhas em equipamentos médicos.\n\n**Parâmetros medidos**\nTensão (mV a kV), frequência (Hz a GHz), tempo, fase, forma de onda.\n\n**Normas relevantes**\nIEC 61010-1, ANSI/IEEE 1057.\n\n**Cuidados de calibração**\nCalibração anual recomendada. Verificação de sondas incluída no processo.`,

    'multímetro': `**Função principal**\nInstrumento de medição elétrica multifunções. Mede tensão, corrente e resistência elétrica com elevada precisão.\n\n**Princípio de funcionamento**\nUtiliza conversores analógico-digitais de alta resolução para medir grandezas elétricas. Modo automático seleciona o fundo de escala adequado.\n\n**Aplicações clínicas**\nDiagnóstico de falhas em equipamentos médicos, verificação de alimentações elétricas, medição de resistências de terra e continuidade de circuitos.\n\n**Parâmetros medidos**\nTensão DC/AC (mV a kV), corrente DC/AC (µA a A), resistência (Ω a MΩ), continuidade, díodos, capacitância.\n\n**Normas relevantes**\nIEC 61010-1, CAT III/IV.\n\n**Cuidados de calibração**\nCalibração anual obrigatória para garantir rastreabilidade metrológica IPAC.`,

    'desfibrilhador': `**Função principal**\nAnalisador de desfibrilhadores para verificação do desempenho e segurança de desfibrilhadores e cardioversores.\n\n**Princípio de funcionamento**\nMede a energia entregue, forma de onda, tempo de descarga e outros parâmetros críticos de desfibrilhadores externos e implantáveis.\n\n**Aplicações clínicas**\nManutenção preventiva de desfibrilhadores em urgência, UCI e bloco operatório. Verificação após reparação.\n\n**Parâmetros medidos**\nEnergia entregue (J), forma de onda, tempo de descarga, corrente de pico, tensão de pico.\n\n**Normas relevantes**\nIEC 60601-2-4, AAMI DF80.\n\n**Cuidados de calibração**\nCalibração semestral recomendada dado o carácter crítico do equipamento.`,

    'ventilador': `**Função principal**\nAnalisador de fluxo e pressão para ventiladores mecânicos. Verifica o desempenho de ventiladores pulmonares.\n\n**Princípio de funcionamento**\nMede caudal de gás, pressão e volume com sensores de alta precisão. Analisa curvas de ventilação e compara com parâmetros programados.\n\n**Aplicações clínicas**\nManutenção preventiva de ventiladores em UCI, bloco operatório e transporte. Verificação após reparação e calibração.\n\n**Parâmetros medidos**\nCaudal (L/min), volume corrente (mL), frequência respiratória, PEEP, pressão de pico, FiO2.\n\n**Normas relevantes**\nIEC 60601-2-12, ISO 80601-2-12.\n\n**Cuidados de calibração**\nCalibração anual obrigatória. Verificação semestral recomendada.`,

    'infus': `**Função principal**\nAnalisador de bombas de infusão para verificação do desempenho de bombas seringa e volumétricas.\n\n**Princípio de funcionamento**\nMede com precisão o caudal de infusão real, detetando desvios face ao caudal programado. Regista oclusões e alarmes.\n\n**Aplicações clínicas**\nManutenção preventiva de bombas de infusão em UCI, oncologia, pediatria e bloco operatório.\n\n**Parâmetros medidos**\nCaudal (mL/h), volume infundido, pressão de oclusão, tempo de resposta a alarmes.\n\n**Normas relevantes**\nIEC 60601-2-24, ISO 28620.\n\n**Cuidados de calibração**\nCalibração anual obrigatória para garantir precisão na administração de medicação.`,

    'incubadora': `**Função principal**\nAnalisador de incubadoras neonatais para verificação das condições ambientais internas.\n\n**Princípio de funcionamento**\nMede temperatura, humidade e velocidade do ar no interior de incubadoras. Verifica uniformidade térmica e tempos de recuperação.\n\n**Aplicações clínicas**\nManutenção preventiva de incubadoras em neonatologia e UCIN. Verificação após reparação.\n\n**Parâmetros medidos**\nTemperatura (°C), humidade relativa (%), velocidade do ar (m/s), ruído (dB), iluminância (lux).\n\n**Normas relevantes**\nIEC 60601-2-19, EN ISO 10993.\n\n**Cuidados de calibração**\nCalibração anual obrigatória dado o uso em neonatos de alto risco.`,

    'eletrobisturi': `**Função principal**\nAnalisador de unidades de eletrocirurgia (bisturi elétrico) para verificação de segurança e desempenho.\n\n**Princípio de funcionamento**\nMede potência de saída, correntes de fuga, impedância de carga e outros parâmetros de segurança de unidades eletrocirúrgicas mono e bipolares.\n\n**Aplicações clínicas**\nManutenção preventiva de bisturis elétricos no bloco operatório. Verificação após reparação e antes de uso clínico.\n\n**Parâmetros medidos**\nPotência (W), corrente de alta frequência (A), corrente de fuga, impedância de carga, forma de onda.\n\n**Normas relevantes**\nIEC 60601-2-2, AAMI HF18.\n\n**Cuidados de calibração**\nCalibração semestral obrigatória. Equipamento crítico para segurança cirúrgica.`,

    'radiometro': `**Função principal**\nRadiómetro para medição de intensidade de radiação eletromagnética em equipamentos de fototerapia e desinfecção UV.\n\n**Princípio de funcionamento**\nUtiliza fotodetetores calibrados para medir irradiância (W/m²) em diferentes comprimentos de onda. Permite verificar eficácia de lâmpadas UV e fototerapia.\n\n**Aplicações clínicas**\nVerificação de equipamentos de fototerapia neonatal, desinfecção UV e lasers terapêuticos.\n\n**Parâmetros medidos**\nIrradiância (W/m², µW/cm²), dose cumulativa, comprimento de onda.\n\n**Normas relevantes**\nIEC 60601-2-50, IEC 62471.\n\n**Cuidados de calibração**\nCalibração anual obrigatória. Sensores sujeitos a degradação com o uso.`,

    'luximetro': `**Função principal**\nLuxímetro para medição de intensidade luminosa em ambientes hospitalares e blocos operatórios.\n\n**Princípio de funcionamento**\nUtiliza fotodíodos com resposta espetral próxima da visão humana (curva V-lambda) para medir iluminância em lux.\n\n**Aplicações clínicas**\nVerificação de iluminação cirúrgica, iluminação de emergência e conformidade com requisitos de iluminação hospitalar.\n\n**Parâmetros medidos**\nIluminância (lux), luminância (cd/m²).\n\n**Normas relevantes**\nEN 12464-1, ISO 8995-1.\n\n**Cuidados de calibração**\nCalibração anual recomendada.`,

    'tacometro': `**Função principal**\nTacómetro para medição de velocidade de rotação em equipamentos médicos com componentes rotativos.\n\n**Princípio de funcionamento**\nMede rotações por minuto (RPM) por método ótico ou de contacto. Permite verificar velocidade de centrifugadoras, motores e outros equipamentos rotativos.\n\n**Aplicações clínicas**\nVerificação de centrifugadoras de laboratório, misturadores e outros equipamentos com motor.\n\n**Parâmetros medidos**\nVelocidade de rotação (RPM), velocidade linear (m/min).\n\n**Normas relevantes**\nISO 10002, IEC 61010-1.\n\n**Cuidados de calibração**\nCalibração anual recomendada.`,

    'fonte de alimentação': `**Função principal**\nFonte de alimentação programável para testes de equipamentos médicos sob diferentes condições de alimentação elétrica.\n\n**Princípio de funcionamento**\nGera tensões DC e AC estabilizadas e programáveis. Permite simular variações de tensão, frequência e formas de onda para teste de imunidade de equipamentos médicos.\n\n**Aplicações clínicas**\nTestes de compatibilidade eletromagnética, verificação de estabilidade de equipamentos médicos sob variações de alimentação.\n\n**Parâmetros medidos**\nTensão (V), corrente (A), potência (W), frequência (Hz).\n\n**Normas relevantes**\nIEC 61010-1, IEC 60601-1.\n\n**Cuidados de calibração**\nCalibração anual obrigatória para garantir rastreabilidade das medições.`,

    'gerador de funções': `**Função principal**\nGerador de sinais elétricos de diferentes formas de onda para teste e calibração de equipamentos médicos.\n\n**Princípio de funcionamento**\nGera sinais sinusoidais, quadrados, triangulares e arbitrários com frequência e amplitude programáveis. Usa síntese digital direta (DDS) para alta estabilidade.\n\n**Aplicações clínicas**\nCalibração de amplificadores biomédicos, teste de filtros, verificação de equipamentos de diagnóstico e terapêutica.\n\n**Parâmetros medidos**\nFrequência (Hz a MHz), amplitude (mV a V), offset DC, fase, forma de onda.\n\n**Normas relevantes**\nIEC 61010-1, ANSI/IEEE 1057.\n\n**Cuidados de calibração**\nCalibração anual recomendada.`,

    'fotometro': `**Função principal**\nFotómetro para medição de propriedades óticas de soluções e materiais em laboratório clínico.\n\n**Princípio de funcionamento**\nMede a absorvância de soluções a comprimentos de onda específicos usando a lei de Beer-Lambert. Permite quantificação de analitos em amostras biológicas.\n\n**Aplicações clínicas**\nAnálises bioquímicas em laboratório clínico, controlo de qualidade de reagentes e calibração de analisadores automáticos.\n\n**Parâmetros medidos**\nAbsorvância, transmitância (%), concentração.\n\n**Normas relevantes**\nISO 15189, ISO 8655.\n\n**Cuidados de calibração**\nCalibração anual obrigatória para laboratórios acreditados.`,
  }

  // Encontra a melhor correspondência
  let melhorDescricao = ''
  let melhorScore = 0

  for (const [chave, texto] of Object.entries(base)) {
    const palavras = chave.split(' ')
    const score = palavras.filter(p => nome.includes(p)).length
    if (score > melhorScore) {
      melhorScore = score
      melhorDescricao = texto
    }
  }

  if (!melhorDescricao) {
    melhorDescricao = `**Função principal**\nEquipamento de teste e medição utilizado pela Unidade de Eletromedicina da ATM para verificação e calibração de dispositivos médicos.\n\n**Aplicações clínicas**\nUtilizado em procedimentos de manutenção preventiva e corretiva de equipamentos médicos hospitalares.\n\n**Cuidados de calibração**\nCalibração periódica obrigatória conforme programa de manutenção da Unidade de Eletromedicina. Garantia de rastreabilidade metrológica às normas nacionais e internacionais.`
  }

  res.json({ descricao: melhorDescricao })
})
inicializarDB().then(() => {
  iniciarCron()
  app.listen(PORT, () => console.log(`✅ Servidor ATM a correr em http://localhost:${PORT}`))
}).catch(err => {
  console.error('❌ Erro ao inicializar base de dados:', err)
  process.exit(1)
})