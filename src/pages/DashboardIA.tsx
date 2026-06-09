import { useMemo } from 'react'
import { Brain, AlertTriangle, TrendingUp, Lightbulb, Info, Shield, ChevronRight } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { calcularScoreRisco, gerarInsights, calcularPrevisaoMeses } from '../services/iaService'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
}

const nivelConfig = {
  critico: { label: 'Crítico', cor: '#dc2626', bg: '#fef2f2', badge: 'bg-red-100 text-red-700', barra: '#dc2626' },
  alto:    { label: 'Alto',    cor: '#ea580c', bg: '#fff7ed', badge: 'bg-orange-100 text-orange-700', barra: '#f97316' },
  medio:   { label: 'Médio',   cor: '#d97706', bg: '#fffbeb', badge: 'bg-yellow-100 text-yellow-700', barra: '#eab308' },
  baixo:   { label: 'Baixo',   cor: '#16a34a', bg: '#f0fdf4', badge: 'bg-green-100 text-green-700', barra: '#22c55e' },
}

const insightCfg = {
  alerta:       { icon: <AlertTriangle size={15} />, iconCor: '#dc2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.15)' },
  tendencia:    { icon: <TrendingUp size={15} />,    iconCor: '#2563eb', bg: 'rgba(37,99,235,0.06)',  border: 'rgba(37,99,235,0.15)' },
  oportunidade: { icon: <Lightbulb size={15} />,     iconCor: '#d97706', bg: 'rgba(217,119,6,0.06)',  border: 'rgba(217,119,6,0.15)' },
  info:         { icon: <Info size={15} />,           iconCor: '#64748b', bg: 'rgba(100,116,139,0.06)',border: 'rgba(100,116,139,0.15)' },
}

const CustomTooltipBarra = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px' }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{payload[0].value} calibrações</p>
    </div>
  )
}

