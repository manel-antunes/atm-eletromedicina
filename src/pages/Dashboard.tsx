import { AlertTriangle, CheckCircle, Clock, Package, Search, X } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'
import { useState, useRef, useEffect } from 'react'
import GraficoCalibracoes from '../components/GraficoCalibracoes'
import KpiCard from '../components/KpiCard'
import { SkeletonKpis, SkeletonTabela, SkeletonLine } from '../components/Skeleton'

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
  loading?: boolean
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

// Cores editoriais — fundo escuro, sem pastéis
const estadoConfig = {
  vencido: { label: 'Vencida',  dotColor: '#ef4444', badgeBg: 'rgba(192,0,26,0.15)', badgeColor: '#ff6b6b', borderColor: 'rgba(192,0,26,0.25)', rowBg: 'rgba(192,0,26,0.05)' },
  urgente: { label: 'Urgente',  dotColor: '#f97316', badgeBg: 'rgba(249,115,22,0.15)', badgeColor: '#fb923c', borderColor: 'rgba(249,115,22,0.25)', rowBg: 'rgba(249,115,22,0.04)' },
  aviso:   { label: 'Em breve', dotColor: '#eab308', badgeBg: 'rgba(234,179,8,0.15)', badgeColor: '#fbbf24', borderColor: 'rgba(234,179,8,0.25)', rowBg: 'rgba(234,179,8,0.04)' },
  ok:      { label: 'Em dia',   dotColor: '#22c55e', badgeBg: 'rgba(34,197,94,0.15)', badgeColor: '#4ade80', borderColor: 'rgba(34,197,94,0.2)', rowBg: 'transparent' },
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

function SkeletonGrafico() {
  return (
    <div style={{ background: '#0f172a', borderRadius: 20, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonLine width={120} height={10} />
          <SkeletonLine width={80} height={28} />
          <SkeletonLine width={140} height={10} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <SkeletonLine width={40} height={9} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }} />
    </div>
  )
}

function SkeletonAlertas() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonLine width="50%" height={12} />
            <SkeletonLine width="70%" height={10} />
          </div>
          <SkeletonLine width={60} height={22} radius={99} />
        </div>
      ))}
    </div>
  )
}

