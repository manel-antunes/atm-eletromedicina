import { useState, useEffect } from 'react'
import { ArrowLeftRight, X, CheckCircle, Loader, AlertTriangle } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { guardarEquipamentos } from '../data/storage'
import { API_URL } from '../config'
import { SkeletonTabela } from '../components/Skeleton'

interface Props {
  equipamentos: Equipamento[]
  onAtualizar: (equipamentos: Equipamento[]) => void
  mostrar: (tipo: 'sucesso' | 'erro' | 'aviso', titulo: string, mensagem?: string) => void
}

interface Cedencia {
  id: number
  equipamentoSAP: string
  equipamentoNome: string
  destino: string
  responsavel: string
  contacto: string
  dataSaida: string
  dataRetornoPrevista: string
  dataRetornoEfetiva?: string
  ativa: boolean
  observacoes: string
}

function getToken() { return localStorage.getItem('atm_token') ?? '' }
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
}

function mapRow(r: any): Cedencia {
  return {
    id: r.id,
    equipamentoSAP: r.equipamento_sap,
    equipamentoNome: r.equipamento_nome,
    destino: r.destino,
    responsavel: r.responsavel,
    contacto: r.contacto ?? '',
    dataSaida: r.data_saida,
    dataRetornoPrevista: r.data_retorno_prevista,
    dataRetornoEfetiva: r.data_retorno_efetiva ?? undefined,
    ativa: r.ativa,
    observacoes: r.observacoes ?? '',
  }
}

function isAtrasada(c: Cedencia): boolean {
  return c.ativa && new Date(c.dataRetornoPrevista) < new Date()
}

