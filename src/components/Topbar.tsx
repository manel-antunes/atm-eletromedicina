import { useState, useEffect } from 'react'
import { RefreshCw, Presentation, Download, Menu, RefreshCw as Sync, WifiOff } from 'lucide-react'
import { limparEquipamentos } from '../data/storage'
import PesquisaGlobal from './PesquisaGlobal'
import type { Equipamento } from '../data/equipamentos'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Props {
  titulo: string
  totalEquipamentos: number
  onReimportar: () => void
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
  onApresentacao: () => void
  onMenuToggle: () => void
  isMobile: boolean
  sincronizando: boolean
  ultimaSync: Date | null
  erroBackend: boolean
}

function SyncIndicator({ sincronizando, ultimaSync, erro }: { sincronizando: boolean; ultimaSync: Date | null; erro: boolean }) {
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

  if (sincronizando) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <Sync size={11} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 10, color: '#94a3b8' }}>A sincronizar...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (erro) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <WifiOff size={11} color="#ef4444" />
      <span style={{ fontSize: 10, color: '#ef4444' }}>Sem ligação</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' }} />
      <span style={{ fontSize: 10, color: '#94a3b8' }}>Sync {tempoDecorrido}</span>
    </div>
  )
}

export default function Topbar({ titulo, totalEquipamentos, onReimportar, equipamentos, onVerDetalhe, onApresentacao, onMenuToggle, isMobile, sincronizando, ultimaSync, erroBackend }: Props) {
  const [podeInstalar, setPodeInstalar] = useState(false)
  const [promptInstalacao, setPromptInstalacao] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function handlePrompt(e: Event) {
      e.preventDefault()
      setPromptInstalacao(e as BeforeInstallPromptEvent)
      setPodeInstalar(true)
    }
    function handleInstalled() { setPodeInstalar(false) }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function handleInstalar() {
    if (!promptInstalacao) return
    await promptInstalacao.prompt()
    const resultado = await promptInstalacao.userChoice
    if (resultado.outcome === 'accepted') setPodeInstalar(false)
  }

  function handleReimportar() {
    if (!window.confirm('Tens a certeza? Os dados atuais serão substituídos.')) return
    limparEquipamentos()
    onReimportar()
  }

  const hoje = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  if (isMobile) {
    return (
      <header style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button onClick={onMenuToggle} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#64748b', flexShrink: 0, display: 'flex' }}>
              <Menu size={20} />
            </button>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hoje}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <SyncIndicator sincronizando={sincronizando} ultimaSync={ultimaSync} erro={erroBackend} />
            <button
              onClick={onApresentacao}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#C0001A', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              <Presentation size={12} />
              Apresentar
            </button>
          </div>
        </div>
        <div style={{ padding: '0 16px 10px' }}>
          <PesquisaGlobal equipamentos={equipamentos} onVerDetalhe={onVerDetalhe} />
        </div>
      </header>
    )
  }

  return (
    <header style={{ height: 56, background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 4, height: 24, borderRadius: 99, background: '#C0001A' }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{titulo}</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{hoje}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SyncIndicator sincronizando={sincronizando} ultimaSync={ultimaSync} erro={erroBackend} />

        <PesquisaGlobal equipamentos={equipamentos} onVerDetalhe={onVerDetalhe} />

        {podeInstalar && (
          <button
            onClick={handleInstalar}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={12} />
            Instalar app
          </button>
        )}

        <button
          onClick={onApresentacao}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#C0001A', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#991b1b'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#C0001A'}
        >
          <Presentation size={12} />
          Apresentar
        </button>

        <span style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace' }}>{totalEquipamentos} eq.</span>

        <button
          onClick={handleReimportar}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, color: '#94a3b8', padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; (e.currentTarget as HTMLElement).style.borderColor = '#fecaca' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0' }}
        >
          <RefreshCw size={11} />
          Reimportar
        </button>
      </div>
    </header>
  )
}