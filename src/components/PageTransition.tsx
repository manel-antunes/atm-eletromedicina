import { useEffect, useState, useRef } from 'react'

interface Props {
  children: React.ReactNode
  paginaKey: string
}

export default function PageTransition({ children, paginaKey }: Props) {
  const [display, setDisplay] = useState(children)
  const [fase, setFase] = useState<'in' | 'out' | 'idle'>('idle')
  const prevKey = useRef(paginaKey)

  useEffect(() => {
    if (paginaKey === prevKey.current) return
    prevKey.current = paginaKey
    setFase('out')
    const t1 = setTimeout(() => {
      setDisplay(children)
      setFase('in')
    }, 120)
    const t2 = setTimeout(() => setFase('idle'), 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [paginaKey, children])

  useEffect(() => {
    if (fase === 'idle') setDisplay(children)
  }, [children])

  return (
    <div style={{
      height: '100%',
      opacity: fase === 'out' ? 0 : 1,
      transform: fase === 'out' ? 'translateY(6px)' : fase === 'in' ? 'translateY(0)' : 'translateY(0)',
      transition: fase === 'out'
        ? 'opacity 0.12s ease-out, transform 0.12s ease-out'
        : 'opacity 0.2s ease-out, transform 0.2s ease-out',
    }}>
      {display}
    </div>
  )
}