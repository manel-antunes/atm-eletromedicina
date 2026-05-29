import { useContador } from '../hooks/useContador'

interface Props {
  label: string
  valor: number
  sub: string
  icon: React.ReactNode
  delay: string
  progresso?: number
  progressoCor?: string
  destaque?: boolean  // true = vermelho ATM (vencidas)
  estado?: 'ok' | 'aviso' | 'vencido' | 'neutro'
}

const estadoCores = {
  ok:      { val: '#ffffff', sub: 'rgba(255,255,255,0.4)', accent: '#4ade80', bar: '#4ade80' },
  aviso:   { val: '#ffffff', sub: 'rgba(255,255,255,0.4)', accent: '#fbbf24', bar: '#fbbf24' },
  vencido: { val: '#ff4444', sub: 'rgba(255,68,68,0.6)',   accent: '#C0001A', bar: '#C0001A' },
  neutro:  { val: '#ffffff', sub: 'rgba(255,255,255,0.4)', accent: 'rgba(255,255,255,0.2)', bar: 'rgba(255,255,255,0.25)' },
}

export default function KpiCard({ label, valor, sub, icon, delay, progresso, progressoCor, estado = 'neutro' }: Props) {
  const contado = useContador(valor)
  const cores = estadoCores[estado]

  return (
    <div
      className={`anim-fade-up ${delay}`}
      style={{
        background: estado === 'vencido'
          ? 'linear-gradient(135deg, #1a0509 0%, #2d0a0f 100%)'
          : 'linear-gradient(135deg, #0f1629 0%, #141d35 100%)',
        border: `1px solid ${estado === 'vencido' ? 'rgba(192,0,26,0.3)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Linha de acento no topo */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: cores.accent,
        opacity: estado === 'neutro' ? 0.3 : 0.8,
      }} />

      {/* Header: ícone + label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          color: cores.accent,
          opacity: 0.85,
          display: 'flex',
        }}>
          {icon}
        </div>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          color: 'rgba(255,255,255,0.35)',
          fontSize: 9,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
        }}>
          {label}
        </span>
      </div>

      {/* Valor principal em Cormorant */}
      <p style={{
        fontFamily: "'Cormorant Garamond', serif",
        color: cores.val,
        fontSize: 48,
        fontWeight: 300,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        marginBottom: 4,
      }}>
        {contado}
      </p>

      {/* Sub-label */}
      <p style={{
        fontFamily: "'Inter', sans-serif",
        color: cores.sub,
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: '0.04em',
        marginBottom: progresso !== undefined ? 14 : 0,
      }}>
        {sub}
      </p>

      {/* Barra de progresso */}
      {progresso !== undefined && (
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progresso}%`,
            background: progressoCor ?? cores.bar,
            borderRadius: 99,
            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
      )}
    </div>
  )
}