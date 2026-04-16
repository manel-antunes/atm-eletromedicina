import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'

// Fix ícones Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
}

// Coordenadas dos locais hospitalares
const LOCAIS: Record<string, { lat: number; lng: number; nome: string; cidade: string }> = {
'HPRT':      { lat: 41.1589, lng: -8.6537, nome: 'Hospital CUF Porto',           cidade: 'Porto' },
'FIXO HPRT': { lat: 41.1589, lng: -8.6537, nome: 'Hospital CUF Porto',           cidade: 'Porto' },
  'HTRD':      { lat: 41.1476, lng: -8.6157, nome: 'Hospital CUF Trindade',        cidade: 'Porto' },
  'FIXO HTRD': { lat: 41.1476, lng: -8.6157, nome: 'Hospital CUF Trindade',        cidade: 'Porto' },
  'CINS':      { lat: 41.1781, lng: -8.5985, nome: 'Instituto CUF Porto',          cidade: 'Matosinhos' },
  'FIXO CINS': { lat: 41.1781, lng: -8.5985, nome: 'Instituto CUF Porto',          cidade: 'Matosinhos' },
  'HBRAGA':    { lat: 41.5369, lng: -8.4200, nome: 'Hospital de Braga',            cidade: 'Braga' },
  'ISQ':       { lat: 38.7481, lng: -9.1774, nome: 'Instituto Superior de Qualidade', cidade: 'Oeiras' },
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

function encontrarLocal(localizacao: string) {
  if (!localizacao) return null
  const loc = localizacao.toUpperCase().trim()
  for (const [chave, dados] of Object.entries(LOCAIS)) {
    if (loc.includes(chave)) return { chave, ...dados }
  }
  return null
}

function criarIcone(estado: string, count: number) {
  const cores = { vencido: '#dc2626', urgente: '#f97316', aviso: '#eab308', ok: '#16a34a' }
  const cor = cores[estado as keyof typeof cores] ?? '#64748b'
  return L.divIcon({
    html: `
      <div style="
        background: ${cor};
        width: ${count > 5 ? 44 : count > 2 ? 38 : 32}px;
        height: ${count > 5 ? 44 : count > 2 ? 38 : 32}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: ${count > 9 ? 11 : 13}px;
        font-family: monospace;
      ">${count}</div>
    `,
    className: '',
    iconSize: [count > 5 ? 44 : 32, count > 5 ? 44 : 32],
    iconAnchor: [count > 5 ? 22 : 16, count > 5 ? 22 : 16],
  })
}

export default function Mapa({ equipamentos, onVerDetalhe }: Props) {
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [localSelecionado, setLocalSelecionado] = useState<string | null>(null)

  const equipFiltrados = useMemo(() => {
    if (filtroEstado === 'todos') return equipamentos
    return equipamentos.filter(eq => getEstado(eq) === filtroEstado)
  }, [equipamentos, filtroEstado])

  // Agrupa equipamentos por local
  const locaisComEquip = useMemo(() => {
    const mapa: Record<string, { local: typeof LOCAIS[string] & { chave: string }; equipamentos: Equipamento[] }> = {}
    equipFiltrados.forEach(eq => {
      const local = encontrarLocal(eq.localizacao ?? '')
      if (!local) return
      const chave = local.chave
      if (!mapa[chave]) mapa[chave] = { local, equipamentos: [] }
      mapa[chave].equipamentos.push(eq)
    })
    return Object.values(mapa)
  }, [equipFiltrados])

  const semLocal = useMemo(() =>
    equipFiltrados.filter(eq => !encontrarLocal(eq.localizacao ?? '')),
    [equipFiltrados]
  )

  // Estado dominante de cada local
  function getEstadoDominante(eqs: Equipamento[]): string {
    const estados = eqs.map(getEstado)
    if (estados.includes('vencido')) return 'vencido'
    if (estados.includes('urgente')) return 'urgente'
    if (estados.includes('aviso')) return 'aviso'
    return 'ok'
  }

  const corEstado = { vencido: '#dc2626', urgente: '#f97316', aviso: '#eab308', ok: '#16a34a' }
  const labelEstado = { vencido: 'Vencida', urgente: 'Urgente', aviso: 'Em breve', ok: 'Em dia' }
  const bgEstado = { vencido: '#fef2f2', urgente: '#fff7ed', aviso: '#fffbeb', ok: '#f0fdf4' }

  const stats = {
    locais: locaisComEquip.length,
    mapeados: equipFiltrados.length - semLocal.length,
    semLocal: semLocal.length,
  }

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-sky-400">
          <p className="text-2xl font-bold font-mono text-sky-500">{equipamentos.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total equipamentos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-green-400">
          <p className="text-2xl font-bold font-mono text-green-600">{stats.locais}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Locais no mapa</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-blue-400">
          <p className="text-2xl font-bold font-mono text-blue-600">{stats.mapeados}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Equipamentos mapeados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 border-t-4 border-t-gray-400">
          <p className="text-2xl font-bold font-mono text-gray-500">{stats.semLocal}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Sem localização</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'todos',   label: 'Todos',     count: equipamentos.length },
          { id: 'vencido', label: 'Vencidas',  count: equipamentos.filter(e => getEstado(e) === 'vencido').length },
          { id: 'urgente', label: 'Urgentes',  count: equipamentos.filter(e => getEstado(e) === 'urgente').length },
          { id: 'aviso',   label: 'Em breve',  count: equipamentos.filter(e => getEstado(e) === 'aviso').length },
          { id: 'ok',      label: 'Em dia',    count: equipamentos.filter(e => getEstado(e) === 'ok').length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFiltroEstado(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filtroEstado === f.id
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label} <span className="opacity-60 ml-1">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Mapa + Painel lateral */}
      <div className="flex gap-4" style={{ height: 520 }}>

        {/* Mapa */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <MapContainer
            center={[41.15, -8.61]}
            zoom={9}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />

            {locaisComEquip.map(({ local, equipamentos: eqs }) => {
              const estado = getEstadoDominante(eqs)
              const cor = corEstado[estado as keyof typeof corEstado]
              return (
                <div key={local.chave}>
                  <Circle
                    center={[local.lat, local.lng]}
                    radius={800}
                    pathOptions={{ color: cor, fillColor: cor, fillOpacity: 0.08, weight: 1 }}
                  />
                  <Marker
                    position={[local.lat, local.lng]}
                    icon={criarIcone(estado, eqs.length)}
                    eventHandlers={{ click: () => setLocalSelecionado(local.chave) }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif' }}>
                        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{local.nome}</p>
                        <p style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>{local.cidade}</p>
                        <p style={{ fontSize: 11, fontWeight: 600, color: cor, marginBottom: 8 }}>
                          {eqs.length} equipamento(s)
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {eqs.slice(0, 4).map(eq => (
                            <div
                              key={eq.id}
                              onClick={() => onVerDetalhe(eq)}
                              style={{ background: bgEstado[getEstado(eq) as keyof typeof bgEstado], borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 10 }}
                            >
                              <p style={{ fontWeight: 600, color: '#1e293b' }}>{eq.descricao}</p>
                              <p style={{ color: '#64748b' }}>{eq.marca} {eq.modelo}</p>
                            </div>
                          ))}
                          {eqs.length > 4 && (
                            <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>+{eqs.length - 4} mais</p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              )
            })}
          </MapContainer>
        </div>

        {/* Painel lateral */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Locais</p>
          {locaisComEquip.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-xs text-gray-400">Nenhum local encontrado</p>
            </div>
          ) : (
            locaisComEquip.map(({ local, equipamentos: eqs }) => {
              const estado = getEstadoDominante(eqs)
              const cor = corEstado[estado as keyof typeof corEstado]
              const bg = bgEstado[estado as keyof typeof bgEstado]
              const isSelected = localSelecionado === local.chave
              return (
                <div
                  key={local.chave}
                  onClick={() => setLocalSelecionado(isSelected ? null : local.chave)}
                  style={{
                    background: isSelected ? bg : '#fff',
                    border: `1px solid ${isSelected ? cor : '#f1f5f9'}`,
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{local.nome}</p>
                    <div style={{ background: cor, color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
                      {eqs.length}
                    </div>
                  </div>
                  <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>{local.cidade}</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(['vencido', 'urgente', 'aviso', 'ok'] as const).map(e => {
                      const count = eqs.filter(eq => getEstado(eq) === e).length
                      if (count === 0) return null
                      return (
                        <span key={e} style={{ background: bgEstado[e], color: corEstado[e], fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99 }}>
                          {labelEstado[e]}: {count}
                        </span>
                      )
                    })}
                  </div>

                  {/* Lista de equipamentos ao expandir */}
                  {isSelected && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${cor}22`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {eqs.map(eq => (
                        <div
                          key={eq.id}
                          onClick={e => { e.stopPropagation(); onVerDetalhe(eq) }}
                          style={{ background: bgEstado[getEstado(eq) as keyof typeof bgEstado], borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}
                        >
                          <p style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{eq.descricao}</p>
                          <p style={{ fontSize: 9, color: '#94a3b8' }}>{eq.marca} {eq.modelo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {semLocal.length > 0 && (
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                Sem localização mapeada ({semLocal.length})
              </p>
              {semLocal.slice(0, 3).map(eq => (
                <p key={eq.id} style={{ fontSize: 10, color: '#cbd5e1', marginBottom: 2 }}>· {eq.descricao}</p>
              ))}
              {semLocal.length > 3 && <p style={{ fontSize: 10, color: '#cbd5e1' }}>+{semLocal.length - 3} mais</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}