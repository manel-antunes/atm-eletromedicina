import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Download, Trash2, Search, Filter } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
console.log('API URL:', import.meta.env.VITE_API_URL)
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

const API_URL = 'https://atm-eletromedicina-production.up.railway.app'

const tipoConfig: Record<string, { label: string; cor: string; bg: string }> = {
  'certificado': { label: 'Certificado', cor: '#16a34a', bg: '#f0fdf4' },
  'manual':      { label: 'Manual',      cor: '#2563eb', bg: '#eff6ff' },
  'relatorio':   { label: 'Relatório',   cor: '#7c3aed', bg: '#f5f3ff' },
  'outro':       { label: 'Outro',       cor: '#64748b', bg: '#f8fafc' },
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
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEquip, setFiltroEquip] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ equipamentoSAP: '', tipo: 'certificado' })
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    carregarDocs()
  }, [])

  async function carregarDocs() {
    try {
      const res = await fetch(`${API_URL}/api/documentos`)
      const dados = await res.json()
      setDocumentos(dados)
    } catch {}
    finally { setCarregando(false) }
  }

async function handleUpload() {
  if (!ficheiro) { setErro('Seleciona um ficheiro.'); return }
  if (ficheiro.size > 10 * 1024 * 1024) { setErro('Ficheiro demasiado grande. Máximo 10MB.'); return }

  setEnviando(true)
  setErro('')

  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = () => reject(new Error('Erro ao ler ficheiro'))
      reader.readAsDataURL(ficheiro)
    })

    const res = await fetch(`${API_URL}/api/documentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipamentoSAP: form.equipamentoSAP || null,
        nome: ficheiro.name,
        tipo: form.tipo,
        tamanho: ficheiro.size,
        dados: base64,
      }),
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || 'Erro ao guardar documento')
    }

    await carregarDocs()
    setModalAberto(false)
    setFicheiro(null)
    setForm({ equipamentoSAP: '', tipo: 'certificado' })
  } catch (e) {
    setErro(e instanceof Error ? e.message : 'Erro ao fazer upload.')
  } finally {
    setEnviando(false)
  }
}
  async function handleDownload(doc: Documento) {
    window.open(`${API_URL}/api/documentos/download/${doc.id}`, '_blank')
  }

  async function handleEliminar(id: number) {
    if (!window.confirm('Tens a certeza que queres eliminar este documento?')) return
    await fetch(`${API_URL}/api/documentos/${id}`, { method: 'DELETE' })
    await carregarDocs()
  }

  const filtrados = documentos.filter(doc => {
    const termo = pesquisa.toLowerCase()
    const eq = equipamentos.find(e => e.numeroSAP === doc.equipamento_sap)
    const correspondePesquisa = doc.nome.toLowerCase().includes(termo) ||
      (eq?.descricao.toLowerCase().includes(termo) ?? false)
    const correspondeTipo = filtroTipo === 'todos' || doc.tipo === filtroTipo
    const correspondeEquip = filtroEquip === 'todos' || doc.equipamento_sap === filtroEquip
    return correspondePesquisa && correspondeTipo && correspondeEquip
  })

  const stats = {
    total: documentos.length,
    certificados: documentos.filter(d => d.tipo === 'certificado').length,
    manuais: documentos.filter(d => d.tipo === 'manual').length,
    relatorios: documentos.filter(d => d.tipo === 'relatorio').length,
  }

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total documentos', valor: stats.total, cor: 'text-sky-500', borda: 'border-t-sky-400' },
          { label: 'Certificados',     valor: stats.certificados, cor: 'text-green-600', borda: 'border-t-green-400' },
          { label: 'Manuais',          valor: stats.manuais, cor: 'text-blue-600', borda: 'border-t-blue-400' },
          { label: 'Relatórios',       valor: stats.relatorios, cor: 'text-purple-600', borda: 'border-t-purple-400' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border border-gray-200 p-4 border-t-4 ${s.borda} anim-fade-up`}>
            <p className={`text-2xl font-bold font-mono ${s.cor}`}>{s.valor}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros e botão */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          {/* Pesquisa */}
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

          {/* Filtro tipo */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Filter size={13} className="text-gray-400" />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="text-xs text-gray-600 outline-none bg-transparent"
            >
              <option value="todos">Todos os tipos</option>
              <option value="certificado">Certificados</option>
              <option value="manual">Manuais</option>
              <option value="relatorio">Relatórios</option>
              <option value="outro">Outros</option>
            </select>
          </div>

          {/* Filtro equipamento */}
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
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 text-xs font-semibold text-white px-4 py-2.5 rounded-xl transition-all flex-shrink-0"
          style={{ background: '#C0001A' }}
        >
          <Upload size={13} />
          Adicionar documento
        </button>
      </div>

      {/* Lista de documentos */}
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
          <p className="text-xs text-gray-300 mt-1">Clica em "Adicionar documento" para fazer upload</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Equipamento</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Tamanho</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(doc => {
                const cfg = tipoConfig[doc.tipo] ?? tipoConfig['outro']
                const eq = equipamentos.find(e => e.numeroSAP === doc.equipamento_sap)
                return (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div style={{ background: cfg.bg, borderRadius: 8, padding: 8 }}>
                          <FileText size={14} style={{ color: cfg.cor }} />
                        </div>
                        <p className="text-xs font-semibold text-gray-800 max-w-48 truncate">{doc.nome}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ background: cfg.bg, color: cfg.cor }} className="text-xs font-bold px-2.5 py-1 rounded-full">
                        {cfg.label}
                      </span>
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
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Download"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={() => handleEliminar(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
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
              <h2 className="text-sm font-bold text-gray-800">Adicionar documento</h2>
              <button onClick={() => { setModalAberto(false); setErro(''); setFicheiro(null) }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">

              {/* Tipo */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tipo de documento</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(tipoConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setForm({ ...form, tipo: key })}
                      style={{
                        background: form.tipo === key ? cfg.bg : '#f8fafc',
                        border: `1.5px solid ${form.tipo === key ? cfg.cor : '#e2e8f0'}`,
                        color: form.tipo === key ? cfg.cor : '#64748b',
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipamento */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Equipamento (opcional)</label>
                <select
                  value={form.equipamentoSAP}
                  onChange={e => setForm({ ...form, equipamentoSAP: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                >
                  <option value="">Documento geral (sem equipamento)</option>
                  {equipamentos.map(eq => (
                    <option key={eq.numeroSAP} value={eq.numeroSAP}>
                      {eq.descricao} — {eq.numeroSAP}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Ficheiro <span className="text-red-500">*</span></label>
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
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                    className="hidden"
                    onChange={e => setFicheiro(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setModalAberto(false); setErro(''); setFicheiro(null) }}
                className="text-xs font-semibold text-gray-500 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={enviando}
                className="text-xs font-semibold text-white px-4 py-2 rounded-xl transition-all"
                style={{ background: enviando ? '#94a3b8' : '#C0001A' }}
              >
                {enviando ? 'A fazer upload...' : 'Guardar documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}