import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, FileText, Package, Brain, ClipboardCheck, Upload, X, ArrowLeftRight } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays } from 'date-fns'
import { API_URL } from '../config'
import { parseData } from '../utils/dateUtils'
import { getEstado } from '../utils/equipamentoUtils'

interface Props {
  equipamento: Equipamento
  onVoltar: () => void
  onNavegar?: (pagina: string) => void
}

interface Cedencia {
  id: number
  equipamentoId: number
  destino: string
  responsavel: string
  dataSaida: string
  dataRetornoPrevista: string
  ativa: boolean
}

function getCedenciaAtiva(equipamentoId: number): Cedencia | null {
  try {
    const ceds: Cedencia[] = JSON.parse(localStorage.getItem('atm_cedencias') ?? '[]')
    return ceds.find(c => c.equipamentoId === equipamentoId && c.ativa) ?? null
  } catch { return null }
}

function getUltimaCalib(proxima: Date, periodicidade: string): Date {
  const ultima = new Date(proxima)
  if (periodicidade === 'Bienal') ultima.setFullYear(ultima.getFullYear() - 2)
  else ultima.setFullYear(ultima.getFullYear() - 1)
  return ultima
}

const estadoConfig = {
  vencido: { label: 'Vencida',  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700' },
  urgente: { label: 'Urgente',  bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  aviso:   { label: 'Em breve', bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  ok:      { label: 'Em dia',   bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700' },
}

export default function DetalheEquipamento({ equipamento: eq, onVoltar, onNavegar }: Props) {
  const [descricaoIA, setDescricaoIA] = useState<string | null>(null)
  const [gerandoIA, setGerandoIA] = useState(false)
  const cedencia = getCedenciaAtiva(eq.id)

  useEffect(() => {
    fetch(`${API_URL}/api/descricao/${eq.numeroSAP}`)
      .then(r => r.json())
      .then(d => { if (d.descricao) setDescricaoIA(d.descricao) })
      .catch(() => {})
  }, [eq.numeroSAP])

  async function handleGerarDescricao() {
    setGerandoIA(true)
    try {
      const res = await fetch(`${API_URL}/api/descricao-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: eq.descricao, marca: eq.marca, modelo: eq.modelo }),
      })
      const data = await res.json()
      setDescricaoIA(data.descricao)
      await fetch(`${API_URL}/api/descricao/${eq.numeroSAP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: data.descricao }),
      })
    } catch {
      setDescricaoIA('Erro ao gerar descrição. Tenta novamente.')
    } finally {
      setGerandoIA(false)
    }
  }

  const [modalCalib, setModalCalib] = useState(false)
  const [formCalib, setFormCalib] = useState({
    data: new Date().toISOString().split('T')[0],
    tecnico: '',
    entidade: '',
    observacoes: '',
    aprovadoPor: '',
  })
  const [ficheiroCalib, setFicheiroCalib] = useState<File | null>(null)
  const [assinado, setAssinado] = useState(false)
  const [erroCalib, setErroCalib] = useState('')
  const [sucessoCalib, setSucessoCalib] = useState(false)
  const inputCalibRef = useRef<HTMLInputElement>(null)

  async function handleSubmitCalib() {
    if (!formCalib.data) { setErroCalib('A data é obrigatória.'); return }
    if (!formCalib.tecnico) { setErroCalib('O técnico é obrigatório.'); return }
    if (!formCalib.entidade) { setErroCalib('A entidade é obrigatória.'); return }
    if (!ficheiroCalib) { setErroCalib('O relatório PDF é obrigatório.'); return }
    if (!assinado) { setErroCalib('É necessário confirmar a aprovação.'); return }

    const dataCalib = new Date(formCalib.data)
    const novaProxima = new Date(dataCalib)
    if (eq.periodicidade === 'Bienal') novaProxima.setFullYear(novaProxima.getFullYear() + 2)
    else novaProxima.setFullYear(novaProxima.getFullYear() + 1)
    const excelDate = Math.round((novaProxima.getTime() / 86400000) + 25569)

    try {
      await fetch(`${API_URL}/api/calibracoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipamentoSAP: eq.numeroSAP,
          dataCalibracao: formCalib.data,
          tecnico: formCalib.tecnico,
          entidade: formCalib.entidade,
          observacoes: formCalib.observacoes,
          relatorio: ficheiroCalib.name,
          aprovadoPor: formCalib.aprovadoPor,
          novaProximaCalib: String(excelDate),
        }),
      })
      setSucessoCalib(true)
      setTimeout(() => { setModalCalib(false); setSucessoCalib(false) }, 1500)
    } catch {
      setErroCalib('Erro ao registar calibração.')
    }
  }

  const estado = getEstado(eq)
  const cfg = estadoConfig[estado]
  const proxima = parseData(eq.dataCalibracao)
  const ultima = proxima ? getUltimaCalib(proxima, eq.periodicidade ?? 'Anual') : null
  const diff = proxima ? differenceInDays(proxima, new Date()) : null
  const historico = eq.historicoCalibracao ?? []

  function getDiasTexto(): string {
    if (diff === null) return 'Sem data'
    if (diff < 0) return `Venceu há ${Math.abs(diff)} dias`
    if (diff === 0) return 'Vence hoje!'
    return `Vence em ${diff} dias`
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 transition-all mt-0.5"
        >
          <ArrowLeft size={12} />
          Voltar
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-gray-800">{eq.descricao}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 ${cfg.badge}`}>
              {cfg.label}
            </span>
            {cedencia && (
              <button
                onClick={() => onNavegar?.('cedencias')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}
              >
                <ArrowLeftRight size={11} />
                Cedido a {cedencia.destino}
              </button>
            )}
            <button
              onClick={() => setModalCalib(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5"
              style={{ background: '#C0001A' }}
            >
              <ClipboardCheck size={12} />
              Registar calibração
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{eq.marca} {eq.modelo} · Nº SAP: {eq.numeroSAP}</p>
        </div>
      </div>

      {/* Banner cedência ativa */}
      {cedencia && (
        <div
          onClick={() => onNavegar?.('cedencias')}
          style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowLeftRight size={14} color="#f97316" />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', margin: 0 }}>
                Equipamento atualmente cedido a {cedencia.destino}
              </p>
              <p style={{ fontSize: 11, color: '#ea580c', margin: '2px 0 0', opacity: 0.8 }}>
                Saída: {new Date(cedencia.dataSaida).toLocaleDateString('pt-PT')} · Retorno previsto: {new Date(cedencia.dataRetornoPrevista).toLocaleDateString('pt-PT')} · Responsável: {cedencia.responsavel}
              </p>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9a3412', whiteSpace: 'nowrap' }}>Ver cedência →</span>
        </div>
      )}

      {/* Info principal */}
      <div className="grid grid-cols-3 gap-4">

        {/* Identificação */}
        <div className="bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={14} className="text-gray-400" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identificação</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Nº SAP',        valor: eq.numeroSAP },
              { label: 'Nº Série',      valor: eq.numeroSerie || '—' },
              { label: 'Marca',         valor: eq.marca },
              { label: 'Modelo',        valor: eq.modelo },
              { label: 'Periodicidade', valor: eq.periodicidade ?? 'Anual' },
            ].map(({ label, valor }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-semibold text-gray-700 text-right max-w-32">{valor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calibração */}
        <div className={`border shadow-sm p-5 ${cfg.bg} ${cfg.border}`}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={14} className={cfg.text} />
            <h2 className={`text-xs font-bold uppercase tracking-widest ${cfg.text}`}>Calibração</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Última calib.</span>
              <span className="text-xs font-semibold text-gray-700">{ultima ? ultima.toLocaleDateString('pt-PT') : '—'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Próxima calib.</span>
              <span className={`text-xs font-bold ${cfg.text}`}>{proxima ? proxima.toLocaleDateString('pt-PT') : '—'}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className={`text-sm font-bold ${cfg.text}`}>{getDiasTexto()}</p>
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-gray-400" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Localização</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-400">Local atual</span>
              <span className="text-xs font-semibold text-gray-700 text-right max-w-32">
                {cedencia ? cedencia.destino : (eq.localizacao || '—')}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-400">Responsável</span>
              <span className="text-xs font-semibold text-gray-700 text-right max-w-32">{eq.responsavel || '—'}</span>
            </div>
            {cedencia && (
              <div className="pt-2 border-t border-orange-100">
                <button
                  onClick={() => onNavegar?.('cedencias')}
                  style={{ fontSize: 11, fontWeight: 600, color: '#ea580c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Ver detalhes da cedência →
                </button>
              </div>
            )}
            {eq.obs && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 block mb-1">Observações</span>
                <span className="text-xs text-gray-600">{eq.obs}</span>
              </div>
            )}
            {eq.obs2 && (
              <div>
                <span className="text-xs text-gray-600">{eq.obs2}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de calibrações */}
      <div className="bg-white border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-gray-400" />
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Histórico de Calibrações</h2>
          <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5">{historico.length}</span>
        </div>
        {historico.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-300 font-medium">Sem calibrações registadas neste sistema</p>
            <p className="text-xs text-gray-300 mt-1">Os registos aparecem aqui após encerrar uma calibração</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historico.slice().reverse().map(registo => (
              <div key={registo.id} className="flex items-start gap-4 p-3 bg-gray-50">
                <div className="bg-green-100 p-2 flex-shrink-0">
                  <CheckCircle size={14} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-800">
                      {new Date(registo.data).toLocaleDateString('pt-PT')}
                    </p>
                    <span className="text-xs text-gray-400">{registo.entidade}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Técnico: {registo.tecnico}</p>
                  {registo.aprovadoPor && (
                    <p className="text-xs text-gray-400">Aprovado por: {registo.aprovadoPor}</p>
                  )}
                  {registo.observacoes && (
                    <p className="text-xs text-gray-400 mt-1 italic">{registo.observacoes}</p>
                  )}
                  {registo.relatorio && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <FileText size={11} className="text-sky-500" />
                      <span className="text-xs text-sky-600 font-medium">{registo.relatorio}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Descrição técnica IA */}
      <div className="bg-white border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-purple-500" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição técnica</h2>
          </div>
          <button
            onClick={handleGerarDescricao}
            disabled={gerandoIA}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: gerandoIA ? '#f1f5f9' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: gerandoIA ? '#94a3b8' : '#fff',
              border: 'none', padding: '6px 14px',
              cursor: gerandoIA ? 'wait' : 'pointer',
              fontSize: 11, fontWeight: 700, transition: 'all 0.2s',
            }}
          >
            <Brain size={12} />
            {gerandoIA ? 'A gerar...' : descricaoIA ? 'Regenerar' : 'Gerar descrição'}
          </button>
        </div>

        {gerandoIA && (
          <div className="flex items-center gap-3 py-6">
            <div style={{ width: 20, height: 20, border: '2px solid #e2e8f0', borderTop: '2px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <p className="text-sm text-gray-400">A analisar o equipamento...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {!gerandoIA && descricaoIA && (
          <div className="space-y-1">
            {descricaoIA.split('\n').map((linha, i) => {
              if (!linha.trim()) return null
              if (linha.startsWith('**') && linha.endsWith('**')) {
                return <p key={i} className="text-xs font-bold text-gray-700 uppercase tracking-wide mt-3 mb-1 first:mt-0">{linha.replace(/\*\*/g, '')}</p>
              }
              if (linha.includes('**')) {
                const parts = linha.split('**')
                return (
                  <p key={i} className="text-xs text-gray-600 leading-relaxed">
                    {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-gray-800">{part}</strong> : part)}
                  </p>
                )
              }
              return <p key={i} className="text-xs text-gray-600 leading-relaxed">{linha}</p>
            })}
          </div>
        )}

        {!gerandoIA && !descricaoIA && (
          <div className="text-center py-8">
            <Brain size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-300 font-medium">Sem descrição técnica</p>
            <p className="text-xs text-gray-300 mt-1">Clica em "Gerar descrição" para obter informação técnica detalhada</p>
          </div>
        )}
      </div>

      {/* Modal calibração rápida */}
      {modalCalib && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Registar Calibração</h2>
                <p className="text-xs text-gray-400 mt-0.5">{eq.descricao}</p>
              </div>
              <button onClick={() => { setModalCalib(false); setErroCalib('') }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Data *</label>
                  <input type="date" value={formCalib.data} onChange={e => setFormCalib({...formCalib, data: e.target.value})}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Entidade *</label>
                  <input type="text" placeholder="Ex: CATIM, IPQ..." value={formCalib.entidade} onChange={e => setFormCalib({...formCalib, entidade: e.target.value})}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Técnico *</label>
                <input type="text" placeholder="Nome do técnico" value={formCalib.tecnico} onChange={e => setFormCalib({...formCalib, tecnico: e.target.value})}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Aprovado por</label>
                <input type="text" placeholder="Nome do responsável" value={formCalib.aprovadoPor} onChange={e => setFormCalib({...formCalib, aprovadoPor: e.target.value})}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                  Relatório PDF <span className="text-red-500">*</span>
                </label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed p-4 cursor-pointer transition-all ${ficheiroCalib ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-red-300'}`}>
                  {ficheiroCalib ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle size={14} />
                      <span className="text-xs font-semibold">{ficheiroCalib.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={18} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-400">Clique para anexar PDF</span>
                    </>
                  )}
                  <input ref={inputCalibRef} type="file" accept=".pdf" className="hidden" onChange={e => setFicheiroCalib(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div onClick={() => setAssinado(!assinado)} className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${assinado ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${assinado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {assinado && <CheckCircle size={12} className="text-white" />}
                </div>
                <p className="text-xs text-gray-600">Confirmo que os dados são corretos e assumo responsabilidade.</p>
              </div>
              {erroCalib && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">{erroCalib}</p>}
              {sucessoCalib && <p className="text-xs text-green-700 bg-green-50 px-3 py-2">✓ Calibração registada com sucesso!</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setModalCalib(false); setErroCalib('') }} className="text-xs font-semibold text-gray-500 px-4 py-2 border border-gray-200">
                Cancelar
              </button>
              <button onClick={handleSubmitCalib} className="text-xs font-semibold text-white px-4 py-2" style={{ background: '#C0001A' }}>
                Encerrar Calibração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}