export default function Cedencias({ equipamentos, onAtualizar, mostrar }: Props) {
  const [cedencias, setCedencias] = useState<Cedencia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalRetorno, setModalRetorno] = useState<Cedencia | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'ativas' | 'devolvidas'>('todas')
  const [dataRetorno, setDataRetorno] = useState('')
  const [form, setForm] = useState({
    equipamentoId: '',
    destino: '',
    responsavel: '',
    contacto: '',
    dataSaida: new Date().toISOString().split('T')[0],
    dataRetornoPrevista: '',
    observacoes: '',
  })
  const [erroForm, setErroForm] = useState('')
  const [erroRetorno, setErroRetorno] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/cedencias`, { headers: authHeaders() })
      if (res.ok) setCedencias((await res.json()).map(mapRow))
    } catch {}
    finally { setLoading(false) }
  }

  const filtradas = cedencias.filter(c =>
    filtro === 'todas' ? true : filtro === 'ativas' ? c.ativa : !c.ativa
  )
  const ativas = cedencias.filter(c => c.ativa).length
  const atrasadas = cedencias.filter(isAtrasada).length

  async function handleSubmit() {
    if (!form.equipamentoId)      { setErroForm('Seleciona um equipamento.');             return }
    if (!form.destino)            { setErroForm('O destino é obrigatório.');              return }
    if (!form.responsavel)        { setErroForm('O responsável é obrigatório.');          return }
    if (!form.dataSaida)          { setErroForm('A data de saída é obrigatória.');        return }
    if (!form.dataRetornoPrevista){ setErroForm('A data de retorno prevista é obrigatória.'); return }

    const eq = equipamentos.find(e => e.id === Number(form.equipamentoId))
    if (!eq) return

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/cedencias`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          equipamentoSAP: eq.numeroSAP,
          equipamentoNome: eq.descricao,
          destino: form.destino,
          responsavel: form.responsavel,
          contacto: form.contacto,
          dataSaida: form.dataSaida,
          dataRetornoPrevista: form.dataRetornoPrevista,
          observacoes: form.observacoes,
        }),
      })
      if (!res.ok) { mostrar('erro', 'Erro ao registar cedência', 'Tente novamente.'); return }

      const novosEquip = equipamentos.map(e =>
        e.id === eq.id ? { ...e, localizacao: form.destino } : e
      )
      guardarEquipamentos(novosEquip)
      onAtualizar(novosEquip)
      await carregar()
      setModalAberto(false)
      setErroForm('')
      setForm({ equipamentoId: '', destino: '', responsavel: '', contacto: '', dataSaida: new Date().toISOString().split('T')[0], dataRetornoPrevista: '', observacoes: '' })
      mostrar('sucesso', 'Cedência registada', `${eq.descricao} cedido a ${form.destino}.`)
    } catch { mostrar('erro', 'Erro ao registar cedência', 'Verifique a ligação.') }
    finally { setSaving(false) }
  }

  async function registarRetorno() {
    if (!modalRetorno) return
    if (!dataRetorno) { setErroRetorno('Indica a data de retorno.'); return }

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/cedencias/${modalRetorno.id}/retorno`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ dataRetornoEfetiva: dataRetorno }),
      })
      if (!res.ok) { mostrar('erro', 'Erro ao registar retorno', 'Tente novamente.'); return }

      const novosEquip = equipamentos.map(e =>
        e.numeroSAP === modalRetorno.equipamentoSAP ? { ...e, localizacao: 'FIXO HPRT' } : e
      )
      guardarEquipamentos(novosEquip)
      onAtualizar(novosEquip)
      await carregar()
      setModalRetorno(null)
      setDataRetorno('')
      setErroRetorno('')
      mostrar('sucesso', 'Retorno registado', `${modalRetorno.equipamentoNome} devolvido.`)
    } catch { mostrar('erro', 'Erro ao registar retorno', 'Verifique a ligação.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-sky-400">
          <p className="text-2xl font-bold font-mono text-sky-500">{cedencias.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total cedências</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-orange-400">
          <p className="text-2xl font-bold font-mono text-orange-500">{ativas}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Atualmente cedidos</p>
        </div>
        <div className={`bg-white border p-4 border-t-4 ${atrasadas > 0 ? 'border-red-200 border-t-red-500' : 'border-gray-200 border-t-gray-300'}`}>
          <p className={`text-2xl font-bold font-mono ${atrasadas > 0 ? 'text-red-600' : 'text-gray-400'}`}>{atrasadas}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Em atraso</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-green-400">
          <p className="text-2xl font-bold font-mono text-green-600">{cedencias.length - ativas}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Devolvidos</p>
        </div>
      </div>

      {/* Filtros e botão */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([
            { id: 'todas', label: 'Todas' },
            { id: 'ativas', label: 'Ativas' },
            { id: 'devolvidas', label: 'Devolvidas' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold border transition-all ${
                filtro === f.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 transition-all"
        >
          + Registar Cedência
        </button>
      </div>

      {loading ? (
        <SkeletonTabela linhas={5} />
      ) : (
        <>
          {/* Cards mobile */}
          <div className="md:hidden space-y-2">
            {filtradas.length === 0 ? (
              <div className="bg-white border border-gray-200 p-8 text-center text-sm text-gray-400">
                Nenhuma cedência registada
              </div>
            ) : filtradas.map(c => {
              const atrasada = isAtrasada(c)
              return (
                <div key={c.id} className={`bg-white p-4 ${atrasada ? 'border-l-4 border-l-red-400 border border-gray-200' : 'border border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.equipamentoNome}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.equipamentoSAP}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {atrasada && <AlertTriangle size={12} className="text-red-500" />}
                      <span className={`text-xs font-semibold px-2 py-0.5 ${!c.ativa ? 'bg-green-50 text-green-700' : atrasada ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                        {!c.ativa ? 'Devolvido' : atrasada ? 'Em atraso' : 'Ativa'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
                    <p>Destino: <span className="font-medium text-gray-700">{c.destino}</span></p>
                    <p>Resp.: <span className="font-medium text-gray-700">{c.responsavel}</span></p>
                    <p>Saída: <span className="font-medium text-gray-700">{new Date(c.dataSaida).toLocaleDateString('pt-PT')}</span></p>
                    <p>Previsto: <span className={`font-medium ${atrasada ? 'text-red-600' : 'text-gray-700'}`}>{new Date(c.dataRetornoPrevista).toLocaleDateString('pt-PT')}</span></p>
                  </div>
                  {c.ativa && (
                    <button
                      onClick={() => { setModalRetorno(c); setDataRetorno(new Date().toISOString().split('T')[0]) }}
                      className="w-full text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 py-2 transition-all"
                    >
                      Registar retorno
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tabela desktop */}
          <div className="hidden md:block bg-white border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Destino</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Saída</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retorno Previsto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retorno Efetivo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                      Nenhuma cedência registada
                    </td>
                  </tr>
                ) : (
                  filtradas.map(c => {
                    const atrasada = isAtrasada(c)
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-gray-100 transition-colors ${atrasada ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {atrasada && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                            <div>
                              <p className="font-medium text-gray-800 text-xs">{c.equipamentoNome}</p>
                              <p className="text-gray-400 text-xs font-mono">{c.equipamentoSAP}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-medium">{c.destino}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          <p>{c.responsavel}</p>
                          {c.contacto && <p className="text-gray-400">{c.contacto}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.dataSaida).toLocaleDateString('pt-PT')}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={atrasada ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                            {new Date(c.dataRetornoPrevista).toLocaleDateString('pt-PT')}
                          </span>
                          {atrasada && (
                            <p className="text-red-400 text-xs">
                              {Math.floor((Date.now() - new Date(c.dataRetornoPrevista).getTime()) / 86400000)}d em atraso
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {c.dataRetornoEfetiva ? new Date(c.dataRetornoEfetiva).toLocaleDateString('pt-PT') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 ${
                            !c.ativa ? 'bg-green-50 text-green-700'
                            : atrasada ? 'bg-red-50 text-red-700'
                            : 'bg-orange-50 text-orange-700'
                          }`}>
                            {!c.ativa ? 'Devolvido' : atrasada ? 'Em atraso' : 'Ativa'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.ativa && (
                            <button
                              onClick={() => { setModalRetorno(c); setDataRetorno(new Date().toISOString().split('T')[0]) }}
                              className="text-xs font-semibold text-green-600 hover:text-green-800 border border-green-200 hover:border-green-400 px-3 py-1.5 transition-all"
                            >
                              Registar retorno
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal nova cedência */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ArrowLeftRight size={16} className="text-sky-500" />
                <h2 className="text-sm font-semibold text-gray-800">Registar Cedência</h2>
              </div>
              <button onClick={() => { setModalAberto(false); setErroForm('') }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Equipamento *</label>
                <select
                  value={form.equipamentoId}
                  onChange={e => setForm({ ...form, equipamentoId: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                >
                  <option value="">Seleciona um equipamento...</option>
                  {equipamentos.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.descricao} — {eq.numeroSAP}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Destino *</label>
                <select
                  value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                >
                  <option value="">Seleciona um destino...</option>
                  {['FIXO HPRT','FIXO HTRD','FIXO CINS','HPRT','HTRD','CINS','CMAS','Geral CMAS','Equipa Móvel'].map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Responsável *</label>
                  <input type="text" placeholder="Nome"
                    value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Contacto</label>
                  <input type="text" placeholder="Email ou extensão"
                    value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Data de saída *</label>
                  <input type="date" value={form.dataSaida} onChange={e => setForm({ ...form, dataSaida: e.target.value })}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Retorno previsto *</label>
                  <input type="date" value={form.dataRetornoPrevista} onChange={e => setForm({ ...form, dataRetornoPrevista: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Observações</label>
                <textarea placeholder="Notas relevantes..." value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400 resize-none h-16" />
              </div>
              {erroForm && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2">{erroForm}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setModalAberto(false); setErroForm('') }} className="text-xs font-semibold text-gray-500 px-4 py-2 border border-gray-200 hover:border-gray-300 transition-all">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saving} className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 transition-all disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader size={11} className="animate-spin" />}
                Registar Cedência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal retorno */}
      {modalRetorno && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">Registar Retorno</h2>
              <button onClick={() => { setModalRetorno(null); setErroRetorno('') }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs text-gray-500">Equipamento: <span className="font-semibold text-gray-800">{modalRetorno.equipamentoNome}</span></p>
              <p className="text-xs text-gray-500">Cedido a: <span className="font-semibold text-gray-800">{modalRetorno.destino}</span></p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Data de retorno efetiva *</label>
                <input type="date" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
              </div>
              {erroRetorno && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2">{erroRetorno}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setModalRetorno(null); setErroRetorno('') }} className="text-xs font-semibold text-gray-500 px-4 py-2 border border-gray-200 transition-all">
                Cancelar
              </button>
              <button onClick={registarRetorno} disabled={saving} className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-4 py-2 transition-all disabled:opacity-60 flex items-center gap-1.5">
                {saving ? <Loader size={11} className="animate-spin" /> : <CheckCircle size={12} />}
                Confirmar retorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
