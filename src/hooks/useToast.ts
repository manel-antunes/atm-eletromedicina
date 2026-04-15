import { useState } from 'react'
import type { ToastData } from '../components/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  function mostrar(tipo: ToastData['tipo'], titulo: string, mensagem?: string) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, tipo, titulo, mensagem }])
  }

  function remover(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { toasts, mostrar, remover }
}