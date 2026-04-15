import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, X } from 'lucide-react'

export interface ToastData {
  id: number
  tipo: 'sucesso' | 'erro' | 'aviso'
  titulo: string
  mensagem?: string
}

interface Props {
  toasts: ToastData[]
  onRemover: (id: number) => void
}

export default function ToastContainer({ toasts, onRemover }: Props) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemover={onRemover} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemover }: { toast: ToastData; onRemover: (id: number) => void }) {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisivel(true), 10)
    const timer = setTimeout(() => {
      setVisivel(false)
      setTimeout(() => onRemover(toast.id), 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [])

  const cfg = {
    sucesso: { bg: '#0f172a', border: 'rgba(34,197,94,0.4)',  icon: <CheckCircle size={16} color="#4ade80" />, cor: '#4ade80' },
    erro:    { bg: '#0f172a', border: 'rgba(239,68,68,0.4)',   icon: <AlertTriangle size={16} color="#f87171" />, cor: '#f87171' },
    aviso:   { bg: '#0f172a', border: 'rgba(234,179,8,0.4)',   icon: <AlertTriangle size={16} color="#facc15" />, cor: '#facc15' },
  }[toast.tipo]

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 14,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      minWidth: 300,
      maxWidth: 380,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      transform: visivel ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.95)',
      opacity: visivel ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{toast.titulo}</p>
        {toast.mensagem && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 }}>{toast.mensagem}</p>
        )}
      </div>
      <button
        onClick={() => { setVisivel(false); setTimeout(() => onRemover(toast.id), 300) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}