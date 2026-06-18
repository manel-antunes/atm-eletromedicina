import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, addMonths, startOfMonth, format } from 'date-fns'
import { parseData } from '../utils/dateUtils'
import { pt } from 'date-fns/locale'

interface Props {
  equipamentos: Equipamento[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const total = payload.reduce((acc: number, p: any) => acc + (p.value || 0), 0)
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '12px 16px',
      backdropFilter: 'blur(10px)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </p>
      {payload.map((p: any) => p.value > 0 && (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.stroke }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{p.name}</span>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginLeft: 'auto', paddingLeft: 16 }}>{p.value}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Total</span>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{total}</span>
      </div>
    </div>
  )
}

export default function GraficoCalibracoes({ equipamentos }: Props) {
  const hoje = new Date()

  const dados = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const mes = addMonths(hoje, i - 2)
      const inicio = startOfMonth(mes)
      const fim = startOfMonth(addMonths(mes, 1))

      const equip = equipamentos.filter(eq => {
        const proxima = parseData(eq.dataCalibracao)
        return proxima && proxima >= inicio && proxima < fim
      })

      return {
        mes: format(mes, 'MMM yy', { locale: pt }),
        isAtual: i === 2,
        vencidas: equip.filter(eq => differenceInDays(parseData(eq.dataCalibracao)!, hoje) < 0).length,
        urgentes: equip.filter(eq => { const d = differenceInDays(parseData(eq.dataCalibracao)!, hoje); return d >= 0 && d <= 30 }).length,
        emBreve:  equip.filter(eq => { const d = differenceInDays(parseData(eq.dataCalibracao)!, hoje); return d > 30 && d <= 60 }).length,
        emDia:    equip.filter(eq => differenceInDays(parseData(eq.dataCalibracao)!, hoje) > 60).length,
        total:    equip.length,
      }
    })
  }, [equipamentos])

  const stats = [
    { label: 'Este mês', valor: dados[2]?.total ?? 0, cor: '#fff' },
    { label: 'Próx. 30 dias', valor: dados.slice(2,4).reduce((a,d) => a + d.total, 0), cor: '#f97316' },
    { label: 'Próx. 3 meses', valor: dados.slice(2,5).reduce((a,d) => a + d.total, 0), cor: '#eab308' },
    { label: 'Próx. 6 meses', valor: dados.slice(2,8).reduce((a,d) => a + d.total, 0), cor: '#22c55e' },
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '24px 24px 16px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Calibrações por mês
          </p>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
            {dados.slice(2).reduce((a,d) => a + d.total, 0)} calibrações previstas
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
            Próximos 12 meses
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Vencida', color: '#ef4444' },
            { label: 'Urgente', color: '#f97316' },
            { label: 'Em breve', color: '#eab308' },
            { label: 'Em dia', color: '#22c55e' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 500 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={dados} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradVencidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gradUrgentes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gradEmBreve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gradEmDia" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="vencidas" name="Vencida" stroke="#ef4444" strokeWidth={2} fill="url(#gradVencidas)" dot={false} activeDot={{ r: 4, fill: '#ef4444' }} />
          <Area type="monotone" dataKey="urgentes" name="Urgente" stroke="#f97316" strokeWidth={2} fill="url(#gradUrgentes)" dot={false} activeDot={{ r: 4, fill: '#f97316' }} />
          <Area type="monotone" dataKey="emBreve"  name="Em breve" stroke="#eab308" strokeWidth={2} fill="url(#gradEmBreve)"  dot={false} activeDot={{ r: 4, fill: '#eab308' }} />
          <Area type="monotone" dataKey="emDia"    name="Em dia"   stroke="#22c55e" strokeWidth={2} fill="url(#gradEmDia)"    dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginTop: 20,
        paddingTop: 20,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Noto Sans', color: s.cor }}>{s.valor}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}