import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { FileText, Download, Table, Mail, CheckCircle, Send, Plus, X, Clock, Settings } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'
import { enviarAlertasEmail, testarEmail, carregarConfig, guardarConfig, carregarHistorico, atualizarCache } from '../services/emailService'

interface Props {
  equipamentos: Equipamento[]
}

interface ConfigEmail {
  destinatarios: string[]
  agendamento: { ativo: boolean; diaSemana: string; hora: string }
  filtros: { incluirVencidas: boolean; incluirUrgentes: boolean; incluirEmBreve: boolean }
}

interface RegistoEmail {
  id: string
  data: string
  hora: string
  destinatarios: string[]
  totalAlertas: number
  vencidas: number
  urgentes: number
  emBreve: number
  sucesso: boolean
  erro?: string
}

function parseData(dataStr: string): Date | null {
  if (!dataStr || dataStr === 'undefined') return null
  const numerico = Number(dataStr)
  if (!isNaN(numerico) && numerico > 40000) {
    const data = new Date((numerico - 25569) * 86400 * 1000)
    if (isValid(data)) return data
  }
  const formatos = ['M/d/yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']
  for (const fmt of formatos) {
    const tentativa = parse(dataStr, fmt, new Date())
    if (isValid(tentativa)) return tentativa
  }
  return null
}

function getEstado(eq: Equipamento): string {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'Sem data'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return 'Vencida'
  if (diff <= 30) return 'Urgente'
  if (diff <= 60) return 'Em breve'
  return 'Em dia'
}

function getUltimaCalib(proxima: Date, periodicidade: string): Date {
  const ultima = new Date(proxima)
  if (periodicidade === 'Bienal') ultima.setFullYear(ultima.getFullYear() - 2)
  else ultima.setFullYear(ultima.getFullYear() - 1)
  return ultima
}

const diasSemana = [
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
]

