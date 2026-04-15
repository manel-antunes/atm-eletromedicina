import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, FileText, Package, Brain } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'

interface Props {
  equipamento: Equipamento
  onVoltar: () => void
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

function getEstado(eq: Equipamento): 'vencido' | 'urgente' | 'aviso' | 'ok' {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'vencido'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return 'vencido'
  if (diff <= 30) return 'urgente'
  if (diff <= 60) return 'aviso'
  return 'ok'
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

export default function DetalheEquipamento({ equipamento: eq, onVoltar }: Props) {
  const [descricaoIA, setDescricaoIA] = useState<string | null>(null)
  const [gerandoIA, setGerandoIA] = useState(false)
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

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
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-all mt-0.5"
        >
          <ArrowLeft size={12} />
          Voltar
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800">{eq.descricao}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{eq.marca} {eq.modelo} · Nº SAP: {eq.numeroSAP}</p>
        </div>
      </div>

      {/* Info principal */}
      <div className="grid grid-cols-3 gap-4">

        {/* Identificação */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
        <div className={`rounded-2xl border shadow-sm p-5 ${cfg.bg} ${cfg.border}`}>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-gray-400" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Localização</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-400">Local atual</span>
              <span className="text-xs font-semibold text-gray-700 text-right max-w-32">{eq.localizacao || '—'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-400">Responsável</span>
              <span className="text-xs font-semibold text-gray-700 text-right max-w-32">{eq.responsavel || '—'}</span>
            </div>
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-gray-400" />
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Histórico de Calibrações</h2>
          <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">{historico.length}</span>
        </div>
        {historico.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-300 font-medium">Sem calibrações registadas neste sistema</p>
            <p className="text-xs text-gray-300 mt-1">Os registos aparecem aqui após encerrar uma calibração</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historico.slice().reverse().map(registo => (
              <div key={registo.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
              border: 'none', borderRadius: 8, padding: '6px 14px',
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

    </div>
  )
}