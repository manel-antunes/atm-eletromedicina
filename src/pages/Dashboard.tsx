import { AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'
import { useState } from 'react'
import GraficoCalibracoes from '../components/GraficoCalibracoes'
import KpiCard from '../components/KpiCard'

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
}

function parseData(dataStr: string): Date | null {
  if (!dataStr || dataStr === 'undefined' || dataStr === 'null') return null
  const numerico = Number(dataStr)
  if (!isNaN(numerico) && numerico > 40000) {
    const data = new Date((numerico - 25569) * 86400 * 1000)
    if (isValid(data)) return data
  }
  const formatos = ['M/d/yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'M/d/yy']
  for (const fmt of formatos) {
    const tentativa = parse(dataStr, fmt, new Date())
    if (isValid(tentativa)) return tentativa
  }
  const nativa = new Date(dataStr)
  if (isValid(nativa)) return nativa
  return null
}

function formatarData(dataStr: string): string {
  if (!dataStr || dataStr === 'undefined') return '—'
  const data = parseData(dataStr)
  if (!data) return '—'
  return data.toLocaleDateString('pt-PT')
}

function getUltimaCalib(proxima: Date, periodicidade: string): Date {
  const ultima = new Date(proxima)
  if (periodicidade === 'Bienal') ultima.setFullYear(ultima.getFullYear() - 2)
  else ultima.setFullYear(ultima.getFullYear() - 1)
  return ultima
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

function getDiasTexto(eq: Equipamento): string {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'Sem data de calibração'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return `Venceu há ${Math.abs(diff)} dias`
  if (diff === 0) return 'Vence hoje!'
  if (diff <= 60) return `Vence em ${diff} dias`
  return `Próxima: ${proxima.toLocaleDateString('pt-PT')}`
}

const estadoConfig = {
  vencido: { label: 'Vencida',  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700' },
  urgente: { label: 'Urgente',  bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
  aviso:   { label: 'Em breve', bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  ok:      { label: 'Em dia',   bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
}



export default function Dashboard({ equipamentos, onVerDetalhe }: Props) {
  const estados = equipamentos.map(eq => ({ eq, estado: getEstado(eq) }))
  const vencidos = estados.filter(e => e.estado === 'vencido')
  const urgentes = estados.filter(e => e.estado === 'urgente')
  const avisos   = estados.filter(e => e.estado === 'aviso')
  const emDia    = estados.filter(e => e.estado === 'ok')
  const alertas  = [...vencidos, ...urgentes, ...avisos]



  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({
    coluna: 'estado', direcao: 'asc'
  })

  function toggleOrdenacao(coluna: string) {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc'
    }))
  }

  function ordenarEstados(lista: typeof estados) {
    return [...lista].sort((a, b) => {
      const dir = ordenacao.direcao === 'asc' ? 1 : -1
      switch (ordenacao.coluna) {
        case 'descricao': return dir * a.eq.descricao.localeCompare(b.eq.descricao)
        case 'marca': return dir * `${a.eq.marca} ${a.eq.modelo}`.localeCompare(`${b.eq.marca} ${b.eq.modelo}`)
        case 'ultimaCalib':
        case 'proximaCalib': {
          const da = parseData(a.eq.dataCalibracao)?.getTime() ?? 0
          const db = parseData(b.eq.dataCalibracao)?.getTime() ?? 0
          return dir * (da - db)
        }
        case 'localizacao': return dir * (a.eq.localizacao ?? '').localeCompare(b.eq.localizacao ?? '')
        case 'estado': {
          const ordem = { vencido: 0, urgente: 1, aviso: 2, ok: 3 }
          return dir * (ordem[a.estado] - ordem[b.estado])
        }
        default: return 0
      }
    })
  }

  return (
    <div className="space-y-6">
{/* KPIs */}
<div className="grid grid-cols-4 gap-4">
  <KpiCard
    label="Total"
    valor={equipamentos.length}
    sub="equipamentos"
    icon={<Package size={15} />}
    bg="#f8fafc" border="#e2e8f0" iconBg="#e2e8f0" iconCor="#475569"
    valCor="#0f172a" subCor="#94a3b8" labelCor="#64748b"
    delay="delay-1"
    progresso={100}
    progressoCor="#94a3b8"
  />
  <KpiCard
    label="Em dia"
    valor={emDia.length}
    sub={`${Math.round((emDia.length / equipamentos.length) * 100)}% do total`}
    icon={<CheckCircle size={15} />}
    bg="#f0fdf4" border="#bbf7d0" iconBg="#dcfce7" iconCor="#16a34a"
    valCor="#14532d" subCor="#4ade80" labelCor="#16a34a"
    delay="delay-2"
    progresso={Math.round((emDia.length / equipamentos.length) * 100)}
    progressoCor="#22c55e"
  />
  <KpiCard
    label="Em breve"
    valor={avisos.length + urgentes.length}
    sub="próximos 60 dias"
    icon={<Clock size={15} />}
    bg="#fffbeb" border="#fde68a" iconBg="#fef3c7" iconCor="#d97706"
    valCor="#78350f" subCor="#f59e0b" labelCor="#d97706"
    delay="delay-3"
    progresso={Math.round(((avisos.length + urgentes.length) / equipamentos.length) * 100)}
    progressoCor="#f59e0b"
  />
  <KpiCard
    label="Vencidas"
    valor={vencidos.length}
    sub="ação imediata"
    icon={<AlertTriangle size={15} />}
    bg="#fff5f5" border="#fecaca" iconBg="#fee2e2" iconCor="#dc2626"
    valCor="#7f1d1d" subCor="#f87171" labelCor="#dc2626"
    delay="delay-4"
    progresso={Math.round((vencidos.length / equipamentos.length) * 100)}
    progressoCor="#ef4444"
  />
</div>

      {/* Gráfico */}
      <div className="anim-fade-up delay-5">
        <GraficoCalibracoes equipamentos={equipamentos} />
      </div>
{/* Alertas de cedências atrasadas */}
{(() => {
  try {
    const ceds = JSON.parse(localStorage.getItem('atm_cedencias') ?? '[]')
    const atrasadas = ceds.filter((c: { ativa: boolean; dataRetornoPrevista: string }) => {
      if (!c.ativa) return false
      const retorno = new Date(c.dataRetornoPrevista)
      return retorno < new Date()
    })
    if (atrasadas.length === 0) return null
    return (
      <div className="mb-2">
        {atrasadas.map((c: { id: number; equipamentoNome: string; destino: string; dataRetornoPrevista: string }) => (
          <div key={c.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#9a3412', fontSize: 13, fontWeight: 700 }}>{c.equipamentoNome}</p>
                <p style={{ color: '#ea580c', fontSize: 11, marginTop: 2, opacity: 0.7 }}>Cedido a {c.destino} — retorno previsto: {new Date(c.dataRetornoPrevista).toLocaleDateString('pt-PT')}</p>
              </div>
            </div>
            <span style={{ background: '#ffedd5', color: '#9a3412', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
              Retorno atrasado
            </span>
          </div>
        ))}
      </div>
    )
  } catch { return null }
})()}
      {/* Alertas */}
      {alertas.length > 0 && (
        
        <div className="anim-fade-up delay-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Alertas ativos</h2>
            <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{alertas.length}</span>
          </div>
          <div className="space-y-2">
            {alertas.map(({ eq, estado }, index) => {
              const cfg = estadoConfig[estado]
              const cores = {
                vencido: { bg: '#fff5f5', border: '#fecaca', dot: '#ef4444', titulo: '#991b1b', sub: '#dc2626', badge: { bg: '#fee2e2', color: '#991b1b' } },
                urgente: { bg: '#fff7ed', border: '#fed7aa', dot: '#f97316', titulo: '#9a3412', sub: '#ea580c', badge: { bg: '#ffedd5', color: '#9a3412' } },
                aviso:   { bg: '#fefce8', border: '#fef08a', dot: '#eab308', titulo: '#854d0e', sub: '#ca8a04', badge: { bg: '#fef9c3', color: '#854d0e' } },
                ok:      { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', titulo: '#14532d', sub: '#16a34a', badge: { bg: '#dcfce7', color: '#14532d' } },
              }
              const c = cores[estado]
              return (
                <div
                  key={eq.id}
                  className={`anim-fade-left delay-${Math.min(index + 1, 8)}`}
                  onClick={() => onVerDetalhe(eq)}
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: '11px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
  className={estado === 'vencido' || estado === 'urgente' ? 'dot-piscar' : ''}
  style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }}
/>
                    <div>
                      <p style={{ color: c.titulo, fontSize: 13, fontWeight: 700 }}>{eq.descricao}</p>
                      <p style={{ color: c.sub, fontSize: 11, marginTop: 2, opacity: 0.7 }}>
                        {eq.marca} {eq.modelo} · {eq.numeroSAP} · {eq.localizacao}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: c.titulo, fontSize: 12, fontWeight: 600 }}>{getDiasTexto(eq)}</p>
                      <p style={{ color: c.sub, fontSize: 11, marginTop: 2, opacity: 0.7 }}>Próxima: {formatarData(eq.dataCalibracao)}</p>
                    </div>
                    <span style={{ background: c.badge.bg, color: c.badge.color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="anim-fade-up delay-7">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Todos os equipamentos</h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  { key: 'sap',         label: 'Nº SAP',        sortable: false },
                  { key: 'descricao',   label: 'Descrição',     sortable: true },
                  { key: 'marca',       label: 'Marca/Modelo',  sortable: true },
                  { key: 'periodicidade',label: 'Periodicidade', sortable: false },
                  { key: 'ultimaCalib', label: 'Última Calib.', sortable: true },
                  { key: 'proximaCalib',label: 'Próxima Calib.',sortable: true },
                  { key: 'localizacao', label: 'Localização',   sortable: true },
                  { key: 'estado',      label: 'Estado',        sortable: true },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleOrdenacao(col.key)}
                    className={`text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide select-none ${col.sortable ? 'cursor-pointer hover:text-gray-600' : ''}`}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <span className="text-gray-300">
                          {ordenacao.coluna === col.key ? (ordenacao.direcao === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenarEstados(estados).map(({ eq, estado }) => {
                const cfg = estadoConfig[estado]
                const proxima = parseData(eq.dataCalibracao)
                const ultima = proxima ? getUltimaCalib(proxima, eq.periodicidade) : null
                return (
                  <tr
                    key={eq.id}
                    onClick={() => onVerDetalhe(eq)}
                    className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{eq.numeroSAP}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 text-xs max-w-48 truncate">{eq.descricao}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{eq.marca} {eq.modelo}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${eq.periodicidade === 'Bienal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {eq.periodicidade ?? 'Anual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{ultima ? ultima.toLocaleDateString('pt-PT') : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{proxima ? proxima.toLocaleDateString('pt-PT') : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-32 truncate">{eq.localizacao || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}