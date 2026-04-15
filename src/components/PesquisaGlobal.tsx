import { useState, useEffect, useRef } from 'react'
import { Search, X, Calendar, MapPin } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'

interface Props {
  equipamentos: Equipamento[]
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

function getEstado(eq: Equipamento) {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'vencido'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return 'vencido'
  if (diff <= 30) return 'urgente'
  if (diff <= 60) return 'aviso'
  return 'ok'
}

const estadoCfg = {
  vencido: { label: 'Vencida', color: '#ef4444', bg: '#fee2e2' },
  urgente: { label: 'Urgente', color: '#f97316', bg: '#ffedd5' },
  aviso:   { label: 'Em breve', color: '#eab308', bg: '#fef9c3' },
  ok:      { label: 'Em dia', color: '#16a34a', bg: '#dcfce7' },
}

export default function PesquisaGlobal({ equipamentos, onVerDetalhe }: Props) {
  const [aberto, setAberto] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setAberto(true)
        setQuery('')
      }
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 50)
  }, [aberto])

  const resultados = query.length < 2 ? [] : equipamentos.filter(eq => {
    const t = query.toLowerCase()
    return (
      eq.descricao.toLowerCase().includes(t) ||
      eq.marca.toLowerCase().includes(t) ||
      eq.modelo.toLowerCase().includes(t) ||
      eq.numeroSAP.includes(t) ||
      eq.numeroSerie?.toLowerCase().includes(t) ||
      eq.localizacao?.toLowerCase().includes(t) ||
      eq.responsavel?.toLowerCase().includes(t)
    )
  }).slice(0, 8)

  if (!aberto) return (
    <button
      onClick={() => { setAberto(true); setQuery('') }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
    >
      <Search size={13} color="#94a3b8" />
      <span style={{ fontSize: 12, color: '#94a3b8' }}>Pesquisar...</span>
      <span style={{ fontSize: 10, color: '#cbd5e1', background: '#f1f5f9', padding: '2px 6px', borderRadius: 5, fontFamily: 'monospace' }}>
        Ctrl K
      </span>
    </button>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
      onClick={e => { if (e.target === e.currentTarget) setAberto(false) }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: resultados.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
          <Search size={18} color="#94a3b8" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar equipamento, marca, nº SAP, localização..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={16} />
            </button>
          )}
          <kbd style={{ fontSize: 10, color: '#cbd5e1', background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>Esc</kbd>
        </div>

        {/* Resultados */}
        {query.length >= 2 && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {resultados.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum equipamento encontrado</p>
                <p style={{ color: '#cbd5e1', fontSize: 11, marginTop: 4 }}>Tenta pesquisar por marca, modelo ou nº SAP</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {resultados.length} resultado(s)
                  </span>
                </div>
                {resultados.map(eq => {
                  const estado = getEstado(eq)
                  const cfg = estadoCfg[estado]
                  const proxima = parseData(eq.dataCalibracao)
                  return (
                    <div
                      key={eq.id}
                      onClick={() => { onVerDetalhe(eq); setAberto(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', cursor: 'pointer', transition: 'background 0.1s',
                        borderBottom: '1px solid #f8fafc',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{eq.descricao}</p>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{eq.marca} {eq.modelo}</span>
                          <span style={{ fontSize: 11, color: '#cbd5e1' }}>·</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{eq.numeroSAP}</span>
                          {eq.localizacao && (
                            <>
                              <span style={{ fontSize: 11, color: '#cbd5e1' }}>·</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94a3b8' }}>
                                <MapPin size={10} />
                                {eq.localizacao}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        {proxima && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <Calendar size={10} color="#94a3b8" />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              {proxima.toLocaleDateString('pt-PT')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {query.length < 2 && (
          <div style={{ padding: '20px 16px' }}>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Sugestões
            </p>
            {equipamentos.filter(eq => {
              const proxima = parseData(eq.dataCalibracao)
              if (!proxima) return true
              return differenceInDays(proxima, new Date()) <= 30
            }).slice(0, 4).map(eq => {
              const estado = getEstado(eq)
              const cfg = estadoCfg[estado]
              return (
                <div
                  key={eq.id}
                  onClick={() => { onVerDetalhe(eq); setAberto(false) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{eq.descricao}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}