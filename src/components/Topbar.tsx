import { useState, useEffect } from 'react'
import { RefreshCw, Presentation, Download, Menu } from 'lucide-react'
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
}

export default function Topbar({ titulo, totalEquipamentos, onReimportar, equipamentos, onVerDetalhe, onApresentacao, onMenuToggle, isMobile }: Props) {
  const [podeInstalar, setPodeInstalar] = useState(false)
  const [promptInstalacao, setPromptInstalacao] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function handlePrompt(e: Event) {
      e.preventDefault()
      setPromptInstalacao(e as BeforeInstallPromptEvent)
      setPodeInstalar(true)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', () => setPodeInstalar(false))
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
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

  return (
    <header className="bg-white border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0" style={{ height: isMobile ? 56 : 56 }}>
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button onClick={onMenuToggle} className="text-gray-500 hover:text-gray-800 flex-shrink-0">
            <Menu size={20} />
          </button>
        )}
        <div className="min-w-0">
          <span className="text-sm font-bold text-gray-800 truncate block">{titulo}</span>
          {!isMobile && <p className="text-xs text-gray-400 capitalize">{hoje}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isMobile && <PesquisaGlobal equipamentos={equipamentos} onVerDetalhe={onVerDetalhe} />}

        {podeInstalar && (
          <button
            onClick={handleInstalar}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
            style={{ background: '#16a34a' }}
          >
            <Download size={12} />
            {!isMobile && 'Instalar app'}
          </button>
        )}

        {!isMobile && (
          <button
            onClick={onApresentacao}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
            style={{ background: '#C0001A' }}
          >
            <Presentation size={12} />
            Apresentar
          </button>
        )}

        {!isMobile && <span className="text-xs text-gray-300 font-mono">{totalEquipamentos} eq.</span>}

        <button
          onClick={handleReimportar}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw size={11} />
          {!isMobile && 'Reimportar'}
        </button>
      </div>
    </header>
  )
}