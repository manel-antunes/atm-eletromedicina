import { RefreshCw, Presentation } from 'lucide-react'
import { limparEquipamentos } from '../data/storage'
import PesquisaGlobal from './PesquisaGlobal'
import type { Equipamento } from '../data/equipamentos'

interface Props {
  titulo: string
  totalEquipamentos: number
  onReimportar: () => void
  equipamentos: Equipamento[]
  onVerDetalhe: (eq: Equipamento) => void
  onApresentacao: () => void
}

export default function Topbar({ titulo, totalEquipamentos, onReimportar, equipamentos, onVerDetalhe, onApresentacao }: Props) {
  function handleReimportar() {
    if (!window.confirm('Tens a certeza? Os dados atuais serão substituídos.')) return
    limparEquipamentos()
    onReimportar()
  }

  const hoje = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full bg-red-600" />
        <div>
          <span className="text-sm font-bold text-gray-800">{titulo}</span>
          <p className="text-xs text-gray-400 capitalize">{hoje}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <PesquisaGlobal equipamentos={equipamentos} onVerDetalhe={onVerDetalhe} />
        <button
          onClick={onApresentacao}
          className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all"
          style={{ background: '#C0001A' }}
          onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
          onMouseLeave={e => e.currentTarget.style.background = '#C0001A'}
        >
          <Presentation size={12} />
          Apresentar
        </button>
        <span className="text-xs text-gray-300 font-mono">{totalEquipamentos} eq.</span>
        <button
          onClick={handleReimportar}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw size={11} />
          Reimportar
        </button>
      </div>
    </header>
  )
}