import { useState, useMemo } from 'react'
import { Phone, Mail, Globe, MapPin, Edit2, Check, X, Plus } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'

interface Props {
  equipamentos: Equipamento[]
}

interface Contacto {
  marca: string
  website: string
  email: string
  telefone: string
  morada: string
  representante: string
  notas: string
}

const CHAVE = 'atm_contactos'

function carregarContactos(marcas: string[]): Record<string, Contacto> {
  try {
    const guardados = localStorage.getItem(CHAVE)
    const base = guardados ? JSON.parse(guardados) : {}
    const resultado: Record<string, Contacto> = {}
    marcas.forEach(marca => {
      resultado[marca] = base[marca] ?? {
        marca,
        website: 'Por Preencher',
        email: 'Por Preencher',
        telefone: 'Por Preencher',
        morada: 'Por Preencher',
        representante: 'Por Preencher',
        notas: '',
      }
    })
    return resultado
  } catch { return {} }
}

function guardarContactos(contactos: Record<string, Contacto>) {
  localStorage.setItem(CHAVE, JSON.stringify(contactos))
}

export default function Contactos({ equipamentos }: Props) {
  const marcas = useMemo(() => [...new Set(equipamentos.map(e => e.marca).filter(Boolean))].sort(), [equipamentos])
  const [contactos, setContactos] = useState<Record<string, Contacto>>(() => carregarContactos(marcas))
  const [editando, setEditando] = useState<string | null>(null)
  const [formEdit, setFormEdit] = useState<Contacto | null>(null)
  const [pesquisa, setPesquisa] = useState('')
  const [novoModal, setNovoModal] = useState(false)
  const [novaEntrada, setNovaEntrada] = useState<Contacto>({
    marca: '', website: '', email: '', telefone: '', morada: '', representante: '', notas: '',
  })

  const filtradas = Object.values(contactos).filter(c =>
    c.marca.toLowerCase().includes(pesquisa.toLowerCase())
  )

  function iniciarEdicao(marca: string) {
    setEditando(marca)
    setFormEdit({ ...contactos[marca] })
  }

  function guardarEdicao() {
    if (!editando || !formEdit) return
    const novos = { ...contactos, [editando]: formEdit }
    setContactos(novos)
    guardarContactos(novos)
    setEditando(null)
    setFormEdit(null)
  }

  function cancelarEdicao() {
    setEditando(null)
    setFormEdit(null)
  }

  function adicionarContacto() {
    if (!novaEntrada.marca.trim()) return
    const novos = { ...contactos, [novaEntrada.marca]: novaEntrada }
    setContactos(novos)
    guardarContactos(novos)
    setNovoModal(false)
    setNovaEntrada({ marca: '', website: '', email: '', telefone: '', morada: '', representante: '', notas: '' })
  }

  const campos = [
    { key: 'website',       label: 'Website',          icon: <Globe size={13} /> },
    { key: 'email',         label: 'Email',             icon: <Mail size={13} /> },
    { key: 'telefone',      label: 'Telefone',          icon: <Phone size={13} /> },
    { key: 'morada',        label: 'Morada',            icon: <MapPin size={13} /> },
    { key: 'representante', label: 'Representante PT',  icon: <Phone size={13} /> },
  ]

  const preenchidos = Object.values(contactos).filter(c => c.email !== 'Por Preencher' || c.telefone !== 'Por Preencher').length

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-sky-400">
          <p className="text-2xl font-bold font-mono text-sky-500">{Object.keys(contactos).length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Marcas no inventário</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-green-400">
          <p className="text-2xl font-bold font-mono text-green-600">{preenchidos}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Contactos preenchidos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-orange-400">
          <p className="text-2xl font-bold font-mono text-orange-500">{Object.keys(contactos).length - preenchidos}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Por preencher</p>
        </div>
      </div>

      {/* Filtros e botão */}
      <div className="flex gap-3 items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1">
          <input
            type="text"
            placeholder="Pesquisar marca..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
        </div>
        <button
          onClick={() => setNovoModal(true)}
          className="flex items-center gap-2 text-xs font-semibold text-white px-4 py-2.5 rounded-xl flex-shrink-0"
          style={{ background: '#C0001A' }}
        >
          <Plus size={13} />
          Adicionar contacto
        </button>
      </div>

      {/* Cards de contactos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtradas.map(contacto => {
          const eqDaMarca = equipamentos.filter(e => e.marca === contacto.marca)
          const estaEditando = editando === contacto.marca
          const dados = estaEditando && formEdit ? formEdit : contacto
          const totalPreenchidos = [contacto.website, contacto.email, contacto.telefone, contacto.morada, contacto.representante]
            .filter(v => v && v !== 'Por Preencher').length

          return (
            <div key={contacto.marca} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Header do card */}
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '16px 20px' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{contacto.marca}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                      {eqDaMarca.length} equipamento(s) no inventário
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{
                      background: totalPreenchidos >= 3 ? 'rgba(34,197,94,0.2)' : totalPreenchidos > 0 ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
                      borderRadius: 99, padding: '3px 10px',
                    }}>
                      <span style={{
                        color: totalPreenchidos >= 3 ? '#4ade80' : totalPreenchidos > 0 ? '#facc15' : '#f87171',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {totalPreenchidos}/5 preenchidos
                      </span>
                    </div>
                    {!estaEditando ? (
                      <button
                        onClick={() => iniciarEdicao(contacto.marca)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                      >
                        <Edit2 size={11} /> Editar
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={guardarEdicao} style={{ background: 'rgba(34,197,94,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                          <Check size={11} /> Guardar
                        </button>
                        <button onClick={cancelarEdicao} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                          <X size={11} /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini lista de equipamentos */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {eqDaMarca.slice(0, 3).map(eq => (
                    <span key={eq.id} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 10, padding: '2px 8px', borderRadius: 99 }}>
                      {eq.modelo || eq.descricao}
                    </span>
                  ))}
                  {eqDaMarca.length > 3 && (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, padding: '2px 0' }}>+{eqDaMarca.length - 3} mais</span>
                  )}
                </div>
              </div>

              {/* Campos de contacto */}
              <div className="p-4 space-y-3">
                {campos.map(campo => {
                  const valor = dados[campo.key as keyof Contacto]
                  const porPreencher = valor === 'Por Preencher' || !valor
                  return (
                    <div key={campo.key} className="flex items-start gap-3">
                      <div style={{ color: porPreencher ? '#cbd5e1' : '#64748b', marginTop: 1, flexShrink: 0 }}>
                        {campo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{campo.label}</p>
                        {estaEditando ? (
                          <input
                            type="text"
                            value={formEdit?.[campo.key as keyof Contacto] ?? ''}
                            onChange={e => setFormEdit(prev => prev ? { ...prev, [campo.key]: e.target.value } : null)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-400"
                            placeholder={`Inserir ${campo.label.toLowerCase()}...`}
                          />
                        ) : (
                          <p className={`text-xs font-medium truncate ${porPreencher ? 'text-gray-300 italic' : 'text-gray-700'}`}>
                            {valor || 'Por Preencher'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Notas */}
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                  {estaEditando ? (
                    <textarea
                      value={formEdit?.notas ?? ''}
                      onChange={e => setFormEdit(prev => prev ? { ...prev, notas: e.target.value } : null)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-400 resize-none h-16"
                      placeholder="Notas adicionais..."
                    />
                  ) : (
                    <p className={`text-xs ${dados.notas ? 'text-gray-600' : 'text-gray-300 italic'}`}>
                      {dados.notas || 'Sem notas'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal novo contacto */}
      {novoModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Adicionar contacto</h2>
              <button onClick={() => setNovoModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { key: 'marca',         label: 'Marca *' },
                { key: 'website',       label: 'Website' },
                { key: 'email',         label: 'Email' },
                { key: 'telefone',      label: 'Telefone' },
                { key: 'morada',        label: 'Morada' },
                { key: 'representante', label: 'Representante PT' },
              ].map(campo => (
                <div key={campo.key}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">{campo.label}</label>
                  <input
                    type="text"
                    value={novaEntrada[campo.key as keyof Contacto]}
                    onChange={e => setNovaEntrada(prev => ({ ...prev, [campo.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setNovoModal(false)} className="text-xs font-semibold text-gray-500 px-4 py-2 rounded-xl border border-gray-200">
                Cancelar
              </button>
              <button
                onClick={adicionarContacto}
                className="text-xs font-semibold text-white px-4 py-2 rounded-xl"
                style={{ background: '#C0001A' }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}