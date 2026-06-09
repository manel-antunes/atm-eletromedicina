import { useState, useMemo } from 'react'
import { Phone, Mail, Globe, MapPin, Edit2, Check, X, Plus, ChevronDown } from 'lucide-react'
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
  const [cardExpandido, setCardExpandido] = useState<string | null>(null)
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
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-sky-400">
          <p className="text-2xl font-bold font-mono text-sky-500">{Object.keys(contactos).length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Marcas no inventário</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-green-400">
          <p className="text-2xl font-bold font-mono text-green-600">{preenchidos}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Contactos preenchidos</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 border-t-4 border-t-orange-400">
          <p className="text-2xl font-bold font-mono text-orange-500">{Object.keys(contactos).length - preenchidos}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Por preencher</p>
        </div>
      </div>

      {/* Filtros e botão */}
      <div className="flex gap-3 items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 flex-1">
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
          className="flex items-center gap-2 text-xs font-semibold text-white px-4 py-2.5 flex-shrink-0"
          style={{ background: '#C0001A' }}
        >
          <Plus size={13} />
          Adicionar contacto
        </button>
      </div>

      {/* Cards de contactos */}
<div className="space-y-2">
  {filtradas.map(contacto => {
    const eqDaMarca = equipamentos.filter(e => e.marca === contacto.marca)
    const estaEditando = editando === contacto.marca
    const dados = estaEditando && formEdit ? formEdit : contacto
    const totalPreenchidos = [contacto.website, contacto.email, contacto.telefone, contacto.morada, contacto.representante]
      .filter(v => v && v !== 'Por Preencher').length
    const expandido = cardExpandido === contacto.marca

    return (
      <div key={contacto.marca} className="bg-white border border-gray-100 shadow-sm overflow-hidden">

        {/* Linha compacta sempre visível */}
        <div
          onClick={() => !estaEditando && setCardExpandido(expandido ? null : contacto.marca)}
          className={`flex items-center gap-4 px-5 py-3.5 ${!estaEditando ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
        >
          {/* Indicador preenchimento */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: totalPreenchidos >= 3 ? '#22c55e' : totalPreenchidos > 0 ? '#eab308' : '#ef4444'
          }} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">{contacto.marca}</p>
            <p className="text-xs text-gray-400">{eqDaMarca.length} equipamento(s) · {totalPreenchidos}/5 campos preenchidos</p>
          </div>

          {/* Badges modelos */}
          <div className="hidden md:flex gap-1">
            {eqDaMarca.slice(0, 2).map(eq => (
              <span key={eq.id} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5">{eq.modelo || eq.descricao}</span>
            ))}
            {eqDaMarca.length > 2 && <span className="text-xs text-gray-400">+{eqDaMarca.length - 2}</span>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!estaEditando ? (
              <button
                onClick={e => { e.stopPropagation(); iniciarEdicao(contacto.marca) }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 transition-all"
              >
                <Edit2 size={11} className="inline mr-1" />Editar
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button onClick={e => { e.stopPropagation(); guardarEdicao() }} className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5">
                  <Check size={11} className="inline mr-1" />Guardar
                </button>
                <button onClick={e => { e.stopPropagation(); cancelarEdicao() }} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5">
                  <X size={11} className="inline mr-1" />Cancelar
                </button>
              </div>
            )}
            {!estaEditando && (
              <ChevronDown
                size={14}
                className="text-gray-400 transition-transform duration-200"
                style={{ transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            )}
          </div>
        </div>

        {/* Conteúdo expansível */}
        <div style={{
          maxHeight: expandido || estaEditando ? 500 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div className="px-5 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 pt-4">
              {campos.map(campo => {
                const valor = dados[campo.key as keyof Contacto]
                const porPreencher = valor === 'Por Preencher' || !valor
                return (
                  <div key={campo.key} className="flex items-start gap-3">
                    <div style={{ color: porPreencher ? '#cbd5e1' : '#64748b', marginTop: 2, flexShrink: 0 }}>
                      {campo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{campo.label}</p>
                      {estaEditando ? (
                        <input
                          type="text"
                          value={formEdit?.[campo.key as keyof Contacto] ?? ''}
                          onChange={e => setFormEdit(prev => prev ? { ...prev, [campo.key]: e.target.value } : null)}
                          className="w-full text-xs border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-red-400"
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
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-1">Notas</p>
              {estaEditando ? (
                <textarea
                  value={formEdit?.notas ?? ''}
                  onChange={e => setFormEdit(prev => prev ? { ...prev, notas: e.target.value } : null)}
                  className="w-full text-xs border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-red-400 resize-none h-14"
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
      </div>
    )
  })}
</div>

      {/* Modal novo contacto */}
      {novoModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md shadow-xl">
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
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setNovoModal(false)} className="text-xs font-semibold text-gray-500 px-4 py-2 border border-gray-200">
                Cancelar
              </button>
              <button
                onClick={adicionarContacto}
                className="text-xs font-semibold text-white px-4 py-2"
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