import { useState } from 'react'
import { Search, ArrowLeftRight } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
  onNavegar?: (pagina: string) => void
}

interface Cedencia {
  id: number
  equipamentoId: number
  destino: string
  ativa: boolean
}

function getCedenciaAtiva(equipamentoId: number): Cedencia | null {
  try {
    const ceds: Cedencia[] = JSON.parse(localStorage.getItem('atm_cedencias') ?? '[]')
    return ceds.find(c => c.equipamentoId === equipamentoId && c.ativa) ?? null
  } catch { return null }
}

export default function Inventario({ equipamentos, onVerDetalhe, onNavegar }: Props) {
  const [pesquisa, setPesquisa] = useState('')
  const [filtroLoc, setFiltroLoc] = useState<'todos' | 'eletromedicina' | 'outro'>('todos')

  const filtrados = equipamentos.filter(eq => {
    const termo = pesquisa.toLowerCase()
    const correspondePesquisa =
      eq.descricao.toLowerCase().includes(termo) ||
      eq.marca.toLowerCase().includes(termo) ||
      eq.modelo.toLowerCase().includes(termo) ||
      eq.numeroSAP.toLowerCase().includes(termo) ||
      eq.numeroSerie.toLowerCase().includes(termo)

    const loc = eq.localizacao?.toLowerCase() ?? ''
    const correspondeLocal =
      filtroLoc === 'todos' ||
      (filtroLoc === 'eletromedicina' && (loc.includes('hprt') || loc.includes('htrd') || loc.includes('fixo') || loc.includes('cins') || loc.includes('móvel') || loc.includes('movel'))) ||
      (filtroLoc === 'outro' && !loc.includes('hprt') && !loc.includes('htrd') && !loc.includes('fixo') && !loc.includes('cins') && !loc.includes('móvel') && !loc.includes('movel'))

    return correspondePesquisa && correspondeLocal
  })

  const emEletro = equipamentos.filter(eq => {
    const loc = eq.localizacao?.toLowerCase() ?? ''
    return loc.includes('hprt') || loc.includes('htrd') || loc.includes('fixo') || loc.includes('cins') || loc.includes('móvel') || loc.includes('movel')
  }).length

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-sky-400">
          <p className="text-2xl font-bold font-mono text-sky-500">{equipamentos.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total inventário</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-green-400">
          <p className="text-2xl font-bold font-mono text-green-600">{emEletro}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Em Eletromedicina</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-orange-400">
          <p className="text-2xl font-bold font-mono text-orange-500">{equipamentos.length - emEletro}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Cedidos / Outro local</p>
        </div>
      </div>

      {/* Pesquisa e filtros */}
      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 flex-1">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar por descrição, marca, modelo, Nº SAP, Nº série..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2">
          {([
            { id: 'todos', label: 'Todos' },
            { id: 'eletromedicina', label: 'Eletromedicina' },
            { id: 'outro', label: 'Outro local' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFiltroLoc(f.id)}
              className={`px-3 py-2 text-xs font-semibold border transition-all ${
                filtroLoc === f.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">{filtrados.length} equipamento(s)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nº SAP</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Marca / Modelo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nº Série</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Localização</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Obs</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhum equipamento encontrado
                </td>
              </tr>
            ) : (
              filtrados.map(eq => {
                const loc = eq.localizacao?.toLowerCase() ?? ''
                const emEletroLoc = loc.includes('hprt') || loc.includes('fixo') || loc.includes('eletro')
                const cedencia = getCedenciaAtiva(eq.id)
                return (
                  <tr key={eq.id} onClick={() => onVerDetalhe(eq)} className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{eq.numeroSAP}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 text-xs max-w-48">
                      <div className="flex items-center gap-2">
                        <p className="truncate">{eq.descricao}</p>
                        {cedencia && (
                          <button
                            onClick={e => { e.stopPropagation(); onNavegar?.('cedencias') }}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 9, fontWeight: 700, padding: '2px 6px', flexShrink: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            <ArrowLeftRight size={9} />
                            Cedido
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{eq.marca} {eq.modelo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{eq.numeroSerie || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{eq.responsavel || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 font-semibold ${
                        cedencia
                          ? 'bg-orange-50 text-orange-700'
                          : emEletroLoc
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-50 text-gray-600'
                      }`}>
                        {cedencia ? cedencia.destino : (eq.localizacao || '—')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-40 truncate">{eq.obs || '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}