// Label de secção — estilo editorial
function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 9,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        letterSpacing: '0.22em',
      }}>
        {children}
      </span>
      {count !== undefined && (
        <span style={{
          background: '#C0001A',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 99,
          letterSpacing: '0.05em',
        }}>
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export default function Dashboard({ equipamentos, onVerDetalhe, loading = false }: Props) {
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

  if (loading) {
    return (
      <div className="space-y-4">
        <style>{`@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <SkeletonKpis />
        <SkeletonGrafico />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <SkeletonLine width={100} height={10} />
            <SkeletonLine width={24} height={20} radius={99} />
          </div>
          <SkeletonAlertas />
        </div>
        <SkeletonTabela linhas={5} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
        .dash-row:hover { background: rgba(255,255,255,0.04) !important; }
        .alerta-item:hover { transform: translateX(3px); }
        .alerta-item { transition: transform 0.15s ease; }
      `}</style>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total" valor={equipamentos.length} sub="equipamentos"
          icon={<Package size={15} />}
          estado="neutro" delay="delay-1"
          progresso={100} progressoCor="rgba(255,255,255,0.2)"
        />
        <KpiCard
          label="Em dia" valor={emDia.length}
          sub={`${Math.round((emDia.length / equipamentos.length) * 100)}% do total`}
          icon={<CheckCircle size={15} />}
          estado="ok" delay="delay-2"
          progresso={Math.round((emDia.length / equipamentos.length) * 100)}
          progressoCor="#4ade80"
        />
        <KpiCard
          label="Em breve" valor={avisos.length + urgentes.length} sub="próximos 60 dias"
          icon={<Clock size={15} />}
          estado="aviso" delay="delay-3"
          progresso={Math.round(((avisos.length + urgentes.length) / equipamentos.length) * 100)}
          progressoCor="#fbbf24"
        />
        <KpiCard
          label="Vencidas" valor={vencidos.length} sub="ação imediata"
          icon={<AlertTriangle size={15} />}
          estado="vencido" delay="delay-4"
          progresso={Math.round((vencidos.length / equipamentos.length) * 100)}
          progressoCor="#C0001A"
        />
      </div>

      {/* ── Gráfico ── */}
      <div className="anim-fade-up delay-5">
        <GraficoCalibracoes equipamentos={equipamentos} />
      </div>

      {/* ── Alertas cedências ── */}
      {(() => {
        try {
          const ceds = JSON.parse(localStorage.getItem('atm_cedencias') ?? '[]')
          const atrasadas = ceds.filter((c: { ativa: boolean; dataRetornoPrevista: string }) => {
            if (!c.ativa) return false
            return new Date(c.dataRetornoPrevista) < new Date()
          })
          if (atrasadas.length === 0) return null
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {atrasadas.map((c: { id: number; equipamentoNome: string; destino: string; dataRetornoPrevista: string }) => (
                <div key={c.id} style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                    <div>
                      <p style={{ color: '#fb923c', fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{c.equipamentoNome}</p>
                      <p style={{ color: 'rgba(249,115,22,0.6)', fontSize: 10, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>Cedido a {c.destino} — retorno: {new Date(c.dataRetornoPrevista).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                  <span style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', fontSize: 9, fontWeight: 600, padding: '3px 10px', borderRadius: 99, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Retorno atrasado</span>
                </div>
              ))}
            </div>
          )
        } catch { return null }
      })()}

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div className="anim-fade-up delay-6">
          <SectionLabel count={alertas.length}>Alertas ativos</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alertas.map(({ eq, estado }, index) => {
              const cfg = estadoConfig[estado]
              return (
                <div
                  key={eq.id}
                  className={`alerta-item anim-fade-left delay-${Math.min(index + 1, 8)}`}
                  onClick={() => onVerDetalhe(eq)}
                  style={{
                    background: cfg.rowBg,
                    border: `1px solid ${cfg.borderColor}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    gap: 8,
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div
                      className={estado === 'vencido' || estado === 'urgente' ? 'dot-piscar' : ''}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {eq.descricao}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {eq.marca} {eq.modelo} · {eq.numeroSAP}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {!isMobile && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: cfg.badgeColor, fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{getDiasTexto(eq)}</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1, fontFamily: "'Inter', sans-serif" }}>Próxima: {formatarData(eq.dataCalibracao)}</p>
                      </div>
                    )}
                    <span style={{
                      background: cfg.badgeBg,
                      color: cfg.badgeColor,
                      fontSize: 9,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 99,
                      whiteSpace: 'nowrap',
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tabela / Cards ── */}
      <div className="anim-fade-up delay-7">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionLabel>Todos os equipamentos</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
            {!isMobile && (
              <button
                onClick={() => setVista('tabela')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.08em',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: vista === 'tabela' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: vista === 'tabela' ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
              >
                ☰ Tabela
              </button>
            )}
            <button
              onClick={() => setVista('cards')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.08em',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: vista === 'cards' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: vista === 'cards' ? '#fff' : 'rgba(255,255,255,0.3)',
              }}
            >
              ⊞ Cards
            </button>
          </div>
        </div>

        {vista === 'tabela' && !isMobile ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <Search size={12} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Filtrar equipamentos..."
                value={pesquisaTabela}
                onChange={e => setPesquisaTabela(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.02em',
                }}
              />
              {pesquisaTabela && (
                <button onClick={() => setPesquisaTabela('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                  <X size={11} />
                </button>
              )}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', flexShrink: 0 }}>{equipFiltrados.length} eq.</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { key: 'descricao',    label: 'Equipamento' },
                    { key: 'marca',        label: 'Marca' },
                    { key: 'proximaCalib', label: 'Próxima Calib.' },
                    { key: 'localizacao',  label: 'Local' },
                    { key: 'estado',       label: 'Estado' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleOrdenacao(col.key)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 16px',
                        fontSize: 9,
                        fontWeight: 500,
                        fontFamily: "'Inter', sans-serif",
                        color: 'rgba(255,255,255,0.25)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.18em',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.label} {ordenacao.coluna === col.key ? (ordenacao.direcao === 'asc' ? '↑' : '↓') : ''}
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
                    <tr
                      key={eq.id}
                      className="dash-row"
                      onClick={() => onVerDetalhe(eq)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 500, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{eq.descricao}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 1 }}>{eq.numeroSAP}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}>
                        {eq.marca} <span style={{ color: 'rgba(255,255,255,0.2)' }}>{eq.modelo}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif" }}>{proxima ? proxima.toLocaleDateString('pt-PT') : '—'}</p>
                        {diff !== null && (
                          <p style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: diff < 0 ? '#ef4444' : diff <= 30 ? '#f97316' : diff <= 60 ? '#eab308' : 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                            {diff < 0 ? `há ${Math.abs(diff)}d` : `em ${diff}d`}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>{eq.localizacao || '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: cfg.badgeBg, color: cfg.badgeColor, fontSize: 9, fontWeight: 600, padding: '3px 10px', borderRadius: 99, fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!tabelaExpandida && equipFiltrados.length > 5 ? (
              <button
                onClick={() => setTabelaExpandida(true)}
                style={{ width: '100%', padding: '12px', fontSize: 10, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.3)', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.15s' }}
              >
                Ver todos os {equipFiltrados.length} equipamentos ↓
              </button>
            ) : tabelaExpandida ? (
              <button
                onClick={() => setTabelaExpandida(false)}
                style={{ width: '100%', padding: '12px', fontSize: 10, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.3)', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              >
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
                <div
                  key={eq.id}
                  onClick={() => setCardExpandido(expandido ? null : eq.id)}
                  style={{
                    background: 'linear-gradient(135deg, #0f1629 0%, #141d35 100%)',
                    border: `1px solid ${expandido ? cfg.borderColor : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: expandido ? `0 0 20px ${cfg.dotColor}18` : 'none',
                  }}
                >
                  {/* Linha de cor no topo */}
                  <div style={{ height: 2, background: cfg.dotColor, opacity: 0.7 }} />

                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      className={estado === 'vencido' || estado === 'urgente' ? 'dot-piscar' : ''}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0 }}
                    />
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#fff', fontFamily: "'Inter', sans-serif", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {eq.descricao}
                    </p>
                    <span style={{ background: cfg.badgeBg, color: cfg.badgeColor, fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', display: 'inline-block', transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', flexShrink: 0 }}>▼</span>
                  </div>

                  <div style={{ maxHeight: expandido ? 280 : 0, overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        {[
                          { label: 'Nº SAP', valor: eq.numeroSAP, mono: true },
                          { label: 'Marca / Modelo', valor: `${eq.marca} ${eq.modelo}` },
                          { label: 'Localização', valor: eq.localizacao || '—' },
                          { label: 'Última calib.', valor: ultima ? ultima.toLocaleDateString('pt-PT') : '—' },
                          { label: 'Próxima calib.', valor: proxima ? proxima.toLocaleDateString('pt-PT') : '—' },
                        ].map(({ label, valor, mono }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>{label}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.7)', fontFamily: mono ? 'monospace' : "'Inter', sans-serif", maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valor}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {diff !== null && (
                          <p style={{ fontSize: 11, fontWeight: 600, color: cfg.badgeColor, fontFamily: "'Inter', sans-serif" }}>
                            {diff < 0 ? `Venceu há ${Math.abs(diff)} dias` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff} dias`}
                          </p>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); onVerDetalhe(eq) }}
                          style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif", letterSpacing: '0.05em', marginLeft: 'auto' }}
                        >
                          Ver detalhes →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {!tabelaExpandida && estados.length > 6 && (
              <div
                onClick={() => setTabelaExpandida(true)}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 80, transition: 'background 0.15s' }}
              >
                <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>+{estados.length - 6} equipamentos</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: "'Inter', sans-serif" }}>Clica para ver todos</p>
              </div>
            )}

            {tabelaExpandida && (
              <button
                onClick={() => setTabelaExpandida(false)}
                style={{ gridColumn: '1 / -1', padding: '12px', fontSize: 10, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              >
                Recolher ↑
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Scroll horizontal — Unidade ── */}
      <div className="anim-fade-up">
        <SectionLabel>Unidade de Eletromedicina</SectionLabel>
        <div ref={scrollRef} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>

          {/* Card Estatísticas */}
          <div style={{ flexShrink: 0, width: 220, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg, #0f1629 0%, #141d35 100%)' }}>
            <div style={{ background: '#C0001A', padding: '10px 14px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: "'Inter', sans-serif" }}>Estatísticas</p>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 400, marginTop: 2, fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.02em' }}>Resumo da Unidade</p>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Total equipamentos',   valor: equipamentos.length,                                             cor: 'rgba(255,255,255,0.7)' },
                { label: 'Taxa de conformidade', valor: `${Math.round((emDia.length / equipamentos.length) * 100)}%`,  cor: '#4ade80' },
                { label: 'Calibrações vencidas', valor: vencidos.length,                                                cor: '#f87171' },
                { label: 'A vencer em 30 dias',  valor: urgentes.length,                                                cor: '#fb923c' },
                { label: 'A vencer em 60 dias',  valor: avisos.length,                                                  cor: '#fbbf24' },
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: "'Inter', sans-serif" }}>{stat.label}</p>
                  <p style={{ color: stat.cor, fontSize: 14, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.01em' }}>{stat.valor}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cards por localização */}
          {[
            { nome: 'Hospital CUF Porto',    sigla: 'HPRT',   morada: 'Estr. Circunvalação 14341', cor: '#3b82f6' },
            { nome: 'Hospital CUF Trindade', sigla: 'HTRD',   morada: 'R. da Trindade, Porto',     cor: '#8b5cf6' },
            { nome: 'Instituto CUF Porto',   sigla: 'CINS',   morada: 'Matosinhos',                cor: '#06b6d4' },
            { nome: 'Hospital de Braga',     sigla: 'HBRAGA', morada: 'Braga',                     cor: '#10b981' },
            { nome: 'ISQ',                   sigla: 'ISQ',    morada: 'Oeiras, Lisboa',            cor: '#f59e0b' },
          ].map(local => {
            const eqLocal = equipamentos.filter(eq => (eq.localizacao ?? '').toUpperCase().includes(local.sigla))
            const vencidosLocal = eqLocal.filter(eq => { const p = parseData(eq.dataCalibracao); return !p || differenceInDays(p, new Date()) < 0 }).length
            const emDiaLocal = eqLocal.length - vencidosLocal
            const taxa = eqLocal.length > 0 ? Math.round((emDiaLocal / eqLocal.length) * 100) : 0
            return (
              <div key={local.sigla} style={{ flexShrink: 0, width: 200, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg, #0f1629 0%, #141d35 100%)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{local.nome}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>{local.morada}</p>
                  </div>
                  <span style={{ background: local.cor + '22', color: local.cor, fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 99, fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em', border: `1px solid ${local.cor}44` }}>{local.sigla}</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: '#fff', lineHeight: 1, marginBottom: 8 }}>{eqLocal.length}</p>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Conformidade</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: taxa >= 80 ? '#4ade80' : taxa >= 60 ? '#fbbf24' : '#f87171', fontFamily: "'Inter', sans-serif" }}>{taxa}%</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${taxa}%`, background: taxa >= 80 ? '#4ade80' : taxa >= 60 ? '#fbbf24' : '#f87171', borderRadius: 99, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#4ade80' }}>{emDiaLocal}</p>
                      <p style={{ fontSize: 8, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif", opacity: 0.7 }}>Em dia</p>
                    </div>
                    <div style={{ flex: 1, background: vencidosLocal > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${vencidosLocal > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: vencidosLocal > 0 ? '#f87171' : 'rgba(255,255,255,0.2)' }}>{vencidosLocal}</p>
                      <p style={{ fontSize: 8, color: vencidosLocal > 0 ? '#f87171' : 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif", opacity: 0.7 }}>Vencidas</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Card Equipa */}
          <div style={{ flexShrink: 0, width: 200, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(192,0,26,0.2)', background: 'linear-gradient(135deg, #1a0509 0%, #2d0a0f 100%)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(192,0,26,0.15)' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: "'Inter', sans-serif" }}>Equipa</p>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 300, marginTop: 2, fontFamily: "'Cormorant Garamond', serif" }}>Eletromedicina ATM</p>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { nome: 'Unidade de Eletromedicina', cargo: 'ATM Manutenção Total',          cor: '#C0001A' },
                { nome: 'Hospital CUF Porto',         cargo: 'Local principal',               cor: '#3b82f6' },
                { nome: 'Gestão de Calibrações',      cargo: `${equipamentos.length} equip.`, cor: '#8b5cf6' },
                { nome: 'ATM Eletromedicina v1.0',    cargo: 'Sistema de gestão',             cor: '#4ade80' },
              ].map(m => (
                <div key={m.nome} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.cor + '18', border: `1px solid ${m.cor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: m.cor, fontFamily: "'Inter', sans-serif" }}>{m.nome[0]}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', fontFamily: "'Inter', sans-serif" }}>{m.nome}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>{m.cargo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card Sistema */}
          <div style={{ flexShrink: 0, width: 200, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg, #0f1629 0%, #141d35 100%)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: "'Inter', sans-serif" }}>Sistema</p>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 300, marginTop: 2, fontFamily: "'Cormorant Garamond', serif" }}>ATM Eletromedicina</p>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'Versão',     valor: 'v1.0',                          cor: '#4ade80' },
                { label: 'Base dados', valor: 'PostgreSQL',                    cor: 'rgba(255,255,255,0.5)' },
                { label: 'Frontend',   valor: 'React + TypeScript',            cor: 'rgba(255,255,255,0.5)' },
                { label: 'Backend',    valor: 'Node.js + Express',             cor: 'rgba(255,255,255,0.5)' },
                { label: 'Deploy',     valor: 'Vercel + Render',               cor: 'rgba(255,255,255,0.5)' },
                { label: 'URL',        valor: 'atm-eletromedicina.vercel.app', cor: 'rgba(255,255,255,0.3)' },
              ].map(info => (
                <div key={info.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: "'Inter', sans-serif", letterSpacing: '0.08em', flexShrink: 0 }}>{info.label}</p>
                  <p style={{ color: info.cor, fontSize: 9, fontWeight: 500, fontFamily: "'Inter', sans-serif", textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.valor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}