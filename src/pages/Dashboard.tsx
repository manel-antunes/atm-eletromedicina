import { AlertTriangle, CheckCircle, Clock, Package, QrCode, Stethoscope, ChevronRight } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays } from 'date-fns'
import { useRef, useEffect, useState } from 'react'
import GraficoCalibracoes from '../components/GraficoCalibracoes'
import KpiCard from '../components/KpiCard'
import { SkeletonKpis, SkeletonTabela, SkeletonLine } from '../components/Skeleton'
import { API_URL } from '../config'
import { parseData } from '../utils/dateUtils'
import { getEstado } from '../utils/equipamentoUtils'
import { useIsMobile } from '../hooks/useIsMobile'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
  onNavegar?: (pagina: string) => void
  loading?: boolean
}

interface PreventivaEq {
  id: number
  nome: string
  localizacao: string
  concluido: boolean
  cod_ativo: string
}

function getToken() { return localStorage.getItem('atm_token') ?? '' }

function formatarData(dataStr: string): string {
  if (!dataStr || dataStr === 'undefined') return '—'
  const data = parseData(dataStr)
  if (!data) return '—'
  return data.toLocaleDateString('pt-PT')
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
  vencido: { label: 'Vencida',  bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700',   dotColor: '#ef4444' },
  urgente: { label: 'Urgente',  bg: 'bg-orange-50', text: 'text-orange-700',border: 'border-orange-200',dot: 'bg-orange-500',badge: 'bg-orange-100 text-orange-700',dotColor: '#f97316' },
  aviso:   { label: 'Em breve', bg: 'bg-yellow-50', text: 'text-yellow-700',border: 'border-yellow-200',dot: 'bg-yellow-400',badge: 'bg-yellow-100 text-yellow-700',dotColor: '#eab308' },
  ok:      { label: 'Em dia',   bg: 'bg-green-50',  text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700', dotColor: '#22c55e' },
}

function SkeletonGrafico() {
  return (
    <div style={{ background: '#0f172a', padding: '20px 24px' }}>
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
      <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-end', padding: '16px', gap: 4, overflow: 'hidden' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', height: `${40 + (i % 5) * 12}%`, animation: 'skeleton-shimmer 1.4s ease-in-out infinite', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 75%)', backgroundSize: '200% 100%' }} />
        ))}
      </div>
    </div>
  )
}

