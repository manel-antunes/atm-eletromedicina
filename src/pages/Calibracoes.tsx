import { useState, useRef } from 'react'
import { CheckCircle, Upload, X, ChevronDown, Search, Filter } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'

interface Props {
  equipamentos: Equipamento[]
  onAtualizar: (equipamentos: Equipamento[]) => void
  onVerDetalhe: (eq: Equipamento) => void
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

const estadoConfig = {
  vencido: { label: 'Vencida',  badge: 'bg-red-100 text-red-700',    dot: '#ef4444' },
  urgente: { label: 'Urgente',  badge: 'bg-orange-100 text-orange-700', dot: '#f97316' },
  aviso:   { label: 'Em breve', badge: 'bg-yellow-100 text-yellow-700', dot: '#eab308' },
  ok:      { label: 'Em dia',   badge: 'bg-green-100 text-green-700',  dot: '#22c55e' },
}

export default function Calibracoes({ equipamentos, onAtualizar, onVerDetalhe }: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [equipSelecionado, setEquipSelecionado] = useState<Equipamento | null>(null)
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [form, setForm] = useState({ data: '', tecnico: '', entidade: '', observacoes: '', aprovadoPor: '' })
  const [assinado, setAssinado] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'vencido' | 'urgente' | 'aviso' | 'ok'>('todos')
  const [pesquisa, setPesquisa] = useState('')
  const [rowExpandida, setRowExpandida] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const equipComEstado = equipamentos.map(eq => ({ eq, estado: getEstado(eq) }))
  const filtrados = equipComEstado
    .filter(e => filtro === 'todos' || e.estado === filtro)
    .filter(e => pesquisa === '' ||
      e.eq.descricao.toLowerCase().includes(pesquisa.toLowerCase()) ||
      e.eq.marca.toLowerCase().includes(pesquisa.toLowerCase()) ||
      e.eq.numeroSAP.includes(pesquisa)
    )

  const counts = {
    todos: equipamentos.length,
    vencido: equipComEstado.filter(e => e.estado === 'vencido').length,
    urgente: equipComEstado.filter(e => e.estado === 'urgente').length,
    aviso: equipComEstado.filter(e => e.estado === 'aviso').length,
    ok: equipComEstado.filter(e => e.estado === 'ok').length,
  }

  function abrirModal(eq: Equipamento, e: React.MouseEvent) {
    e.stopPropagation()
    setEquipSelecionado(eq)
    setModalAberto(true)
    setFicheiro(null)
    setForm({ data: new Date().toISOString().split('T')[0], tecnico: '', entidade: '', observacoes: '', aprovadoPor: '' })
    setAssinado(false)
    setErro('')
    setSucesso(false)
  }

  function fecharModal() {
    setModalAberto(false)
    setEquipSelecionado(null)
  }

  async function handleSubmit() {
    if (!form.data) { setErro('A data é obrigatória.'); return }
    if (!form.tecnico) { setErro('O técnico é obrigatório.'); return }
    if (!form.entidade) { setErro('A entidade é obrigatória.'); return }
    if (!ficheiro) { setErro('O relatório PDF é obrigatório.'); return }
    if (!assinado) { setErro('É necessário confirmar a aprovação.'); return }

    const dataCalib = new Date(form.data)
    const novaProxima = new Date(dataCalib)
    if (equipSelecionado?.periodicidade === 'Bienal') novaProxima.setFullYear(novaProxima.getFullYear() + 2)
    else novaProxima.setFullYear(novaProxima.getFullYear() + 1)
    const excelDate = Math.round((novaProxima.getTime() / 86400000) + 25569)

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
      await fetch(`${API_URL}/api/calibracoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipamentoSAP: equipSelecionado?.numeroSAP,
          dataCalibracao: form.data,
          tecnico: form.tecnico,
          entidade: form.entidade,
          observacoes: form.observacoes,
          relatorio: ficheiro.name,
          aprovadoPor: form.aprovadoPor,
          novaProximaCalib: String(excelDate),
        }),
      })
      const novosEquipamentos = equipamentos.map(eq =>
        eq.id === equipSelecionado?.id
          ? { ...eq, dataCalibracao: String(excelDate) }
          : eq
      )
      onAtualizar(novosEquipamentos)
      setSucesso(true)
      setTimeout(() => fecharModal(), 1500)
    } catch {
      setErro('Erro ao registar calibração.')
    }
  }

  return (
    <div className="space-y-4">

      {/* KPIs compactos */}
      <div className="grid grid-cols-5 gap-3">
        {(['todos', 'vencido', 'urgente', 'aviso', 'ok'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`p-3 rounded-xl border text-left transition-all ${
              filtro === f
                ? 'bg-slate-800 border-slate-800 text-white'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className={`text-xl font-bold font-mono ${filtro === f ? 'text-white' : f === 'todos' ? 'text-gray-800' : f === 'vencido' ? 'text-red-600' : f === 'urgente' ? 'text-orange-600' : f === 'aviso' ? 'text-yellow-600' : 'text-green-600'}`}>
              {counts[f]}
            </p>
            <p className={`text-xs mt-0.5 ${filtro === f ? 'text-white/70' : 'text-gray-400'}`}>
              {f === 'todos' ? 'Todos' : estadoConfig[f].label}
            </p>
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Pesquisar equipamento, marca ou SAP..."
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
        />
        {pesquisa && (
          <button onClick={() => setPesquisa('')} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
        <span className="text-xs text-gray-400 font-mono flex-shrink-0">{filtrados.length} resultado(s)</span>
      </div>

      {/* Lista expansível */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="col-span-4 text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Filter size={10} /> Equipamento
          </div>
          <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Próxima Calib.</div>
          <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Periodicidade</div>
          <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Estado</div>
          <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Ação</div>
        </div>

        {filtrados.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">Nenhum equipamento encontrado</p>
          </div>
        ) : (
          filtrados.map(({ eq, estado }) => {
            const cfg = estadoConfig[estado]
            const proxima = parseData(eq.dataCalibracao)
            const expandido = rowExpandida === eq.id
            const historico = eq.historicoCalibracao ?? []

            return (
              <div key={eq.id} className="border-b border-gray-50 last:border-0">
                {/* Linha principal */}
                <div
                  onClick={() => setRowExpandida(expandido ? null : eq.id)}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer items-center"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{eq.descricao}</p>
                      <p className="text-xs text-gray-400 truncate">{eq.marca} {eq.modelo} · {eq.numeroSAP}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-xs text-gray-600">
                    {proxima ? proxima.toLocaleDateString('pt-PT') : '—'}
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${eq.periodicidade === 'Bienal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {eq.periodicidade ?? 'Anual'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      onClick={e => abrirModal(eq, e)}
                      className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                      style={{ background: '#C0001A' }}
                    >
                      Registar
                    </button>
                    <ChevronDown
                      size={14}
                      className="text-gray-400 transition-transform duration-200 flex-shrink-0"
                      style={{ transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </div>
                </div>

                {/* Área expansível */}
                <div style={{
                  maxHeight: expandido ? 300 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.3s cubic-bezier(0.16,1,0.3,1)',
                }}>
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 pt-3">
                      {/* Info extra */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Informação</p>
                        {[
                          { label: 'Localização', valor: eq.localizacao || '—' },
                          { label: 'Responsável', valor: eq.responsavel || '—' },
                          { label: 'Nº Série', valor: eq.numeroSerie || '—' },
                          { label: 'Observações', valor: eq.obs || '—' },
                        ].map(({ label, valor }) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-xs text-gray-400">{label}</span>
                            <span className="text-xs font-medium text-gray-700 max-w-40 truncate">{valor}</span>
                          </div>
                        ))}
                      </div>

                      {/* Histórico */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                          Histórico ({historico.length})
                        </p>
                        {historico.length === 0 ? (
                          <p className="text-xs text-gray-300 italic">Sem registos de calibração</p>
                        ) : (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {[...historico].reverse().map(reg => (
                              <div key={reg.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <div>
                                  <p className="text-xs font-semibold text-gray-700">{new Date(reg.data).toLocaleDateString('pt-PT')}</p>
                                  <p className="text-xs text-gray-400">{reg.tecnico} · {reg.entidade}</p>
                                </div>
                                <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={e => { e.stopPropagation(); onVerDetalhe(eq) }}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Ver detalhes completos →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de registo */}
      {modalAberto && equipSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Registar Calibração</h2>
                <p className="text-xs text-gray-400 mt-0.5">{equipSelecionado.descricao} · {equipSelecionado.numeroSAP}</p>
              </div>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Entidade *</label>
                  <input type="text" placeholder="Ex: CATIM, IPQ..." value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Técnico *</label>
                <input type="text" placeholder="Nome do técnico" value={form.tecnico} onChange={e => setForm({...form, tecnico: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Aprovado por</label>
                <input type="text" placeholder="Nome do responsável" value={form.aprovadoPor} onChange={e => setForm({...form, aprovadoPor: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Observações</label>
                <textarea placeholder="Notas..." value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none h-16" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                  Relatório PDF <span className="text-red-500">*</span>
                </label>
                <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all ${ficheiro ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-red-300'}`}>
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
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${assinado ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${assinado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {assinado && <CheckCircle size={12} className="text-white" />}
                </div>
                <p className="text-xs text-gray-600">Confirmo que os dados são corretos e assumo responsabilidade.</p>
              </div>
              {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              {sucesso && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">✓ Calibração registada com sucesso!</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={fecharModal} className="text-xs font-semibold text-gray-500 px-4 py-2 rounded-lg border border-gray-200">Cancelar</button>
              <button onClick={handleSubmit} className="text-xs font-semibold text-white px-4 py-2 rounded-lg" style={{ background: '#C0001A' }}>
                Encerrar Calibração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}