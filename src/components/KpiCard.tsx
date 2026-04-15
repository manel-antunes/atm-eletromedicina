import { useContador } from '../hooks/useContador'

interface Props {
  label: string
  valor: number
  sub: string
  icon: React.ReactNode
  bg: string
  border: string
  iconBg: string
  iconCor: string
  valCor: string
  subCor: string
  labelCor: string
  delay: string
  progresso?: number
  progressoCor?: string
}

export default function KpiCard({ label, valor, sub, icon, bg, border, iconBg, iconCor, valCor, subCor, labelCor, delay, progresso, progressoCor }: Props) {
  const contado = useContador(valor)

  return (
    <div
      className={`anim-fade-up ${delay}`}
      style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ background: iconBg, borderRadius: 10, padding: 8, color: iconCor, display: 'flex' }}>
          {icon}
        </div>
        <span style={{ color: labelCor, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      </div>

      <p style={{ color: valCor, fontSize: 30, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>
        {contado}
      </p>
      <p style={{ color: subCor, fontSize: 11, marginTop: 6 }}>{sub}</p>

      {/* Barra de progresso */}
      {progresso !== undefined && (
        <div style={{ marginTop: 12, height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progresso}%`,
              background: progressoCor ?? valCor,
              borderRadius: 99,
              transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      )}
    </div>
  )
}