function SkeletonAlertas() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #f1f5f9' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f1f5f9', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonLine width="50%" height={12} />
            <SkeletonLine width="70%" height={10} />
          </div>
          <SkeletonLine width={60} height={22} />
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ equipamentos, onVerDetalhe, onNavegar, loading = false }: Props) {
  const isMobile = useIsMobile()
  const estados = equipamentos.map(eq => ({ eq, estado: getEstado(eq) }))
  const vencidos = estados.filter(e => e.estado === 'vencido')
  const urgentes = estados.filter(e => e.estado === 'urgente')
  const avisos   = estados.filter(e => e.estado === 'aviso')
  const emDia    = estados.filter(e => e.estado === 'ok')
  const alertas  = [...vencidos, ...urgentes, ...avisos]

  const cedenciasAtrasadas = (() => {
    try {
      const ceds = JSON.parse(localStorage.getItem('atm_cedencias') ?? '[]')
      return ceds.filter((c: { ativa: boolean; dataRetornoPrevista: string }) =>
        c.ativa && new Date(c.dataRetornoPrevista) < new Date()
      )
    } catch { return [] }
  })()

  // ─── Preventivas deste mês ───────────────────────────────────────────────
  const [preventivas, setPreventivas] = useState<PreventivaEq[]>([])
  const [loadingPrev, setLoadingPrev] = useState(true)
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  useEffect(() => {
    fetch(`${API_URL}/api/preventivas/${mesAtual}/${anoAtual}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(dados => setPreventivas(dados))
      .catch(() => setPreventivas([]))
      .finally(() => setLoadingPrev(false))
  }, [])

  const prevTotal = preventivas.length
  const prevConcluidos = preventivas.filter(p => p.concluido).length
  const prevPendentes = prevTotal - prevConcluidos
  const prevPct = prevTotal > 0 ? Math.round((prevConcluidos / prevTotal) * 100) : 0

  // ─── Scroll horizontal ───────────────────────────────────────────────────
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

  if (loading) {
    return (
      <div className="space-y-4">
        <style>{`@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <SkeletonKpis />
        <SkeletonGrafico />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <SkeletonLine width={100} height={10} />
            <SkeletonLine width={24} height={20} />
          </div>
          <SkeletonAlertas />
        </div>
        <SkeletonTabela linhas={5} />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── KPIs ── */}
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

      {/* ── Gráfico ── */}
      <div className="anim-fade-up delay-5">
        <GraficoCalibracoes equipamentos={equipamentos} />
      </div>

      {/* ── Preventivas + QR Codes ── */}
<div className="anim-fade-up delay-6" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 12, alignItems: 'start' }}>

        {/* Preventivas deste mês */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1a0a0f 100%)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Stethoscope size={15} color="rgba(255,255,255,0.7)" />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>Manutenções Preventivas</p>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '1px 0 0' }}>{MESES_PT[mesAtual - 1]} {anoAtual}</p>
              </div>
            </div>
            {onNavegar && (
<button
  onClick={() => onNavegar('preventivas')}
  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
>
  Ver tudo <ChevronRight size={11} />
</button>
            )}
          </div>

          {/* Barra de progresso */}
          {prevTotal > 0 && (
            <div style={{ padding: '10px 18px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Progresso do mês</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: prevPct === 100 ? '#16a34a' : prevPct > 60 ? '#d97706' : '#C0001A' }}>{prevConcluidos}/{prevTotal} · {prevPct}%</span>
              </div>
              <div style={{ height: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${prevPct}%`, background: prevPct === 100 ? '#16a34a' : prevPct > 60 ? '#f59e0b' : '#C0001A', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}

          {/* Conteúdo */}
          <div style={{ padding: '10px 18px 14px' }}>
            {loadingPrev ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[1,2,3].map(i => <SkeletonLine key={i} width="100%" height={32} />)}
              </div>
            ) : prevTotal === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                <Stethoscope size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: 12, margin: 0 }}>Sem plano importado para este mês</p>
                {onNavegar && (
                  <button onClick={() => onNavegar('preventivas')} style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: '#C0001A', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Importar plano →
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Stats rápidas */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Concluídos', valor: prevConcluidos, cor: '#16a34a', bg: '#f0fdf4' },
                    { label: 'Pendentes',  valor: prevPendentes,  cor: prevPendentes > 0 ? '#C0001A' : '#94a3b8', bg: prevPendentes > 0 ? '#fff5f5' : '#f8fafc' },
                    { label: 'Total',      valor: prevTotal,       cor: '#475569', bg: '#f8fafc' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: s.bg, border: `1px solid ${s.bg === '#f0fdf4' ? '#bbf7d0' : s.bg === '#fff5f5' ? '#fecaca' : '#e2e8f0'}`, padding: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: s.cor, fontFamily: 'Noto Sans', margin: 0, lineHeight: 1 }}>{s.valor}</p>
                      <p style={{ fontSize: 9, color: s.cor, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '3px 0 0', opacity: 0.7 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Lista dos primeiros pendentes */}
                {prevPendentes > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 4px' }}>Por concluir</p>
                    {preventivas.filter(p => !p.concluido).slice(0, 4).map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#fafafa', border: '1px solid #f1f5f9' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0001A', flexShrink: 0 }} className="dot-piscar" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.localizacao}</p>
                        </div>
                        <span style={{ fontSize: 9, fontFamily: 'Noto Sans', color: '#cbd5e1', flexShrink: 0 }}>{p.cod_ativo}</span>
                      </div>
                    ))}
                    {prevPendentes > 4 && (
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', textAlign: 'center' }}>
                        +{prevPendentes - 4} mais pendentes
                      </p>
                    )}
                  </div>
                )}

                {prevPendentes === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <CheckCircle size={14} color="#16a34a" />
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', margin: 0 }}>Todas as preventivas concluídas!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* QR Codes — atalho */}
        <div
          onClick={() => onNavegar?.('qrcodes')}
          style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1a0509 60%, #C0001A 100%)', border: '1px solid rgba(192,0,26,0.3)', overflow: 'hidden', cursor: onNavegar ? 'pointer' : 'default', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',}}
          onMouseEnter={e => { if (onNavegar) (e.currentTarget as HTMLElement).style.opacity = '0.92' }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          {/* Grid decorativo */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}>
            <defs>
              <pattern id="qr-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#fff" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#qr-grid)" />
          </svg>

          <div style={{ position: 'relative', padding: '18px 18px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QrCode size={18} color="#fff" />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>Acesso rápido</p>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '1px 0 0' }}>QR Codes</p>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '0 0 12px', lineHeight: 1.5 }}>
              Gera e consulta os QR codes de cada equipamento. Acesso direto à ficha pública.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: 'Noto Sans', margin: 0, lineHeight: 1 }}>{equipamentos.length}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '2px 0 0' }}>equipamentos</p>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 4 }}>
                Abrir <ChevronRight size={12} />
              </div>
            </div>
          </div>

          {/* Linha vermelha em baixo */}
          <div style={{ height: 3, background: '#C0001A', marginTop: 18 }} />
        </div>
      </div>

      {/* ── Alertas cedências atrasadas ── */}
      {cedenciasAtrasadas.length > 0 && (
        <div className="mb-2">
          {cedenciasAtrasadas.map((c: { id: number; equipamentoNome: string; destino: string; dataRetornoPrevista: string }) => (
            <div key={c.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#9a3412', fontSize: 13, fontWeight: 700 }}>{c.equipamentoNome}</p>
                  <p style={{ color: '#ea580c', fontSize: 11, marginTop: 2, opacity: 0.7 }}>Cedido a {c.destino} — retorno: {new Date(c.dataRetornoPrevista).toLocaleDateString('pt-PT')}</p>
                </div>
              </div>
              <span style={{ background: '#ffedd5', color: '#9a3412', fontSize: 10, fontWeight: 700, padding: '3px 10px' }}>Retorno atrasado</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Alertas calibrações ── */}
      {alertas.length > 0 && (
        <div className="anim-fade-up delay-7">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Alertas ativos</h2>
            <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5">{alertas.length}</span>
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
                  style={{ background: c.bg, border: `1px solid ${c.border}`, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}
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
                    <span style={{ background: c.badge.bg, color: c.badge.color, fontSize: 10, fontWeight: 700, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Scroll horizontal — Unidade ── */}
{/* ── Scroll horizontal — Unidade ── */}
<div className="anim-fade-up">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Unidade de Eletromedicina</h2>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1fr'
, gap: 12 }}>

    <div style={{ overflow: 'hidden', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            <div style={{ background: '#C0001A', padding: '12px 16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estatísticas</p>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 2 }}>Resumo da Unidade</p>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total equipamentos',   valor: equipamentos.length,                                            cor: '#38bdf8' },
                { label: 'Taxa de conformidade', valor: `${Math.round((emDia.length / equipamentos.length) * 100)}%`, cor: '#4ade80' },
                { label: 'Calibrações vencidas', valor: vencidos.length,                                               cor: '#f87171' },
                { label: 'A vencer em 30 dias',  valor: urgentes.length,                                               cor: '#fb923c' },
                { label: 'A vencer em 60 dias',  valor: avisos.length,                                                 cor: '#facc15' },
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{stat.label}</p>
                  <p style={{ color: stat.cor, fontSize: 14, fontWeight: 800, fontFamily: 'Noto Sans' }}>{stat.valor}</p>
                </div>
              ))}
            </div>
          </div>

          {[
            { nome: 'Hospital CUF Porto',    sigla: 'HPRT', morada: 'Estr. Circunvalação 14341, Porto', cor: '#3b82f6' },
            { nome: 'Hospital CUF Trindade', sigla: 'HTRD', morada: 'R. da Trindade, Porto',            cor: '#8b5cf6' },
            { nome: 'Instituto CUF Porto',   sigla: 'CINS', morada: 'Matosinhos, Porto',                cor: '#06b6d4' },
          ].map(local => {
            const eqLocal = equipamentos.filter(eq => (eq.localizacao ?? '').toUpperCase().includes(local.sigla))
            const vencidosLocal = eqLocal.filter(eq => { const p = parseData(eq.dataCalibracao); return !p || differenceInDays(p, new Date()) < 0 }).length
            const emDiaLocal = eqLocal.length - vencidosLocal
            const taxa = eqLocal.length > 0 ? Math.round((emDiaLocal / eqLocal.length) * 100) : 0
            return (
              <div key={local.sigla} className="flex-shrink-0 w-56 overflow-hidden shadow-sm border border-gray-100 bg-white">
                <div style={{ background: local.cor, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{local.nome}</p>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px' }}>{local.sigla}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 3 }}>{local.morada}</p>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Noto Sans', color: '#0f172a' }}>{eqLocal.length}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>equipamentos</p>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Conformidade</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: taxa >= 80 ? '#22c55e' : taxa >= 60 ? '#eab308' : '#ef4444' }}>{taxa}%</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${taxa}%`, background: taxa >= 80 ? '#22c55e' : taxa >= 60 ? '#eab308' : '#ef4444' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1, background: '#f0fdf4', padding: '6px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#16a34a', fontFamily: 'Noto Sans' }}>{emDiaLocal}</p>
                      <p style={{ fontSize: 9, color: '#16a34a', textTransform: 'uppercase' }}>Em dia</p>
                    </div>
                    <div style={{ flex: 1, background: vencidosLocal > 0 ? '#fef2f2' : '#f8fafc', padding: '6px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: vencidosLocal > 0 ? '#dc2626' : '#94a3b8', fontFamily: 'Noto Sans' }}>{vencidosLocal}</p>
                      <p style={{ fontSize: 9, color: vencidosLocal > 0 ? '#dc2626' : '#94a3b8', textTransform: 'uppercase' }}>Vencidas</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex-shrink-0 w-56 overflow-hidden shadow-sm border border-gray-100 bg-white">
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

          <div className="flex-shrink-0 w-56 overflow-hidden shadow-sm border border-gray-100" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
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