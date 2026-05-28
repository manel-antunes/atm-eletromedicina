import { useEffect, useState } from 'react'
import {WifiOff, RefreshCw } from 'lucide-react'

interface Props {
  sincronizando: boolean
  ultimaSync: Date | null
  erro: boolean
}

export default function SyncIndicator({ sincronizando, ultimaSync, erro }: Props) {
  const [tempoDecorrido, setTempoDecorrido] = useState('')

  useEffect(() => {
    if (!ultimaSync) return
    function atualizar() {
      if (!ultimaSync) return
      const diff = Math.floor((Date.now() - ultimaSync.getTime()) / 1000)
      if (diff < 60) setTempoDecorrido(`há ${diff}s`)
      else if (diff < 3600) setTempoDecorrido(`há ${Math.floor(diff / 60)}min`)
      else setTempoDecorrido(`há ${Math.floor(diff / 3600)}h`)
    }
    atualizar()
    const interval = setInterval(atualizar, 10000)
    return () => clearInterval(interval)
  }, [ultimaSync])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {sincronizando ? (
        <>
          <RefreshCw size={11} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 10, color: '#94a3b8' }}>A sincronizar...</span>
        </>
      ) : erro ? (
        <>
          <WifiOff size={11} color="#ef4444" />
          <span style={{ fontSize: 10, color: '#ef4444' }}>Sem ligação</span>
        </>
      ) : (
        <>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' }} />
          <span style={{ fontSize: 10, color: '#94a3b8' }}>Sync {tempoDecorrido}</span>
        </>
      )}
    </div>
  )
}