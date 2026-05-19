import { useEffect, useRef } from 'react'

interface Props {
  mensagem?: string
}

export default function LoadingATM({ mensagem = 'A carregar...' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 200
    canvas.height = 200

    let animId: number
    let t = 0

    const ecgPattern = [
      0, 0, 0, 0.1, 0.25, -0.1, 0.05, 0,
      0, 0, 0, 0.05, -0.15, 1.0, -0.35, 0.1, 0.05,
      0, 0, 0, 0.12, 0.18, 0.2, 0.18, 0.12, 0.05, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ]

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)

      // Fundo circular escuro
      ctx!.beginPath()
      ctx!.arc(w/2, h/2, 90, 0, Math.PI * 2)
      ctx!.fillStyle = 'rgba(10,15,30,0.95)'
      ctx!.fill()

      // Anel exterior giratório
      ctx!.beginPath()
      ctx!.arc(w/2, h/2, 88, -Math.PI/2, -Math.PI/2 + (t * 0.04) % (Math.PI * 2))
      ctx!.strokeStyle = '#C0001A'
      ctx!.lineWidth = 3
      ctx!.stroke()

      // Anel interior pulsante
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.08)
      ctx!.beginPath()
      ctx!.arc(w/2, h/2, 70 * pulse, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(192,0,26,${0.15 * pulse})`
      ctx!.lineWidth = 1
      ctx!.stroke()

      // ECG no centro
      const ecgW = 100
      const ecgX = w/2 - ecgW/2
      const ecgY = h/2 + 18
      const patLen = ecgPattern.length
      const speed = 1.5

      ctx!.beginPath()
      ctx!.strokeStyle = '#C0001A'
      ctx!.lineWidth = 1.8
      ctx!.shadowBlur = 8
      ctx!.shadowColor = '#C0001A'

      for (let x = 0; x <= ecgW; x += 1) {
        const pos = ((x + t * speed) / ecgW * patLen * 2) % patLen
        const idx = Math.floor(pos)
        const frac = pos - idx
        const v1 = ecgPattern[idx % patLen]
        const v2 = ecgPattern[(idx + 1) % patLen]
        const val = v1 + (v2 - v1) * frac
        const y = ecgY - val * 28
        x === 0 ? ctx!.moveTo(ecgX + x, y) : ctx!.lineTo(ecgX + x, y)
      }
      ctx!.stroke()
      ctx!.shadowBlur = 0

      // Logo ATM
      ctx!.fillStyle = '#fff'
      ctx!.font = 'bold 22px Arial Black, Arial'
      ctx!.textAlign = 'center'
      ctx!.textBaseline = 'middle'
      ctx!.fillText('ATM', w/2, h/2 - 10)

      // Pontos de loading
      const dots = Math.floor((t * 0.05) % 4)
      ctx!.fillStyle = 'rgba(192,0,26,0.8)'
      ctx!.font = '12px Arial'
      ctx!.fillText('●'.repeat(dots) + '○'.repeat(3 - dots), w/2, h/2 + 48)

      t++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0A0F1E',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16,
    }}>
      <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
      <p style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13, fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        {mensagem}
      </p>
    </div>
  )
}