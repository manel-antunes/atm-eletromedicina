import { useState, useRef } from 'react'
import { CheckCircle, Upload, X, Search, Loader, History } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays } from 'date-fns'
import { parseData } from '../utils/dateUtils'
import { getEstado } from '../utils/equipamentoUtils'
import { API_URL } from '../config'
import { authFetch } from '../services/authFetch'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

interface EntradaHistorico {
  id: number
  data_calibracao: string
  tecnico: string
  entidade: string
  observacoes?: string
  relatorio?: string
  aprovado_por?: string
}

interface Props {
  equipamentos: Equipamento[]
  onAtualizar: (equipamentos: Equipamento[]) => void
  onVerDetalhe: (eq: Equipamento) => void
}

const estadoConfig = {
  vencido: { label: 'Vencida',  badge: 'bg-red-100 text-red-700',       dotColor: '#ef4444' },
  urgente: { label: 'Urgente',  badge: 'bg-orange-100 text-orange-700', dotColor: '#f97316' },
  aviso:   { label: 'Em breve', badge: 'bg-yellow-100 text-yellow-700', dotColor: '#eab308' },
  ok:      { label: 'Em dia',   badge: 'bg-green-100 text-green-700',   dotColor: '#22c55e' },
}

export default function Calibracoes({ equipamentos, onAtualizar, onVerDetalhe }: Props) {
  const [modalAberto, setModalAberto]         = useState(false)
  const [equipSelecionado, setEquipSelecionado] = useState<Equipamento | null>(null)
  const [ficheiro, setFicheiro]               = useState<File | null>(null)
  const [form, setForm]                       = useState({ data: '', tecnico: '', entidade: '', observacoes: '', aprovadoPor: '' })
  const [assinado, setAssinado]               = useState(false)
  const [erro, setErro]                       = useState('')
  const [sucesso, setSucesso]                 = useState(false)
  const [historico, setHistorico]             = useState<EntradaHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [filtro, setFiltro]                   = useState<'todos' | 'vencido' | 'urgente' | 'aviso' | 'ok'>('todos')
  const [pesquisa, setPesquisa]               = useState('')
  const [expandida, setExpandida]             = useState(false)
  const [ordenacao, setOrdenacao]             = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'estado', direcao: 'asc' })
  const inputRef = useRef<HTMLInputElement>(null)

  const equipComEstado = equipamentos.map(eq => ({ eq, estado: getEstado(eq) }))

  const counts = {
    todos:   equipamentos.length,
    vencido: equipComEstado.filter(e => e.estado === 'vencido').length,
    urgente: equipComEstado.filter(e => e.estado === 'urgente').length,
    aviso:   equipComEstado.filter(e => e.estado === 'aviso').length,
    ok:      equipComEstado.filter(e => e.estado === 'ok').length,
  }

  function toggleOrdenacao(coluna: string) {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc',
    }))
  }

  function ordenar(lista: typeof equipComEstado) {
    return [...lista].sort((a, b) => {
      const dir = ordenacao.direcao === 'asc' ? 1 : -1
      switch (ordenacao.coluna) {
        case 'descricao':    return dir * a.eq.descricao.localeCompare(b.eq.descricao)
        case 'marca':        return dir * `${a.eq.marca} ${a.eq.modelo}`.localeCompare(`${b.eq.marca} ${b.eq.modelo}`)
        case 'proximaCalib': {
          const da = parseData(a.eq.dataCalibracao)?.getTime() ?? 0
          const db = parseData(b.eq.dataCalibracao)?.getTime() ?? 0
          return dir * (da - db)
        }
        case 'periodicidade': return dir * (a.eq.periodicidade ?? 'Anual').localeCompare(b.eq.periodicidade ?? 'Anual')
        case 'estado': {
          const ordem = { vencido: 0, urgente: 1, aviso: 2, ok: 3 }
          return dir * (ordem[a.estado] - ordem[b.estado])
        }
        default: return 0
      }
    })
  }

  const filtrados = ordenar(equipComEstado)
    .filter(e => filtro === 'todos' || e.estado === filtro)
    .filter(e =>
      pesquisa === '' ||
      e.eq.descricao.toLowerCase().includes(pesquisa.toLowerCase()) ||
      e.eq.marca.toLowerCase().includes(pesquisa.toLowerCase()) ||
      e.eq.numeroSAP.includes(pesquisa)
    )

  async function abrirModal(eq: Equipamento, e: React.MouseEvent) {
    e.stopPropagation()
    setEquipSelecionado(eq)
    setModalAberto(true)
    setFicheiro(null)
    setForm({ data: new Date().toISOString().split('T')[0], tecnico: '', entidade: '', observacoes: '', aprovadoPor: '' })
    setAssinado(false)
    setErro('')
    setSucesso(false)
    setHistorico([])
    setLoadingHistorico(true)
    try {
      const res = await authFetch(`${API_URL}/api/calibracoes/${eq.numeroSAP}`)
      if (res.ok) setHistorico(await res.json())
    } catch {}
    finally { setLoadingHistorico(false) }
  }

  function fecharModal() {
    setModalAberto(false)
    setEquipSelecionado(null)
  }

  async function handleSubmit() {
    if (!form.data)     { setErro('A data é obrigatória.');      return }
    if (!form.tecnico)  { setErro('O técnico é obrigatório.');   return }
    if (!form.entidade) { setErro('A entidade é obrigatória.');  return }
    if (!ficheiro)      { setErro('O relatório PDF é obrigatório.'); return }
    if (!assinado)      { setErro('É necessário confirmar a aprovação.'); return }

    const dataCalib   = new Date(form.data)
    const novaProxima = new Date(dataCalib)
    if (equipSelecionado?.periodicidade === 'Bienal') novaProxima.setFullYear(novaProxima.getFullYear() + 2)
    else novaProxima.setFullYear(novaProxima.getFullYear() + 1)
    const excelDate = Math.round((novaProxima.getTime() / 86400000) + 25569)

    try {
      await authFetch(`${API_URL}/api/calibracoes`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          equipamentoSAP:   equipSelecionado?.numeroSAP,
          dataCalibracao:   form.data,
          tecnico:          form.tecnico,
          entidade:         form.entidade,
          observacoes:      form.observacoes,
          relatorio:        ficheiro.name,
          aprovadoPor:      form.aprovadoPor,
          novaProximaCalib: String(excelDate),
        }),
      })
      const novos = equipamentos.map(eq =>
        eq.id === equipSelecionado?.id ? { ...eq, dataCalibracao: String(excelDate) } : eq
      )
      onAtualizar(novos)
      setSucesso(true)
      setTimeout(() => fecharModal(), 1500)
    } catch {
      setErro('Erro ao registar calibração.')
    }
  }

  const colunas = [
    { key: 'descricao',    label: 'Equipamento'    },
    { key: 'marca',        label: 'Marca'          },
    { key: 'proximaCalib', label: 'Próxima Calib.' },
    { key: 'periodicidade',label: 'Periodicidade'  },
    { key: 'estado',       label: 'Estado'         },
  ]

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {(['todos','vencido','urgente','aviso','ok'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`p-3 border text-left transition-all ${
              filtro === f ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className={`text-xl font-bold font-mono ${
              filtro === f ? 'text-white'
              : f === 'todos'   ? 'text-gray-800'
              : f === 'vencido' ? 'text-red-600'
              : f === 'urgente' ? 'text-orange-600'
              : f === 'aviso'   ? 'text-yellow-600'
              : 'text-green-600'
            }`}>{counts[f]}</p>
            <p className={`text-xs mt-0.5 ${filtro === f ? 'text-white/70' : 'text-gray-400'}`}>
              {f === 'todos' ? 'Todos' : estadoConfig[f].label}
            </p>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">

        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Filtrar equipamentos..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            className="flex-1 text-xs outline-none bg-transparent text-gray-600 placeholder-gray-400"
          />
          {pesquisa && (
            <button onClick={() => setPesquisa('')} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
          <span className="text-xs text-gray-400 font-mono flex-shrink-0">{filtrados.length} equipamentos</span>
        </div>

        {/* Cards mobile */}
        <div className="md:hidden divide-y divide-gray-50">
          {filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhum equipamento encontrado</p>
          ) : filtrados.slice(0, expandida ? undefined : 5).map(({ eq, estado }) => {
            const cfg = estadoConfig[estado]
            const proxima = parseData(eq.dataCalibracao)
            const diff = proxima ? differenceInDays(proxima, new Date()) : null
            return (
              <div key={eq.id} onClick={() => onVerDetalhe(eq)} className="p-4 hover:bg-red-50/40 cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{eq.descricao}</p>
                      <p className="text-xs text-gray-400 font-mono">{eq.numeroSAP} · {eq.marca} {eq.modelo}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 flex-shrink-0 ${cfg.badge}`}>{cfg.label}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-xs text-gray-500">{proxima ? proxima.toLocaleDateString('pt-PT') : '—'}</p>
                    {diff !== null && (
                      <p className={`text-xs font-semibold ${diff < 0 ? 'text-red-500' : diff <= 30 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {diff < 0 ? `Vencida há ${Math.abs(diff)}d` : `Em ${diff}d`}
                      </p>
                    )}
                  </div>
                  <button onClick={e => abrirModal(eq, e)} className="text-xs font-semibold text-white px-3 py-1.5" style={{ background: '#C0001A' }}>
                    Registar
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Table desktop */}
        <table className="w-full hidden md:table">
          <thead>
            <tr className="border-b border-gray-100">
              {colunas.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleOrdenacao(col.key)}
                  className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <span className="text-gray-300">
                      {ordenacao.coluna === col.key ? (ordenacao.direcao === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </span>
                </th>
              ))}
              <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  Nenhum equipamento encontrado
                </td>
              </tr>
            ) : (
              filtrados.slice(0, expandida ? undefined : 5).map(({ eq, estado }) => {
                const cfg     = estadoConfig[estado]
                const proxima = parseData(eq.dataCalibracao)
                const diff    = proxima ? differenceInDays(proxima, new Date()) : null

                return (
                  <tr
                    key={eq.id}
                    onClick={() => onVerDetalhe(eq)}
                    className="border-b border-gray-50 hover:bg-red-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Equipamento */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0 }} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{eq.descricao}</p>
                          <p className="text-xs text-gray-400 font-mono">{eq.numeroSAP}</p>
                        </div>
                      </div>
                    </td>

                    {/* Marca */}
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {eq.marca} <span className="text-gray-300">{eq.modelo}</span>
                    </td>

                    {/* Próxima calib */}
                    <td className="px-4 py-2.5">
                      <p className="text-xs text-gray-700">{proxima ? proxima.toLocaleDateString('pt-PT') : '—'}</p>
                      {diff !== null && (
                        <p className={`text-xs font-semibold ${
                          diff < 0 ? 'text-red-500' : diff <= 30 ? 'text-orange-500' : diff <= 60 ? 'text-yellow-600' : 'text-gray-400'
                        }`}>
                          {diff < 0 ? `há ${Math.abs(diff)}d` : `em ${diff}d`}
                        </p>
                      )}
                    </td>

                    {/* Periodicidade */}
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 ${
                        eq.periodicidade === 'Bienal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {eq.periodicidade ?? 'Anual'}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-bold px-2.5 py-1 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>

                    {/* Ação */}
                    <td className="px-4 py-2.5">
                      <button
                        onClick={e => abrirModal(eq, e)}
                        className="text-xs font-semibold text-white px-3 py-1.5 transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                        style={{ background: '#C0001A' }}
                      >
                        Registar
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Expand / collapse */}
        {!expandida && filtrados.length > 5 ? (
          <button
            onClick={() => setExpandida(true)}
            className="w-full py-3 text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all border-t border-gray-100 flex items-center justify-center gap-2 group"
          >
            <span>Ver todos os {filtrados.length} equipamentos</span>
            <span className="bg-gray-100 group-hover:bg-gray-200 text-gray-500 px-2 py-0.5 transition-colors">↓</span>
          </button>
        ) : expandida ? (
          <button
            onClick={() => setExpandida(false)}
            className="w-full py-3 text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all border-t border-gray-100 flex items-center justify-center gap-2"
          >
            Recolher ↑
          </button>
        ) : null}
      </div>

      {/* Modal de registo */}
      {modalAberto && equipSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Registar Calibração</h2>
                <p className="text-xs text-gray-400 mt-0.5">{equipSelecionado.descricao} · {equipSelecionado.numeroSAP}</p>
              </div>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Entidade *</label>
                  <input type="text" placeholder="Ex: CATIM, IPQ..." value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Técnico *</label>
                <input type="text" placeholder="Nome do técnico" value={form.tecnico} onChange={e => setForm({...form, tecnico: e.target.value})}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Aprovado por</label>
                <input type="text" placeholder="Nome do responsável" value={form.aprovadoPor} onChange={e => setForm({...form, aprovadoPor: e.target.value})}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Observações</label>
                <textarea placeholder="Notas..." value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none h-16" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                  Relatório PDF <span className="text-red-500">*</span>
                </label>
                <label className={`flex items-center gap-3 border-2 border-dashed p-3 cursor-pointer transition-all ${ficheiro ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-red-300'}`}>
                  {ficheiro ? (
                    <>
                      <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-green-700 truncate">{ficheiro.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400">Clique para anexar PDF</span>
                    </>
                  )}
                  <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => setFicheiro(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div
                onClick={() => setAssinado(!assinado)}
                className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${assinado ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${assinado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {assinado && <CheckCircle size={12} className="text-white" />}
                </div>
                <p className="text-xs text-gray-600">Confirmo que os dados são corretos e assumo responsabilidade.</p>
              </div>
              {erro    && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">{erro}</p>}
              {sucesso && <p className="text-xs text-green-700 bg-green-50 px-3 py-2">✓ Calibração registada com sucesso!</p>}

              {/* Histórico — timeline */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-3">
                  <History size={13} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Histórico de Calibrações</span>
                  {historico.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 font-mono">{historico.length}</span>
                  )}
                </div>
                {loadingHistorico ? (
                  <div className="flex items-center gap-2 py-3 text-gray-400">
                    <Loader size={11} className="animate-spin" />
                    <span className="text-xs">A carregar...</span>
                  </div>
                ) : historico.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 italic">Nenhum registo anterior.</p>
                ) : (
                  <div className="relative">
                    {/* linha vertical */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-3">
                      {historico.map((h, i) => (
                        <div key={h.id} className="flex gap-3">
                          {/* ponto */}
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 z-10 ${i === 0 ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'}`} />
                          <div className="flex-1 pb-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-800">
                                {new Date(h.data_calibracao).toLocaleDateString('pt-PT')}
                              </span>
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5">{h.entidade}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Técnico: <span className="text-gray-700">{h.tecnico}</span>
                              {h.aprovado_por && <span className="text-gray-400"> · Aprov. {h.aprovado_por}</span>}
                            </p>
                            {h.observacoes && <p className="text-xs text-gray-400 italic mt-0.5">{h.observacoes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={fecharModal} className="text-xs font-semibold text-gray-500 px-4 py-2 border border-gray-200">
                Cancelar
              </button>
              <button onClick={handleSubmit} className="text-xs font-semibold text-white px-4 py-2" style={{ background: '#C0001A' }}>
                Encerrar Calibração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}