export default function Relatorios({ equipamentos }: Props) {
  const [gerado, setGerado] = useState('')
  const [emailEstado, setEmailEstado] = useState<'idle' | 'enviando' | 'sucesso' | 'erro'>('idle')
  const [testeEstado, setTesteEstado] = useState<'idle' | 'enviando' | 'sucesso' | 'erro'>('idle')
  const [mensagemEmail, setMensagemEmail] = useState('')
  const [config, setConfig] = useState<ConfigEmail>({
    destinatarios: [],
    agendamento: { ativo: false, diaSemana: '1', hora: '08:00' },
    filtros: { incluirVencidas: true, incluirUrgentes: true, incluirEmBreve: true },
  })
  const [historico, setHistorico] = useState<RegistoEmail[]>([])
  const [novoEmail, setNovoEmail] = useState('')
  const [configGuardada, setConfigGuardada] = useState(false)
  const [tabAtiva, setTabAtiva] = useState<'enviar' | 'configurar' | 'historico'>('enviar')

  useEffect(() => {
    carregarConfig().then(setConfig).catch(() => {})
    carregarHistorico().then(setHistorico).catch(() => {})
    atualizarCache(equipamentos).catch(() => {})
  }, [])

  const stats = {
    total: equipamentos.length,
    vencidas: equipamentos.filter(eq => getEstado(eq) === 'Vencida').length,
    urgentes: equipamentos.filter(eq => getEstado(eq) === 'Urgente').length,
    emBreve: equipamentos.filter(eq => getEstado(eq) === 'Em breve').length,
    emDia: equipamentos.filter(eq => getEstado(eq) === 'Em dia').length,
  }

  function exportarInventario() {
    const linhas = equipamentos.map(eq => ({
      'Nº SAP': eq.numeroSAP, 'Descrição': eq.descricao, 'Marca': eq.marca, 'Modelo': eq.modelo,
      'Nº Série': eq.numeroSerie, 'Periodicidade': eq.periodicidade ?? 'Anual',
      'Última Calibração': (() => { const p = parseData(eq.dataCalibracao); return p ? getUltimaCalib(p, eq.periodicidade).toLocaleDateString('pt-PT') : '—' })(),
      'Próxima Calibração': (() => { const p = parseData(eq.dataCalibracao); return p ? p.toLocaleDateString('pt-PT') : '—' })(),
      'Estado': getEstado(eq), 'Responsável': eq.responsavel || '—', 'Localização': eq.localizacao || '—',
    }))
    const ws = XLSX.utils.json_to_sheet(linhas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventário')
    ws['!cols'] = Array(11).fill({ wch: 22 })
    XLSX.writeFile(wb, `ATM_Inventario_${new Date().toLocaleDateString('pt-PT').replace(/\//g, '-')}.xlsx`)
    setGerado('inventario'); setTimeout(() => setGerado(''), 3000)
  }

  function exportarCalibracoes() {
    const toLinhas = (lista: Equipamento[]) => lista.map(eq => ({
      'Nº SAP': eq.numeroSAP, 'Descrição': eq.descricao, 'Marca': eq.marca, 'Modelo': eq.modelo,
      'Periodicidade': eq.periodicidade ?? 'Anual',
      'Última Calibração': (() => { const p = parseData(eq.dataCalibracao); return p ? getUltimaCalib(p, eq.periodicidade).toLocaleDateString('pt-PT') : '—' })(),
      'Próxima Calibração': (() => { const p = parseData(eq.dataCalibracao); return p ? p.toLocaleDateString('pt-PT') : '—' })(),
      'Estado': getEstado(eq), 'Responsável': eq.responsavel || '—', 'Localização': eq.localizacao || '—',
    }))
    const wb = XLSX.utils.book_new()
    ;[
      { nome: 'Vencidas', lista: equipamentos.filter(eq => getEstado(eq) === 'Vencida') },
      { nome: 'Urgentes', lista: equipamentos.filter(eq => getEstado(eq) === 'Urgente') },
      { nome: 'Em breve', lista: equipamentos.filter(eq => getEstado(eq) === 'Em breve') },
      { nome: 'Em dia',   lista: equipamentos.filter(eq => getEstado(eq) === 'Em dia') },
      { nome: 'Todos',    lista: equipamentos },
    ].forEach(({ nome, lista }) => {
      if (!lista.length) return
      const ws = XLSX.utils.json_to_sheet(toLinhas(lista))
      ws['!cols'] = Array(10).fill({ wch: 22 })
      XLSX.utils.book_append_sheet(wb, ws, nome)
    })
    XLSX.writeFile(wb, `ATM_Calibracoes_${new Date().toLocaleDateString('pt-PT').replace(/\//g, '-')}.xlsx`)
    setGerado('calibracoes'); setTimeout(() => setGerado(''), 3000)
  }

  async function handleEnviarAlertas() {
    setEmailEstado('enviando'); setMensagemEmail('')
    try {
      const resultado = await enviarAlertasEmail(equipamentos, config.destinatarios, config.filtros)
      setEmailEstado('sucesso')
      setMensagemEmail(`Email enviado com ${resultado.enviados} alertas.`)
      carregarHistorico().then(setHistorico)
      setTimeout(() => setEmailEstado('idle'), 5000)
    } catch {
      setEmailEstado('erro')
      setMensagemEmail('Erro. Verifica se o servidor está a correr.')
      setTimeout(() => setEmailEstado('idle'), 5000)
    }
  }

  async function handleTestarEmail() {
    setTesteEstado('enviando')
    try { await testarEmail(); setTesteEstado('sucesso'); setTimeout(() => setTesteEstado('idle'), 4000) }
    catch { setTesteEstado('erro'); setTimeout(() => setTesteEstado('idle'), 4000) }
  }

  async function handleGuardarConfig() {
    await guardarConfig(config)
    setConfigGuardada(true)
    setTimeout(() => setConfigGuardada(false), 3000)
  }

  function adicionarEmail() {
    if (!novoEmail || !novoEmail.includes('@')) return
    if (config.destinatarios.includes(novoEmail)) return
    setConfig(prev => ({ ...prev, destinatarios: [...prev.destinatarios, novoEmail] }))
    setNovoEmail('')
  }

  function removerEmail(email: string) {
    setConfig(prev => ({ ...prev, destinatarios: prev.destinatarios.filter(e => e !== email) }))
  }

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',    valor: stats.total,    cor: 'text-sky-500',    borda: 'border-t-sky-400' },
          { label: 'Em dia',   valor: stats.emDia,    cor: 'text-green-600',  borda: 'border-t-green-400' },
          { label: 'Em breve', valor: stats.emBreve,  cor: 'text-yellow-600', borda: 'border-t-yellow-400' },
          { label: 'Urgentes', valor: stats.urgentes, cor: 'text-orange-500', borda: 'border-t-orange-400' },
          { label: 'Vencidas', valor: stats.vencidas, cor: 'text-red-600',    borda: 'border-t-red-400' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border border-gray-200 p-4 border-t-4 ${s.borda}`}>
            <p className={`text-2xl font-bold font-mono ${s.cor}`}>{s.valor}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs de email */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Notificações por email</h2>
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'enviar',     label: 'Enviar',       icon: <Send size={12} /> },
              { id: 'configurar', label: 'Configurar',   icon: <Settings size={12} /> },
              { id: 'historico',  label: 'Histórico',    icon: <Clock size={12} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabAtiva(tab.id as typeof tabAtiva)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  color: tabAtiva === tab.id ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontSize: 12, fontWeight: 600,
                  borderBottom: `2px solid ${tabAtiva === tab.id ? '#C0001A' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* Tab: Enviar */}
            {tabAtiva === 'enviar' && (
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(192,0,26,0.2)', borderRadius: 10, padding: 8 }}>
                      <Mail size={18} color="#f87171" />
                    </div>
                    <div>
                      <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Relatório de alertas</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                        {config.destinatarios.length} destinatário(s) configurado(s)
                      </p>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {[
                      { key: 'incluirVencidas', label: `Vencidas (${stats.vencidas})`, cor: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
                      { key: 'incluirUrgentes', label: `Urgentes (${stats.urgentes})`, cor: '#fb923c', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
                      { key: 'incluirEmBreve',  label: `Em breve (${stats.emBreve})`,  cor: '#facc15', bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.3)' },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setConfig(prev => ({ ...prev, filtros: { ...prev.filtros, [f.key]: !prev.filtros[f.key as keyof typeof prev.filtros] } }))}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: config.filtros[f.key as keyof typeof config.filtros] ? f.bg : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${config.filtros[f.key as keyof typeof config.filtros] ? f.border : 'rgba(255,255,255,0.1)'}`,
                          color: config.filtros[f.key as keyof typeof config.filtros] ? f.cor : 'rgba(255,255,255,0.3)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {config.filtros[f.key as keyof typeof config.filtros] ? '✓' : '○'} {f.label}
                      </button>
                    ))}
                  </div>

                  {mensagemEmail && (
                    <p style={{ color: emailEstado === 'sucesso' ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                      {mensagemEmail}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={handleEnviarAlertas}
                    disabled={emailEstado === 'enviando' || config.destinatarios.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: emailEstado === 'sucesso' ? '#16a34a' : emailEstado === 'erro' ? '#dc2626' : '#C0001A',
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '10px 20px', cursor: emailEstado === 'enviando' ? 'wait' : 'pointer',
                      fontSize: 12, fontWeight: 700, opacity: config.destinatarios.length === 0 ? 0.5 : 1,
                    }}
                  >
                    {emailEstado === 'enviando' ? <><Send size={14} />A enviar...</> : emailEstado === 'sucesso' ? <><CheckCircle size={14} />Enviado!</> : <><Send size={14} />Enviar alertas</>}
                  </button>
                  <button
                    onClick={handleTestarEmail}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: testeEstado === 'sucesso' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                      color: testeEstado === 'sucesso' ? '#4ade80' : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${testeEstado === 'sucesso' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {testeEstado === 'sucesso' ? <><CheckCircle size={12} />Enviado!</> : <><Mail size={12} />Testar email</>}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Configurar */}
            {tabAtiva === 'configurar' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* Destinatários */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    Destinatários
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      type="email"
                      value={novoEmail}
                      onChange={e => setNovoEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && adicionarEmail()}
                      placeholder="email@hospital.pt"
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12, outline: 'none',
                      }}
                    />
                    <button
                      onClick={adicionarEmail}
                      style={{ background: '#C0001A', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {config.destinatarios.map(email => (
                      <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px' }}>
                        <span style={{ color: '#fff', fontSize: 12 }}>{email}</span>
                        <button onClick={() => removerEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    {config.destinatarios.length === 0 && (
                      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>Sem destinatários</p>
                    )}
                  </div>
                </div>

                {/* Agendamento */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    Agendamento automático
                  </p>
                  <div
                    onClick={() => setConfig(prev => ({ ...prev, agendamento: { ...prev.agendamento, ativo: !prev.agendamento.ativo } }))}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px',
                      cursor: 'pointer', marginBottom: 10,
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>Envio automático</span>
                    <div style={{
                      width: 36, height: 20, borderRadius: 99,
                      background: config.agendamento.ativo ? '#C0001A' : 'rgba(255,255,255,0.15)',
                      position: 'relative', transition: 'background 0.2s',
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2,
                        left: config.agendamento.ativo ? 18 : 2,
                        transition: 'left 0.2s',
                      }} />
                    </div>
                  </div>
                  {config.agendamento.ativo && (
                    <>
                      <select
                        value={config.agendamento.diaSemana}
                        onChange={e => setConfig(prev => ({ ...prev, agendamento: { ...prev.agendamento, diaSemana: e.target.value } }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12, marginBottom: 8, outline: 'none' }}
                      >
                        {diasSemana.map(d => <option key={d.value} value={d.value} style={{ background: '#1e293b' }}>{d.label}</option>)}
                      </select>
                      <input
                        type="time"
                        value={config.agendamento.hora}
                        onChange={e => setConfig(prev => ({ ...prev, agendamento: { ...prev.agendamento, hora: e.target.value } }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12, outline: 'none' }}
                      />
                    </>
                  )}
                </div>

                <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleGuardarConfig}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: configGuardada ? '#16a34a' : '#C0001A',
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '10px 20px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    }}
                  >
                    {configGuardada ? <><CheckCircle size={14} />Guardado!</> : 'Guardar configuração'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Histórico */}
            {tabAtiva === 'historico' && (
              <div>
                {historico.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                    Ainda não foram enviados emails
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {historico.map(r => (
                      <div key={r.id} style={{
                        background: r.sucesso ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                        border: `1px solid ${r.sucesso ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                        borderRadius: 10, padding: '12px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.sucesso ? '#4ade80' : '#f87171', flexShrink: 0 }} />
                          <div>
                            <p style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{r.data} às {r.hora}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                              {r.destinatarios.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {r.sucesso ? (
                            <>
                              <span style={{ color: '#f87171', fontSize: 11 }}>{r.vencidas} vencidas</span>
                              <span style={{ color: '#fb923c', fontSize: 11 }}>{r.urgentes} urgentes</span>
                              <span style={{ color: '#facc15', fontSize: 11 }}>{r.emBreve} em breve</span>
                            </>
                          ) : (
                            <span style={{ color: '#f87171', fontSize: 11 }}>Falhou</span>
                          )}
                          <span style={{
                            background: r.sucesso ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: r.sucesso ? '#4ade80' : '#f87171',
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          }}>
                            {r.sucesso ? 'Enviado' : 'Erro'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exportações Excel */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Exportar relatórios</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-2"><Table size={18} className="text-green-600" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Inventário Completo</p>
                <p className="text-xs text-gray-400 mt-0.5">Todos os {stats.total} equipamentos</p>
              </div>
            </div>
            <button onClick={exportarInventario} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${gerado === 'inventario' ? 'bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
              <Download size={13} />
              {gerado === 'inventario' ? 'Ficheiro gerado!' : 'Exportar Excel (.xlsx)'}
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-sky-50 rounded-lg p-2"><FileText size={18} className="text-sky-600" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Relatório de Calibrações</p>
                <p className="text-xs text-gray-400 mt-0.5">Separado por estado em folhas</p>
              </div>
            </div>
            <button onClick={exportarCalibracoes} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${gerado === 'calibracoes' ? 'bg-green-500 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}>
              <Download size={13} />
              {gerado === 'calibracoes' ? 'Ficheiro gerado!' : 'Exportar Excel (.xlsx)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}