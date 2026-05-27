import { AlertTriangle, CheckCircle, Clock, Package, Search, X } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'
import { useState, useRef, useEffect } from 'react'
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
  vencido: { label: 'Vencida',  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    dotColor: '#ef4444' },
  urgente: { label: 'Urgente',  bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', dotColor: '#f97316' },
  aviso:   { label: 'Em breve', bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700', dotColor: '#eab308' },
  ok:      { label: 'Em dia',   bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700',  dotColor: '#22c55e' },
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Dashboard({ equipamentos, onVerDetalhe }: Props) {
  const isMobile = useIsMobile()
  const estados = equipamentos.map(eq => ({ eq, estado: getEstado(eq) }))
  const vencidos = estados.filter(e => e.estado === 'vencido')
  const urgentes = estados.filter(e => e.estado === 'urgente')
  const avisos   = estados.filter(e => e.estado === 'aviso')
  const emDia    = estados.filter(e => e.estado === 'ok')
  const alertas  = [...vencidos, ...urgentes, ...avisos]

  const [vista, setVista] = useState<'tabela' | 'cards'>('cards')
  const [cardExpandido, setCardExpandido] = useState<number | null>(null)
  const [tabelaExpandida, setTabelaExpandida] = useState(false)
  const [pesquisaTabela, setPesquisaTabela] = useState('')
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'estado', direcao: 'asc' })
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollVelocidade = useRef(0)
  const scrollAnimacao = useRef<number>(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => { e.preventDefault(); scrollVelocidade.current += e.deltaY * 0.8 }
    const animar = () => {
      if (Math.abs(scrollVelocidade.current) > 0.5) { el.scrollLeft += scrollVelocidade.current * 0.12; scrollVelocidade.current *= 0.88 }
      else scrollVelocidade.current = 0
      scrollAnimacao.current = requestAnimationFrame(animar)
    }
    scrollAnimacao.current = requestAnimationFrame(animar)
    el.addEventListener('wheel', handler, { passive: false })
    return () => { el.removeEventListener('wheel', handler); cancelAnimationFrame(scrollAnimacao.current) }
  }, [])

  function toggleOrdenacao(coluna: string) {
    setOrdenacao(prev => ({ coluna, direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc' }))
  }

  function ordenarEstados(lista: typeof estados) {
    return [...lista].sort((a, b) => {
      const dir = ordenacao.direcao === 'asc' ? 1 : -1
      switch (ordenacao.coluna) {
        case 'descricao': return dir * a.eq.descricao.localeCompare(b.eq.descricao)
        case 'marca': return dir * `${a.eq.marca} ${a.eq.modelo}`.localeCompare(`${b.eq.marca} ${b.eq.modelo}`)
        case 'ultimaCalib':
        case 'proximaCalib': { const da = parseData(a.eq.dataCalibracao)?.getTime() ?? 0; const db = parseData(b.eq.dataCalibracao)?.getTime() ?? 0; return dir * (da - db) }
        case 'localizacao': return dir * (a.eq.localizacao ?? '').localeCompare(b.eq.localizacao ?? '')
        case 'estado': { const ordem = { vencido: 0, urgente: 1, aviso: 2, ok: 3 }; return dir * (ordem[a.estado] - ordem[b.estado]) }
        default: return 0
      }
    })
  }

  const equipFiltrados = ordenarEstados(estados).filter(({ eq }) =>
    pesquisaTabela === '' ||
    eq.descricao.toLowerCase().includes(pesquisaTabela.toLowerCase()) ||
    eq.marca.toLowerCase().includes(pesquisaTabela.toLowerCase()) ||
    eq.numeroSAP.includes(pesquisaTabela)
  )

  return (
    <div className="space-y-4">

      {/* KPIs — 2 colunas mobile, 4 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total" valor={equipamentos.length} sub="equipamentos"
          icon={<Package size={15} />}
          bg="#f8fafc" border="#e2e8f0" iconBg="#e2e8f0" iconCor="#475569"
          valCor="#0f172a" subCor="#94a3b8" labelCor="#64748b"
          delay="delay-1" progresso={100} progressoCor="#94a3b8"
        />
        <KpiCard
          label="Em dia" valor={emDia.length}
          sub={`${Math.round((emDia.length / equipamentos.length) * 100)}% do total`}
          icon={<CheckCircle size={15} />}
          bg="#f0fdf4" border="#bbf7d0" iconBg="#dcfce7" iconCor="#16a34a"
          valCor="#14532d" subCor="#4ade80" labelCor="#16a34a"
          delay="delay-2"
          progresso={Math.round((emDia.length / equipamentos.length) * 100)}
          progressoCor="#22c55e"
        />
        <KpiCard
          label="Em breve" valor={avisos.length + urgentes.length} sub="próximos 60 dias"
          icon={<Clock size={15} />}
          bg="#fffbeb" border="#fde68a" iconBg="#fef3c7" iconCor="#d97706"
          valCor="#78350f" subCor="#f59e0b" labelCor="#d97706"
          delay="delay-3"
          progresso={Math.round(((avisos.length + urgentes.length) / equipamentos.length) * 100)}
          progressoCor="#f59e0b"
        />
        <KpiCard
          label="Vencidas" valor={vencidos.length} sub="ação imediata"
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

      {/* Alertas cedências atrasadas */}
      {(() => {
        try {
          const ceds = JSON.parse(localStorage.getItem('atm_cedencias') ?? '[]')
          const atrasadas = ceds.filter((c: { ativa: boolean; dataRetornoPrevista: string }) => {
            if (!c.ativa) return false
            return new Date(c.dataRetornoPrevista) < new Date()
          })
          if (atrasadas.length === 0) return null
          return (
            <div className="mb-2">
              {atrasadas.map((c: { id: number; equipamentoNome: string; destino: string; dataRetornoPrevista: string }) => (
                <div key={c.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                    <div>
                      <p style={{ color: '#9a3412', fontSize: 13, fontWeight: 700 }}>{c.equipamentoNome}</p>
                      <p style={{ color: '#ea580c', fontSize: 11, marginTop: 2, opacity: 0.7 }}>Cedido a {c.destino} — retorno: {new Date(c.dataRetornoPrevista).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                  <span style={{ background: '#ffedd5', color: '#9a3412', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Retorno atrasado</span>
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
                  style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div className={estado === 'vencido' || estado === 'urgente' ? 'dot-piscar' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: c.titulo, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.descricao}</p>
                      <p style={{ color: c.sub, fontSize: 11, marginTop: 2, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.marca} {eq.modelo} · {eq.numeroSAP}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {!isMobile && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: c.titulo, fontSize: 12, fontWeight: 600 }}>{getDiasTexto(eq)}</p>
                        <p style={{ color: c.sub, fontSize: 11, marginTop: 2, opacity: 0.7 }}>Próxima: {formatarData(eq.dataCalibracao)}</p>
                      </div>
                    )}
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

      {/* Tabela / Cards */}
      <div className="anim-fade-up delay-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Todos os equipamentos</h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {!isMobile && (
              <button onClick={() => setVista('tabela')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${vista === 'tabela' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                ☰ Tabela
              </button>
            )}
            <button onClick={() => setVista('cards')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${vista === 'cards' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              ⊞ Cards
            </button>
          </div>
        </div>

        {vista === 'tabela' && !isMobile ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                type="text" placeholder="Filtrar equipamentos..."
                value={pesquisaTabela} onChange={e => setPesquisaTabela(e.target.value)}
                className="flex-1 text-xs outline-none bg-transparent text-gray-600 placeholder-gray-400"
              />
              {pesquisaTabela && <button onClick={() => setPesquisaTabela('')} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>}
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">{equipFiltrados.length} equipamentos</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { key: 'descricao',    label: 'Equipamento' },
                    { key: 'marca',        label: 'Marca' },
                    { key: 'proximaCalib', label: 'Próxima Calib.' },
                    { key: 'localizacao',  label: 'Local' },
                    { key: 'estado',       label: 'Estado' },
                  ].map(col => (
                    <th key={col.key} onClick={() => toggleOrdenacao(col.key)}
                      className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide select-none cursor-pointer hover:text-gray-600">
                      <span className="flex items-center gap-1">
                        {col.label}
                        <span className="text-gray-300">{ordenacao.coluna === col.key ? (ordenacao.direcao === 'asc' ? '↑' : '↓') : '↕'}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipFiltrados.slice(0, tabelaExpandida ? undefined : 5).map(({ eq, estado }) => {
                  const cfg = estadoConfig[estado]
                  const proxima = parseData(eq.dataCalibracao)
                  const diff = proxima ? differenceInDays(proxima, new Date()) : null
                  return (
                    <tr key={eq.id} onClick={() => onVerDetalhe(eq)} className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer group">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0 }} />
                          <div>
                            <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{eq.descricao}</p>
                            <p className="text-xs text-gray-400 font-mono">{eq.numeroSAP}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{eq.marca} <span className="text-gray-300">{eq.modelo}</span></td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-gray-700">{proxima ? proxima.toLocaleDateString('pt-PT') : '—'}</p>
                        {diff !== null && (
                          <p className={`text-xs font-semibold ${diff < 0 ? 'text-red-500' : diff <= 30 ? 'text-orange-500' : diff <= 60 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {diff < 0 ? `há ${Math.abs(diff)}d` : `em ${diff}d`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{eq.localizacao || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!tabelaExpandida && equipFiltrados.length > 5 ? (
              <button onClick={() => setTabelaExpandida(true)} className="w-full py-3 text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all border-t border-gray-100 flex items-center justify-center gap-2">
                Ver todos os {equipFiltrados.length} equipamentos ↓
              </button>
            ) : tabelaExpandida ? (
              <button onClick={() => setTabelaExpandida(false)} className="w-full py-3 text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all border-t border-gray-100 flex items-center justify-center gap-2">
                Recolher ↑
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {ordenarEstados(estados).slice(0, tabelaExpandida ? undefined : 6).map(({ eq, estado }) => {
              const cfg = estadoConfig[estado]
              const proxima = parseData(eq.dataCalibracao)
              const ultima = proxima ? getUltimaCalib(proxima, eq.periodicidade) : null
              const diff = proxima ? differenceInDays(proxima, new Date()) : null
              const expandido = cardExpandido === eq.id
              return (
                <div key={eq.id} onClick={() => setCardExpandido(expandido ? null : eq.id)}
                  className={`bg-white rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden ${cfg.border} ${expandido ? 'shadow-lg ring-1 ring-gray-200' : 'hover:shadow-md'}`}>
                  <div className={`h-1 w-full ${cfg.dot}`} />
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${estado === 'vencido' || estado === 'urgente' ? 'dot-piscar' : ''}`} />
                    <p className="text-xs font-bold text-gray-800 flex-1 truncate">{eq.descricao}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>{cfg.label}</span>
                    <span style={{ fontSize: 9, color: '#cbd5e1', display: 'inline-block', transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', flexShrink: 0 }}>▼</span>
                  </div>
                  <div style={{ maxHeight: expandido ? 280 : 0, overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
                    <div className={`px-4 pb-4 border-t ${cfg.border}`}>
                      <div className="space-y-2 mt-3">
                        {[
                          { label: 'Nº SAP', valor: eq.numeroSAP, mono: true },
                          { label: 'Marca/Modelo', valor: `${eq.marca} ${eq.modelo}` },
                          { label: 'Localização', valor: eq.localizacao || '—' },
                          { label: 'Última calib.', valor: ultima ? ultima.toLocaleDateString('pt-PT') : '—' },
                          { label: 'Próxima calib.', valor: proxima ? proxima.toLocaleDateString('pt-PT') : '—' },
                        ].map(({ label, valor, mono }) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">{label}</span>
                            <span className={`text-xs font-semibold text-gray-700 truncate max-w-32 ${mono ? 'font-mono' : ''}`}>{valor}</span>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-3 pt-2 border-t ${cfg.border} flex items-center justify-between`}>
                        {diff !== null && (
                          <p className={`text-xs font-bold ${cfg.text}`}>
                            {diff < 0 ? `Venceu há ${Math.abs(diff)} dias` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff} dias`}
                          </p>
                        )}
                        <button onClick={e => { e.stopPropagation(); onVerDetalhe(eq) }} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors ml-auto">
                          Ver detalhes →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {!tabelaExpandida && estados.length > 6 && (
              <div onClick={() => setTabelaExpandida(true)} className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 cursor-pointer hover:bg-gray-100 transition-all flex flex-col items-center justify-center gap-2 min-h-24">
                <p className="text-xs font-bold text-gray-400">+{estados.length - 6} equipamentos</p>
                <p className="text-xs text-gray-300">Clica para ver todos</p>
              </div>
            )}
            {tabelaExpandida && (
              <button onClick={() => setTabelaExpandida(false)} className="col-span-full py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white rounded-2xl border border-gray-100 transition-all">
                Recolher ↑
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scroll horizontal — Info empresa */}
      <div className="anim-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Unidade de Eletromedicina</h2>
        </div>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* Card estatísticas */}
          <div className="flex-shrink-0 w-64 rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            <div style={{ background: '#C0001A', padding: '12px 16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estatísticas</p>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 2 }}>Resumo da Unidade</p>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total equipamentos',   valor: equipamentos.length,                                                cor: '#38bdf8' },
                { label: 'Taxa de conformidade', valor: `${Math.round((emDia.length / equipamentos.length) * 100)}%`,     cor: '#4ade80' },
                { label: 'Calibrações vencidas', valor: vencidos.length,                                                   cor: '#f87171' },
                { label: 'A vencer em 30 dias',  valor: urgentes.length,                                                   cor: '#fb923c' },
                { label: 'A vencer em 60 dias',  valor: avisos.length,                                                     cor: '#facc15' },
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{stat.label}</p>
                  <p style={{ color: stat.cor, fontSize: 14, fontWeight: 800, fontFamily: 'monospace' }}>{stat.valor}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cards por local */}
          {[
            { nome: 'Hospital CUF Porto',    sigla: 'HPRT',   morada: 'Estr. Circunvalação 14341, Porto', cor: '#3b82f6' },
            { nome: 'Hospital CUF Trindade', sigla: 'HTRD',   morada: 'R. da Trindade, Porto',            cor: '#8b5cf6' },
            { nome: 'Instituto CUF Porto',   sigla: 'CINS',   morada: 'Matosinhos, Porto',                cor: '#06b6d4' },
            { nome: 'Hospital de Braga',     sigla: 'HBRAGA', morada: 'Braga',                            cor: '#10b981' },
            { nome: 'ISQ',                   sigla: 'ISQ',    morada: 'Oeiras, Lisboa',                   cor: '#f59e0b' },
          ].map(local => {
            const eqLocal = equipamentos.filter(eq => (eq.localizacao ?? '').toUpperCase().includes(local.sigla))
            const vencidosLocal = eqLocal.filter(eq => { const p = parseData(eq.dataCalibracao); return !p || differenceInDays(p, new Date()) < 0 }).length
            const emDiaLocal = eqLocal.length - vencidosLocal
            const taxa = eqLocal.length > 0 ? Math.round((emDiaLocal / eqLocal.length) * 100) : 0
            return (
              <div key={local.sigla} className="flex-shrink-0 w-56 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
                <div style={{ background: local.cor, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{local.nome}</p>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{local.sigla}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 3 }}>{local.morada}</p>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{eqLocal.length}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>equipamentos</p>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Conformidade</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: taxa >= 80 ? '#22c55e' : taxa >= 60 ? '#eab308' : '#ef4444' }}>{taxa}%</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${taxa}%`, background: taxa >= 80 ? '#22c55e' : taxa >= 60 ? '#eab308' : '#ef4444', borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>{emDiaLocal}</p>
                      <p style={{ fontSize: 9, color: '#16a34a', textTransform: 'uppercase' }}>Em dia</p>
                    </div>
                    <div style={{ flex: 1, background: vencidosLocal > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: vencidosLocal > 0 ? '#dc2626' : '#94a3b8', fontFamily: 'monospace' }}>{vencidosLocal}</p>
                      <p style={{ fontSize: 9, color: vencidosLocal > 0 ? '#dc2626' : '#94a3b8', textTransform: 'uppercase' }}>Vencidas</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Card equipa */}
          <div className="flex-shrink-0 w-56 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
            <div style={{ background: 'linear-gradient(135deg, #C0001A 0%, #7f1d1d 100%)', padding: '12px 16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equipa</p>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 2 }}>Eletromedicina ATM</p>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { nome: 'Unidade de Eletromedicina', cargo: 'ATM Manutenção Total',          cor: '#C0001A' },
                { nome: 'Hospital CUF Porto',         cargo: 'Local principal',               cor: '#3b82f6' },
                { nome: 'Gestão de Calibrações',      cargo: `${equipamentos.length} equip.`, cor: '#8b5cf6' },
                { nome: 'ATM Eletromedicina v1.0',    cargo: 'Sistema de gestão',             cor: '#10b981' },
              ].map(m => (
                <div key={m.nome} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.cor + '20', border: `1.5px solid ${m.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: m.cor }}>{m.nome[0]}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{m.nome}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8' }}>{m.cargo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card sistema */}
          <div className="flex-shrink-0 w-56 rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sistema</p>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 2 }}>ATM Eletromedicina</p>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Versão',     valor: 'v1.0',                          cor: '#4ade80' },
                { label: 'Base dados', valor: 'PostgreSQL',                    cor: '#38bdf8' },
                { label: 'Frontend',   valor: 'React + TypeScript',            cor: '#a78bfa' },
                { label: 'Backend',    valor: 'Node.js + Express',             cor: '#fb923c' },
                { label: 'Deploy',     valor: 'Vercel + Render',               cor: '#f472b6' },
                { label: 'URL',        valor: 'atm-eletromedicina.vercel.app', cor: '#94a3b8' },
              ].map(info => (
                <div key={info.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{info.label}</p>
                  <p style={{ color: info.cor, fontSize: 10, fontWeight: 600 }}>{info.valor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}