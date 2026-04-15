import { useState } from 'react'
import { CheckCircle, Upload, X } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { guardarEquipamentos } from '../data/storage'
import { differenceInDays, parse, isValid } from 'date-fns'

interface Props {
  equipamentos: Equipamento[]
  onAtualizar: (equipamentos: Equipamento[]) => void
  onVerDetalhe: (eq: Equipamento) => void
}
interface RegistoCalib {
  id: number
  data: string
  tecnico: string
  entidade: string
  observacoes: string
  relatorio: string
  aprovadoPor: string
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
  vencido: { label: 'Vencida', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  urgente: { label: 'Urgente', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  aviso:   { label: 'Em breve', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  ok:      { label: 'Em dia', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
}

export default function Calibracoes({ equipamentos, onAtualizar, onVerDetalhe }: Props) {  const [modalAberto, setModalAberto] = useState(false)
  const [equipSelecionado, setEquipSelecionado] = useState<Equipamento | null>(null)
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [form, setForm] = useState({ data: '', tecnico: '', entidade: '', observacoes: '', aprovadoPor: '' })
  const [assinado, setAssinado] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'vencido' | 'urgente' | 'aviso' | 'ok'>('todos')

  const equipComEstado = equipamentos.map(eq => ({ eq, estado: getEstado(eq) }))
  const filtrados = filtro === 'todos' ? equipComEstado : equipComEstado.filter(e => e.estado === filtro)

  function abrirModal(eq: Equipamento) {
    setEquipSelecionado(eq)
    setModalAberto(true)
    setFicheiro(null)
    setForm({ data: new Date().toISOString().split('T')[0], tecnico: '', entidade: '', observacoes: '', aprovadoPor: '' })
    setAssinado(false)
    setErro('')
    setSucesso('')
  }

  function fecharModal() {
    setModalAberto(false)
    setEquipSelecionado(null)
  }

  function handleSubmit() {
    if (!form.data) { setErro('A data de calibração é obrigatória.'); return }
    if (!form.tecnico) { setErro('O nome do técnico é obrigatório.'); return }
    if (!form.entidade) { setErro('A entidade calibradora é obrigatória.'); return }
    if (!ficheiro) { setErro('O relatório de calibração (PDF) é obrigatório para encerrar.'); return }
    if (!assinado) { setErro('É necessário confirmar a aprovação digital.'); return }

    const novoRegisto: RegistoCalib = {
      id: Date.now(),
      data: form.data,
      tecnico: form.tecnico,
      entidade: form.entidade,
      observacoes: form.observacoes,
      relatorio: ficheiro.name,
      aprovadoPor: form.aprovadoPor,
    }

    // calcula nova próxima calibração
    const dataCalib = new Date(form.data)
    const novaProxima = new Date(dataCalib)
    if (equipSelecionado?.periodicidade === 'Bienal') {
      novaProxima.setFullYear(novaProxima.getFullYear() + 2)
    } else {
      novaProxima.setFullYear(novaProxima.getFullYear() + 1)
    }

    // formata como número Excel para manter consistência
    const excelDate = Math.round((novaProxima.getTime() / 86400000) + 25569)

    const novosEquipamentos = equipamentos.map(eq => {
      if (eq.id !== equipSelecionado?.id) return eq
      return {
        ...eq,
        dataCalibracao: String(excelDate),
        historicoCalibracao: [
          ...(eq.historicoCalibracao ?? []),
          novoRegisto,
        ],
      }
    })

    guardarEquipamentos(novosEquipamentos)
    onAtualizar(novosEquipamentos)
    setSucesso(`Calibração do ${equipSelecionado?.descricao} registada com sucesso!`)
    setTimeout(() => fecharModal(), 1500)
  }

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['todos', 'vencido', 'urgente', 'aviso', 'ok'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filtro === f
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {f === 'todos' ? 'Todos' : estadoConfig[f].label}
            <span className="ml-1.5 opacity-60">
              {f === 'todos' ? equipamentos.length : equipComEstado.filter(e => e.estado === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipamento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Próxima Calib.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Periodicidade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(({ eq, estado }) => {
              const cfg = estadoConfig[estado]
              const proxima = parseData(eq.dataCalibracao)
              const historico = eq.historicoCalibracao ?? []
              return (
<tr key={eq.id} onClick={() => onVerDetalhe(eq)} className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer">                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-xs">{eq.descricao}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{eq.marca} {eq.modelo} · {eq.numeroSAP}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{eq.responsavel || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {proxima ? proxima.toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      eq.periodicidade === 'Bienal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {eq.periodicidade ?? 'Anual'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {historico.length > 0
                      ? `${historico.length} registo(s)`
                      : 'Sem registos'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => abrirModal(eq)}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 border border-sky-200 hover:border-sky-400 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Registar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalAberto && equipSelecionado && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Registar Calibração</h2>
                <p className="text-xs text-gray-400 mt-0.5">{equipSelecionado.descricao}</p>
              </div>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Data de calibração *</label>
                  <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Entidade calibradora *</label>
                  <input type="text" placeholder="Ex: CATIM, IPQ..." value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Técnico responsável *</label>
                <input type="text" placeholder="Nome do técnico" value={form.tecnico} onChange={e => setForm({...form, tecnico: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Aprovado por</label>
                <input type="text" placeholder="Nome do responsável" value={form.aprovadoPor} onChange={e => setForm({...form, aprovadoPor: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Observações</label>
                <textarea placeholder="Notas relevantes..." value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 resize-none h-16" />
              </div>

              {/* Upload PDF */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  Relatório de calibração (PDF) <span className="text-red-500">*</span>
                </label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                  ficheiro ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-sky-300 hover:bg-sky-50'
                }`}>
                  {ficheiro ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle size={16} />
                      <span className="text-xs font-semibold">{ficheiro.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload size={20} className="text-gray-400" />
                      <span className="text-xs text-gray-400">Clique para anexar o relatório PDF</span>
                    </div>
                  )}
                  <input type="file" accept=".pdf" className="hidden" onChange={e => setFicheiro(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              {/* Assinatura digital */}
              <div
                onClick={() => setAssinado(!assinado)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  assinado ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                  assinado ? 'bg-green-500 border-green-500' : 'border-gray-300'
                }`}>
                  {assinado && <CheckCircle size={12} className="text-white" />}
                </div>
                <p className="text-xs text-gray-600">
                  Confirmo que os dados são corretos e assumo responsabilidade pela calibração registada.
                </p>
              </div>

              {erro && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              {sucesso && <p className="text-xs text-green-700 font-medium bg-green-50 px-3 py-2 rounded-lg">{sucesso}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={fecharModal} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                Cancelar
              </button>
              <button onClick={handleSubmit} className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-all">
                Encerrar Calibração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}