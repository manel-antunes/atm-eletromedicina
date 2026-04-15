import { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'
import GraficoCalibracoes from '../components/GraficoCalibracoes'
import logoAtm from '../assets/logo-atm.png'

interface Props {
  equipamentos: Equipamento[]
  onFechar: () => void
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

function useRelogio() {
  const [hora, setHora] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return hora
}

export default function ModoApresentacao({ equipamentos, onFechar }: Props) {
  const hora = useRelogio()
  const [slide, setSlide] = useState(0)

  const estados = equipamentos.map(eq => ({ eq, estado: getEstado(eq) }))
  const vencidos = estados.filter(e => e.estado === 'vencido')
  const urgentes = estados.filter(e => e.estado === 'urgente')
  const avisos   = estados.filter(e => e.estado === 'aviso')
  const emDia    = estados.filter(e => e.estado === 'ok')
  const alertas  = [...vencidos, ...urgentes, ...avisos]

  // auto-avança slides a cada 8 segundos
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % 3), 8000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
      if (e.key === 'ArrowRight') setSlide(s => (s + 1) % 3)
      if (e.key === 'ArrowLeft') setSlide(s => (s + 2) % 3)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const slides = ['kpis', 'alertas', 'grafico']

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: '#080c14',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={logoAtm} alt="ATM" style={{ height: 32, filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 700 }}>Unidade de Eletromedicina</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Gestão de Equipamentos de Teste</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 700, fontFamily: 'monospace', lineHeight: 1 }}>
              {hora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2, textTransform: 'capitalize' }}>
              {hora.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onFechar}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <X size={14} /> Fechar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '32px 40px' }}>

        {/* Slide 0 — KPIs */}
        {slide === 0 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Resumo geral · {equipamentos.length} equipamentos
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, flex: 1 }}>
              {[
                { label: 'Total', valor: equipamentos.length, icon: <Package size={28}/>, bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', cor: '#fff', sub: 'equipamentos registados' },
                { label: 'Em dia', valor: emDia.length, icon: <CheckCircle size={28}/>, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', cor: '#4ade80', sub: `${Math.round((emDia.length/equipamentos.length)*100)}% do total` },
                { label: 'A vencer', valor: avisos.length + urgentes.length, icon: <Clock size={28}/>, bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', cor: '#facc15', sub: 'próximos 60 dias' },
                { label: 'Vencidas', valor: vencidos.length, icon: <AlertTriangle size={28}/>, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', cor: '#f87171', sub: 'requerem ação imediata' },
              ].map(k => (
                <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: k.cor, opacity: 0.6 }}>{k.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</span>
                  </div>
                  <div>
                    <p style={{ color: k.cor, fontSize: 72, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>{k.valor}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 8 }}>{k.sub}</p>
                  </div>
                  {/* Mini barra */}
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${Math.round((k.valor/equipamentos.length)*100)}%`, background: k.cor, borderRadius: 99, opacity: 0.6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slide 1 — Alertas */}
        {slide === 1 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Alertas ativos
              </p>
              <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 99 }}>{alertas.length}</span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>
              {alertas.slice(0, 8).map(({ eq, estado }) => {
                const cores = {
                  vencido: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', cor: '#f87171', dot: '#ef4444', label: 'Vencida' },
                  urgente: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', cor: '#fb923c', dot: '#f97316', label: 'Urgente' },
                  aviso:   { bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.2)',  cor: '#facc15', dot: '#eab308', label: 'Em breve' },
                  ok:      { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',  cor: '#4ade80', dot: '#22c55e', label: 'Em dia' },
                }
                const c = cores[estado]
                const proxima = parseData(eq.dataCalibracao)
                const diff = proxima ? differenceInDays(proxima, new Date()) : null
                return (
                  <div key={eq.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.dot, boxShadow: `0 0 10px ${c.dot}`, flexShrink: 0 }} />
                      <div>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{eq.descricao}</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{eq.marca} {eq.modelo} · {eq.localizacao}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                      <p style={{ color: c.cor, fontSize: 13, fontWeight: 700 }}>
                        {diff === null ? 'Sem data' : diff < 0 ? `Há ${Math.abs(diff)} dias` : `Em ${diff} dias`}
                      </p>
                      <span style={{ background: c.bg, color: c.cor, border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                        {c.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {alertas.length > 8 && (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center' }}>
                + {alertas.length - 8} alertas adicionais
              </p>
            )}
          </div>
        )}

        {/* Slide 2 — Gráfico */}
        {slide === 2 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Previsão de calibrações
            </p>
            <div style={{ flex: 1 }}>
              <GraficoCalibracoes equipamentos={equipamentos} />
            </div>
          </div>
        )}
      </div>

      {/* Footer — navegação */}
      <div style={{ padding: '16px 40px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>← → para navegar · Esc para fechar</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Resumo', 'Alertas', 'Gráfico'].map((label, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              style={{
                background: slide === i ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: `1px solid ${slide === i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                color: slide === i ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: slide === i ? 20 : 6, height: 6, borderRadius: 99, background: slide === i ? '#fff' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}