import { useMemo } from 'react'
import { Brain, AlertTriangle, TrendingUp, Lightbulb, Info, Shield } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { calcularScoreRisco, gerarInsights, calcularPrevisaoMeses } from '../services/iaService'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
}

const nivelConfig = {
  critico: { label: 'Crítico', bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: 'bg-red-100 text-red-700' },
  alto:    { label: 'Alto',    bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', badge: 'bg-orange-100 text-orange-700' },
  medio:   { label: 'Médio',   bg: '#fffbeb', border: '#fef08a', text: '#d97706', badge: 'bg-yellow-100 text-yellow-700' },
  baixo:   { label: 'Baixo',   bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badge: 'bg-green-100 text-green-700' },
}

const insightIcon = {
  alerta:      <AlertTriangle size={14} className="text-red-500" />,
  tendencia:   <TrendingUp size={14} className="text-blue-500" />,
  oportunidade:<Lightbulb size={14} className="text-yellow-500" />,
  info:        <Info size={14} className="text-gray-400" />,
}

const insightBg = {
  alerta:       'bg-red-50 border-red-200',
  tendencia:    'bg-blue-50 border-blue-200',
  oportunidade: 'bg-yellow-50 border-yellow-200',
  info:         'bg-gray-50 border-gray-200',
}

export default function DashboardIA({ equipamentos, onVerDetalhe }: Props) {
  const scores = useMemo(() => equipamentos.map(calcularScoreRisco).sort((a, b) => b.score - a.score), [equipamentos])
  const insights = useMemo(() => gerarInsights(equipamentos), [equipamentos])
  const previsao = useMemo(() => calcularPrevisaoMeses(equipamentos), [equipamentos])

  const criticos = scores.filter(s => s.nivel === 'critico')
  const altos    = scores.filter(s => s.nivel === 'alto')
  const medios   = scores.filter(s => s.nivel === 'medio')
  const baixos   = scores.filter(s => s.nivel === 'baixo')

  const taxaConformidade = Math.round((baixos.length + medios.length) / equipamentos.length * 100)

  const radarData = [
    { categoria: 'Calibrações em dia', valor: Math.round(baixos.length / equipamentos.length * 100) },
    { categoria: 'Com responsável', valor: Math.round(equipamentos.filter(e => e.responsavel && e.responsavel !== '—').length / equipamentos.length * 100) },
    { categoria: 'Com nº série', valor: Math.round(equipamentos.filter(e => e.numeroSerie && e.numeroSerie !== '—').length / equipamentos.length * 100) },
    { categoria: 'Em Eletromedicina', valor: Math.round(equipamentos.filter(e => { const l = e.localizacao?.toLowerCase() ?? ''; return l.includes('hprt') || l.includes('htrd') || l.includes('fixo') }).length / equipamentos.length * 100) },
    { categoria: 'Sem alertas', valor: Math.round((equipamentos.length - criticos.length - altos.length) / equipamentos.length * 100) },
  ]

  return (
    <div className="space-y-6">

      {/* Header IA */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ background: 'rgba(139,92,246,0.2)', borderRadius: 12, padding: 10 }}>
              <Brain size={24} color="#a78bfa" />
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Análise Inteligente</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                Score de risco calculado para {equipamentos.length} equipamentos
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: taxaConformidade >= 80 ? '#4ade80' : taxaConformidade >= 60 ? '#facc15' : '#f87171', fontSize: 36, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>
              {taxaConformidade}%
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>taxa de conformidade</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ marginTop: 16, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${taxaConformidade}%`, background: taxaConformidade >= 80 ? '#4ade80' : taxaConformidade >= 60 ? '#facc15' : '#f87171', borderRadius: 99, transition: 'width 1s ease' }} />
        </div>

        {/* Mini KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Crítico', valor: criticos.length, cor: '#f87171' },
            { label: 'Alto', valor: altos.length, cor: '#fb923c' },
            { label: 'Médio', valor: medios.length, cor: '#facc15' },
            { label: 'Baixo', valor: baixos.length, cor: '#4ade80' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 0' }}>
              <p style={{ color: k.cor, fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>{k.valor}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Insights */}
        <div className="col-span-2 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Insights automáticos</h2>
          {insights.map((insight, i) => (
            <div key={i} className={`rounded-xl border p-4 ${insightBg[insight.tipo]}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{insightIcon[insight.tipo]}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{insight.titulo}</p>
                  <p className="text-xs text-gray-500 mt-1">{insight.descricao}</p>
                  {insight.equipamentos && insight.equipamentos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {insight.equipamentos.slice(0, 3).map(nome => (
                        <span key={nome} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600 truncate max-w-40">
                          {nome}
                        </span>
                      ))}
                      {insight.equipamentos.length > 3 && (
                        <span className="text-xs text-gray-400">+{insight.equipamentos.length - 3} mais</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Radar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gray-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Saúde do inventário</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="categoria" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar name="Score" dataKey="valor" stroke="#C0001A" fill="#C0001A" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Previsão de carga */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Previsão de carga — próximos 12 meses</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={previsao} barSize={20}>
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
         <Tooltip
  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: '#fff' }}
  formatter={(val: unknown) => [`${val} equipamentos`, 'Calibrações']}
/>
            {previsao.map((entry, index) => (
              <Bar key={index} dataKey="total" radius={[4, 4, 0, 0]}>
                {previsao.map((_, i) => (
                  <Cell key={i} fill={i === index ? (entry.total >= 10 ? '#C0001A' : entry.total >= 5 ? '#f97316' : '#22c55e') : '#e2e8f0'} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top equipamentos por risco */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          Ranking de risco — top {Math.min(10, scores.length)} equipamentos
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Equipamento</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Nível</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Fatores</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Recomendação</th>
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 10).map(({ equipamento, score, nivel, fatores, recomendacao }, i) => {
                const cfg = nivelConfig[nivel]
                return (
                  <tr
                    key={equipamento.id}
                    onClick={() => onVerDetalhe(equipamento)}
                    className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{equipamento.descricao}</p>
                      <p className="text-xs text-gray-400">{equipamento.marca} {equipamento.modelo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${score}%`, background: score >= 70 ? '#dc2626' : score >= 45 ? '#f97316' : score >= 20 ? '#eab308' : '#22c55e' }}
                          />
                        </div>
                        <span className="text-xs font-bold font-mono" style={{ color: cfg.text }}>{score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-48">
                      {fatores.slice(0, 2).map((f, fi) => (
                        <p key={fi} className="truncate">· {f}</p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-40 truncate">{recomendacao}</td>
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