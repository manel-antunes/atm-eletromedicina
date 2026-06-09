import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, Clock, X } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'

interface Cedencia {
  id: number
  equipamentoNome: string
  destino: string
  dataRetornoPrevista: string
  ativa: boolean
}

interface Alerta {
  id: string
  tipo: 'calibracao' | 'cedencia'
  titulo: string
  subtitulo: string
  urgencia: 'critica' | 'alta' | 'media'
}

function parseData(dataStr: string): Date | null {
  if (!dataStr || dataStr === 'undefined') return null
  const n = Number(dataStr)
  if (!isNaN(n) && n > 40000) {
    const d = new Date((n - 25569) * 86400 * 1000)
    if (isValid(d)) return d
  }
  for (const fmt of ['M/d/yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']) {
    const t = parse(dataStr, fmt, new Date())
    if (isValid(t)) return t
  }
  return null
}

function calcularAlertas(equipamentos: Equipamento[]): Alerta[] {
  const alertas: Alerta[] = []

  for (const eq of equipamentos) {
    const proxima = parseData(eq.dataCalibracao)
    if (!proxima) {
      alertas.push({ id: `cal-${eq.id}`, tipo: 'calibracao', titulo: eq.descricao, subtitulo: 'Data de calibração desconhecida', urgencia: 'critica' })
      continue
    }
    const dias = differenceInDays(proxima, new Date())
    if (dias < 0)    alertas.push({ id: `cal-${eq.id}`, tipo: 'calibracao', titulo: eq.descricao, subtitulo: `Vencida há ${Math.abs(dias)} dias`, urgencia: 'critica' })
    else if (dias <= 30) alertas.push({ id: `cal-${eq.id}`, tipo: 'calibracao', titulo: eq.descricao, subtitulo: `Expira em ${dias} dias`, urgencia: 'alta' })
    else if (dias <= 60) alertas.push({ id: `cal-${eq.id}`, tipo: 'calibracao', titulo: eq.descricao, subtitulo: `Expira em ${dias} dias`, urgencia: 'media' })
  }

  try {
    const ceds: Cedencia[] = JSON.parse(localStorage.getItem('atm_cedencias') ?? '[]')
    for (const c of ceds.filter(c => c.ativa)) {
      const retorno = new Date(c.dataRetornoPrevista)
      if (!isValid(retorno)) continue
      const dias = differenceInDays(retorno, new Date())
      if (dias < 0) alertas.push({ id: `ced-${c.id}`, tipo: 'cedencia', titulo: c.equipamentoNome, subtitulo: `Retorno em atraso ${Math.abs(dias)}d — ${c.destino}`, urgencia: 'critica' })
      else if (dias <= 3) alertas.push({ id: `ced-${c.id}`, tipo: 'cedencia', titulo: c.equipamentoNome, subtitulo: `Retorno previsto em ${dias}d — ${c.destino}`, urgencia: 'alta' })
    }
  } catch { /* localStorage pode não estar disponível */ }

  return alertas.sort((a, b) => {
    const o = { critica: 0, alta: 1, media: 2 }
    return o[a.urgencia] - o[b.urgencia]
  })
}

const URGENCIA_COR: Record<string, string> = { critica: '#ef4444', alta: '#f97316', media: '#eab308' }
const URGENCIA_BG:  Record<string, string> = { critica: '#fef2f2', alta: '#fff7ed', media: '#fefce8' }

interface Props { equipamentos: Equipamento[] }

export default function NotificacoesInApp({ equipamentos }: Props) {
  const [aberto, setAberto] = useState(false)
  const [lidos, setLidos] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('atm_notif_lidos') ?? '[]')) }
    catch { return new Set() }
  })
  const ref = useRef<HTMLDivElement>(null)

  const alertas = calcularAlertas(equipamentos)
  const naoLidos = alertas.filter(a => !lidos.has(a.id)).length

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function marcarTodosLidos() {
    const novos = new Set(alertas.map(a => a.id))
    setLidos(novos)
    localStorage.setItem('atm_notif_lidos', JSON.stringify([...novos]))
  }

  function dispensar(id: string) {
    const novos = new Set([...lidos, id])
    setLidos(novos)
    localStorage.setItem('atm_notif_lidos', JSON.stringify([...novos]))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(v => !v)}
        aria-label={`Notificações — ${naoLidos} não lidas`}
        aria-haspopup="true"
        aria-expanded={aberto}
        style={{
          position: 'relative', background: 'none', border: '1px solid #e2e8f0',
          borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', color: naoLidos > 0 ? '#C0001A' : '#64748b',
          transition: 'all 0.15s',
        }}
      >
        <Bell size={16} />
        {naoLidos > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#C0001A', color: '#fff', fontSize: 9, fontWeight: 800,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {naoLidos > 9 ? '9+' : naoLidos}
          </span>
        )}
      </button>

      {aberto && (
        <div role="dialog" aria-label="Painel de notificações" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, maxHeight: 480, overflowY: 'auto',
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 100,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
              Notificações {naoLidos > 0 && <span style={{ background: '#fef2f2', color: '#C0001A', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, marginLeft: 6 }}>{naoLidos} novas</span>}
            </p>
            {naoLidos > 0 && (
              <button onClick={marcarTodosLidos} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          {alertas.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <Bell size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
              Sem alertas activos
            </div>
          ) : (
            alertas.map(a => {
              const lido = lidos.has(a.id)
              return (
                <div key={a.id} style={{
                  padding: '12px 16px', borderBottom: '1px solid #f9fafb',
                  background: lido ? '#fff' : URGENCIA_BG[a.urgencia],
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  opacity: lido ? 0.55 : 1, transition: 'opacity 0.2s',
                }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}>
                    {a.tipo === 'calibracao'
                      ? <AlertTriangle size={14} color={URGENCIA_COR[a.urgencia]} />
                      : <Clock size={14} color={URGENCIA_COR[a.urgencia]} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</p>
                    <p style={{ fontSize: 11, color: URGENCIA_COR[a.urgencia], margin: 0 }}>{a.subtitulo}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {a.tipo === 'calibracao' ? 'Calibração' : 'Cedência'}
                    </p>
                  </div>
                  {!lido && (
                    <button onClick={() => dispensar(a.id)} aria-label="Dispensar notificação" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, flexShrink: 0 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