export default function DashboardIA({ equipamentos, onVerDetalhe }: Props) {
  const scores  = useMemo(() => equipamentos.map(calcularScoreRisco).sort((a, b) => b.score - a.score), [equipamentos])
  const insights = useMemo(() => gerarInsights(equipamentos), [equipamentos])
  const previsao = useMemo(() => calcularPrevisaoMeses(equipamentos), [equipamentos])

  const criticos = scores.filter(s => s.nivel === 'critico')
  const altos    = scores.filter(s => s.nivel === 'alto')
  const medios   = scores.filter(s => s.nivel === 'medio')
  const baixos   = scores.filter(s => s.nivel === 'baixo')

  const taxaConformidade = Math.round((baixos.length + medios.length) / equipamentos.length * 100)
  const maxPrevisao = Math.max(...previsao.map(p => p.total), 1)

  const radarData = [
    { categoria: 'Calibrações em dia', valor: Math.round(baixos.length / equipamentos.length * 100) },
    { categoria: 'Com responsável', valor: Math.round(equipamentos.filter(e => e.responsavel && e.responsavel !== '—').length / equipamentos.length * 100) },
    { categoria: 'Com nº série', valor: Math.round(equipamentos.filter(e => e.numeroSerie && e.numeroSerie !== '—' && e.numeroSerie !== '-').length / equipamentos.length * 100) },
    { categoria: 'Em Eletromedicina', valor: Math.round(equipamentos.filter(e => { const l = e.localizacao?.toLowerCase() ?? ''; return l.includes('hprt') || l.includes('htrd') || l.includes('fixo') }).length / equipamentos.length * 100) },
    { categoria: 'Sem risco alto', valor: Math.round((equipamentos.length - criticos.length - altos.length) / equipamentos.length * 100) },
  ]

  return (
    <div className="space-y-5">

      {/* Header escuro */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', padding: '24px 28px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div style={{ background: 'rgba(139,92,246,0.15)', padding: 12, border: '1px solid rgba(139,92,246,0.2)' }}>
              <Brain size={22} color="#a78bfa" />
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>Análise Inteligente de Risco</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }}>
                Modelo de risco calculado para {equipamentos.length} equipamentos · Atualizado agora
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: taxaConformidade >= 80 ? '#4ade80' : taxaConformidade >= 60 ? '#facc15' : '#f87171', fontSize: 40, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>
              {taxaConformidade}%
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
              taxa de conformidade
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            height: '100%',
            width: `${taxaConformidade}%`,
            background: taxaConformidade >= 80 ? 'linear-gradient(90deg,#16a34a,#4ade80)' : taxaConformidade >= 60 ? 'linear-gradient(90deg,#d97706,#facc15)' : 'linear-gradient(90deg,#dc2626,#f87171)',
            transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Crítico', valor: criticos.length, cor: '#f87171', glow: 'rgba(248,113,113,0.2)' },
            { label: 'Alto',    valor: altos.length,    cor: '#fb923c', glow: 'rgba(251,146,60,0.2)' },
            { label: 'Médio',   valor: medios.length,   cor: '#facc15', glow: 'rgba(250,204,21,0.2)' },
            { label: 'Baixo',   valor: baixos.length,   cor: '#4ade80', glow: 'rgba(74,222,128,0.2)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 0', textAlign: 'center' }}>
              <p style={{ color: k.cor, fontSize: 28, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1, textShadow: `0 0 20px ${k.glow}` }}>{k.valor}</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights + Radar */}
      <div className="grid grid-cols-3 gap-4">

        <div className="col-span-2 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Insights automáticos</p>
          {insights.map((insight, i) => {
            const cfg = insightCfg[insight.tipo]
            return (
              <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '12px 16px' }}>
                <div className="flex items-start gap-3">
                  <div style={{ color: cfg.iconCor, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{insight.titulo}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.descricao}</p>
                    {insight.equipamentos && insight.equipamentos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {insight.equipamentos.slice(0, 3).map(nome => (
                          <span key={nome} className="text-xs bg-white border border-gray-200 px-2 py-0.5 text-gray-600 truncate max-w-xs">
                            {nome}
                          </span>
                        ))}
                        {insight.equipamentos.length > 3 && (
                          <span className="text-xs text-gray-400 py-0.5">+{insight.equipamentos.length - 3} mais</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Radar */}
        <div className="bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={13} className="text-gray-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Saúde do inventário</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#f1f5f9" strokeWidth={1} />
              <PolarAngleAxis dataKey="categoria" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 500 }} />
              <Radar name="Score" dataKey="valor" stroke="#C0001A" fill="#C0001A" fillOpacity={0.12} strokeWidth={2} dot={{ fill: '#C0001A', r: 3 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {radarData.map(r => (
              <div key={r.categoria} className="flex items-center justify-between">
                <span className="text-xs text-gray-400 truncate max-w-32">{r.categoria}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-gray-100 overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: `${r.valor}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 w-8 text-right">{r.valor}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de previsão */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Previsão de carga</p>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginTop: 2 }}>Próximos 12 meses</p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: 'Alto (≥10)', cor: '#C0001A' },
              { label: 'Médio (≥5)', cor: '#f97316' },
              { label: 'Normal', cor: '#22c55e' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, background: l.cor }} />
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={previsao} barSize={28} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              domain={[0, maxPrevisao + 1]}
            />
            <Tooltip content={<CustomTooltipBarra />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {previsao.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.total >= 10 ? '#C0001A' : entry.total >= 5 ? '#f97316' : '#22c55e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          Ranking de risco — top {Math.min(10, scores.length)} equipamentos
        </p>
        <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['#', 'Equipamento', 'Score de risco', 'Nível', 'Principais fatores', 'Recomendação', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 10).map(({ equipamento, score, nivel, fatores, recomendacao }, i) => {
                const cfg = nivelConfig[nivel]
                return (
                  <tr key={equipamento.id} onClick={() => onVerDetalhe(equipamento)} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 text-xs font-mono text-gray-300 w-8">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{equipamento.descricao}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{equipamento.marca} {equipamento.modelo} · {equipamento.numeroSAP}</p>
                    </td>
                    <td className="px-4 py-3 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden">
                          <div className="h-full transition-all" style={{ width: `${score}%`, background: cfg.barra }} />
                        </div>
                        <span className="text-xs font-bold w-6 text-right" style={{ color: cfg.cor }}>{score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      {fatores.slice(0, 2).map((f, fi) => (
                        <p key={fi} className="text-xs text-gray-500 truncate">· {f}</p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-40 truncate">{recomendacao}</td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
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