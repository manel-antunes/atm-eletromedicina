import { useEffect, useState } from 'react'

export function useContador(valor: number, duracao: number = 800) {
  const [atual, setAtual] = useState(0)

  useEffect(() => {
    if (valor === 0) { setAtual(0); return }
    const inicio = performance.now()
    const animar = (agora: number) => {
      const progresso = Math.min((agora - inicio) / duracao, 1)
      const ease = 1 - Math.pow(1 - progresso, 3)
      setAtual(Math.round(ease * valor))
      if (progresso < 1) requestAnimationFrame(animar)
    }
    requestAnimationFrame(animar)
  }, [valor])

  return atual
}