import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Download, Trash2, Search } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'

interface Props {
  equipamentos: Equipamento[]
}

interface Documento {
  id: number
  equipamento_sap: string | null
  nome: string
  tipo: string
  tamanho: number
  criado_em: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'https://atm-eletromedicina.onrender.com'

function getToken() { return localStorage.getItem('atm_token') ?? '' }
function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}` }
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Documentos({ equipamentos }: Props) {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [pesquisa, setPesquisa] = useState('')
  const [filtroEquip, setFiltroEquip] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [equipamentoSAP, setEquipamentoSAP] = useState('')
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [equipAutoDetectado, setEquipAutoDetectado] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { carregarDocs() }, [])

  async function carregarDocs() {
    try {
      const res = await fetch(`${API_URL}/api/documentos`, {
        headers: authHeaders(),
      })
      const dados = await res.json()
      setDocumentos(Array.isArray(dados) ? dados : [])
    } catch {
      setDocumentos([])
    } finally { setCarregando(false) }
  }

  async function handleUpload() {
    if (!ficheiro) { setErro('Seleciona um ficheiro.'); return }
    if (ficheiro.size > 10 * 1024 * 1024) { setErro('Ficheiro demasiado grande. Máximo 10MB.'); return }

    setEnviando(true)
    setErro('')

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1])
        reader.onerror = () => reject(new Error('Erro ao ler ficheiro'))
        reader.readAsDataURL(ficheiro)
      })

      const res = await fetch(`${API_URL}/api/documentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          equipamentoSAP: equipamentoSAP || null,
          nome: ficheiro.name,
          tipo: 'certificado',
          tamanho: ficheiro.size,
          dados: base64,
        }),
      })

      if (!res.ok) throw new Error(await res.text() || 'Erro ao guardar documento')

      await carregarDocs()
      setModalAberto(false)
      setFicheiro(null)
      setEquipamentoSAP('')
      setEquipAutoDetectado(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao fazer upload.')
    } finally {
      setEnviando(false)
    }
  }

  function handleFicheiro(f: File | null) {
    setFicheiro(f)
    setEquipAutoDetectado(null)
    if (!f) return
    const match = f.name.match(/\d{9,}/)
    if (match) {
      const sap = match[0]
      const eq = equipamentos.find(e => e.numeroSAP === sap)
      if (eq) {
        setEquipamentoSAP(eq.numeroSAP)
        setEquipAutoDetectado(eq.descricao)
      } else {
        setEquipamentoSAP('')
      }
    } else {
      setEquipamentoSAP('')
    }
  }

  function handleDownload(doc: Documento) {
    window.open(`${API_URL}/api/documentos/download/${doc.id}`, '_blank')
  }

  async function handleEliminar(id: number) {
    if (!window.confirm('Tens a certeza que queres eliminar este documento?')) return
    await fetch(`${API_URL}/api/documentos/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await carregarDocs()
  }

  const filtrados = documentos.filter(doc => {
    const termo = pesquisa.toLowerCase()
    const eq = equipamentos.find(e => e.numeroSAP === doc.equipamento_sap)
    const correspondePesquisa =
      doc.nome.toLowerCase().includes(termo) ||
      (eq?.descricao.toLowerCase().includes(termo) ?? false)
    const correspondeEquip = filtroEquip === 'todos' || doc.equipamento_sap === filtroEquip
    return correspondePesquisa && correspondeEquip
  })

  return (
    <div className="space-y-5">

      {/* KPI */}
      <div className="max-w-xs">
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-sky-400">
          <p className="text-2xl font-bold font-mono text-sky-500">{documentos.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total certificados</p>
        </div>
      </div>

      {/* Filtros e botão */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Pesquisar documentos..."
              value={pesquisa}
              onChange={e => setPesquisa(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <select
              value={filtroEquip}
              onChange={e => setFiltroEquip(e.target.value)}
              className="text-xs text-gray-600 outline-none bg-transparent max-w-48"
            >
              <option value="todos">Todos os equipamentos</option>
              {equipamentos.map(eq => (
                <option key={eq.numeroSAP} value={eq.numeroSAP}>{eq.descricao}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => { setModalAberto(true); setErro(''); setFicheiro(null); setEquipamentoSAP(''); setEquipAutoDetectado(null) }}
          className="flex items-center gap-2 text-xs font-semibold text-white px-4 py-2.5 rounded-xl transition-all flex-shrink-0"
          style={{ background: '#C0001A' }}
        >
          <Upload size={13} />
          Adicionar certificado
        </button>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="text-center py-12">
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p className="text-sm text-gray-400">A carregar documentos...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-400">Nenhum documento encontrado</p>
          <p className="text-xs text-gray-300 mt-1">Clica em "Adicionar certificado" para fazer upload</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Equipamento</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Tamanho</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(doc => {
                const eq = equipamentos.find(e => e.numeroSAP === doc.equipamento_sap)
                return (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 8 }}>
                          <FileText size={14} style={{ color: '#16a34a' }} />
                        </div>
                        <p className="text-xs font-semibold text-gray-800 max-w-48 truncate">{doc.nome}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-40 truncate">
                      {eq ? eq.descricao : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {formatarTamanho(doc.tamanho)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(doc.criado_em).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDownload(doc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Download">
                          <Download size={13} />
                        </button>
                        <button onClick={() => handleEliminar(doc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal upload */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Adicionar certificado</h2>
              <button onClick={() => { setModalAberto(false); setErro(''); setFicheiro(null); setEquipAutoDetectado(null) }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                  Ficheiro <span className="text-red-500">*</span>
                </label>
                <label
                  className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all"
                  style={{ borderColor: ficheiro ? '#16a34a' : '#e2e8f0', background: ficheiro ? '#f0fdf4' : '#fafafa' }}
                >
                  {ficheiro ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <FileText size={16} />
                      <span className="text-xs font-semibold">{ficheiro.name}</span>
                      <span className="text-xs text-green-500">({formatarTamanho(ficheiro.size)})</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="text-gray-400 mb-2" />
                      <span className="text-xs text-gray-400">Clique para selecionar ficheiro</span>
                      <span className="text-xs text-gray-300 mt-1">PDF, DOC, XLS — máx. 10MB</span>
                    </>
                  )}
                  <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" className="hidden" onChange={e => handleFicheiro(e.target.files?.[0] ?? null)} />
                </label>
                {ficheiro && equipAutoDetectado && (
                  <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <p className="text-xs text-green-700 font-medium">
                      Equipamento detetado automaticamente: <span className="font-bold">{equipAutoDetectado}</span>
                    </p>
                  </div>
                )}
                {ficheiro && !equipAutoDetectado && (
                  <p className="mt-2 text-xs text-gray-400 italic">Nenhum equipamento detetado pelo nome — seleciona manualmente abaixo.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Equipamento (opcional)</label>
                <select
                  value={equipamentoSAP}
                  onChange={e => { setEquipamentoSAP(e.target.value); setEquipAutoDetectado(null) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                >
                  <option value="">Documento geral (sem equipamento)</option>
                  {equipamentos.map(eq => (
                    <option key={eq.numeroSAP} value={eq.numeroSAP}>{eq.descricao} — {eq.numeroSAP}</option>
                  ))}
                </select>
              </div>
              {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setModalAberto(false); setErro(''); setFicheiro(null); setEquipAutoDetectado(null) }} className="text-xs font-semibold text-gray-500 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
                Cancelar
              </button>
              <button onClick={handleUpload} disabled={enviando} className="text-xs font-semibold text-white px-4 py-2 rounded-xl transition-all" style={{ background: enviando ? '#94a3b8' : '#C0001A' }}>
                {enviando ? 'A fazer upload...' : 'Guardar documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}