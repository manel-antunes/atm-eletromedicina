import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://atm-eletromedicina-production.up.railway.app'

interface Props {
  onLogin: (token: string, nome: string) => void
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // ECG pattern — simula batimento cardíaco real
    const ecgPattern = [
      0, 0, 0, 0, 0.02, -0.02, 0.05, -0.05, 0.05, 0,     // linha base
      0, 0, 0, 0.1, 0.25, -0.1, 0.05, 0,                   // onda P
      0, 0, 0, 0, 0, 0.05, -0.15, 1.0, -0.35, 0.1, 0.05,  // complexo QRS
      0, 0, 0, 0, 0.12, 0.18, 0.2, 0.18, 0.12, 0.05, 0,   // onda T
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,     // linha base
    ]

    // Várias linhas de ECG em paralelo
    const numLinhas = 5
    const offsets: number[] = Array.from({ length: numLinhas }, (_, i) => i * (ecgPattern.length / numLinhas) * 8)
    let animId: number
    let t = 0

    function draw() {
      const w = canvas!.width
      const h = canvas!.height

      // Fundo escuro com fade
      ctx!.fillStyle = 'rgba(6,9,16,0.15)'
      ctx!.fillRect(0, 0, w, h)

      // Grid
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 40) {
        ctx!.strokeStyle = x % 200 === 0 ? 'rgba(192,0,26,0.06)' : 'rgba(192,0,26,0.025)'
        ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
      }
      for (let y = 0; y < h; y += 40) {
        ctx!.strokeStyle = y % 200 === 0 ? 'rgba(192,0,26,0.06)' : 'rgba(192,0,26,0.025)'
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
      }

      // Desenha múltiplas linhas de ECG
      for (let l = 0; l < numLinhas; l++) {
        const centerY = (h / (numLinhas + 1)) * (l + 1)
        const amplitude = h / (numLinhas * 2.2)
        const speed = 2.5 + l * 0.3
        const lineOffset = offsets[l] + t * speed

        // Opacidade varia por linha — central mais brilhante
        const dist = Math.abs(l - (numLinhas - 1) / 2) / ((numLinhas - 1) / 2)
        const alpha = 0.8 - dist * 0.5

        ctx!.beginPath()
        ctx!.lineWidth = l === Math.floor(numLinhas / 2) ? 2 : 1.2
        ctx!.strokeStyle = `rgba(192,0,26,${alpha})`

        for (let x = 0; x <= w; x += 2) {
          const patLen = ecgPattern.length
          const pos = ((x + lineOffset) / w * patLen * 3) % patLen
          const idx = Math.floor(pos)
          const frac = pos - idx
          const v1 = ecgPattern[idx % patLen]
          const v2 = ecgPattern[(idx + 1) % patLen]
          const val = v1 + (v2 - v1) * frac
          const y = centerY - val * amplitude

          x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y)
        }
        ctx!.stroke()

        // Ponto de cursor a percorrer a linha central
        if (l === Math.floor(numLinhas / 2)) {
          const cursorX = (t * (2.5 + l * 0.3) * 2) % w
          const patLen = ecgPattern.length
          const pos = ((cursorX + lineOffset) / w * patLen * 3) % patLen
          const idx = Math.floor(pos)
          const val = ecgPattern[idx % patLen]
          const cursorY = centerY - val * amplitude

          // Glow no cursor
          const gradient = ctx!.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 20)
          gradient.addColorStop(0, 'rgba(192,0,26,0.8)')
          gradient.addColorStop(1, 'rgba(192,0,26,0)')
          ctx!.beginPath()
          ctx!.arc(cursorX, cursorY, 20, 0, Math.PI * 2)
          ctx!.fillStyle = gradient
          ctx!.fill()

          ctx!.beginPath()
          ctx!.arc(cursorX, cursorY, 4, 0, Math.PI * 2)
          ctx!.fillStyle = '#ff1a1a'
          ctx!.fill()
        }
      }

      // Overlay escuro nas bordas (vignette)
      const vignette = ctx!.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.9)
      vignette.addColorStop(0, 'rgba(6,9,16,0)')
      vignette.addColorStop(1, 'rgba(6,9,16,0.7)')
      ctx!.fillStyle = vignette
      ctx!.fillRect(0, 0, w, h)

      t += 0.4
      animId = requestAnimationFrame(draw)
    }

    // Limpa o fundo primeiro
    ctx.fillStyle = '#060910'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) { setErro('Utilizador ou password incorretos.'); return }
      const { token, nome } = await res.json()
      localStorage.setItem('atm_token', token)
      localStorage.setItem('atm_nome', nome)
      onLogin(token, nome)
    } catch {
      setErro('Erro de ligação ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#060910' }}>
      <style>{`
        @keyframes fade-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 70%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.06)} 28%{transform:scale(1)} 42%{transform:scale(1.04)} 56%{transform:scale(1)} }
        .login-fade { animation: fade-up .7s cubic-bezier(.16,1,.3,1) both }
        .logo-anim { animation: float 3.5s ease-in-out infinite }
        .logo-heart { animation: heartbeat 1.2s ease-in-out infinite }
        .field {
          width: 100%; padding: 12px 16px; border-radius: 10px; box-sizing: border-box;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; font-size: 14px; outline: none; transition: all .2s;
        }
        .field::placeholder { color: rgba(255,255,255,0.2) }
        .field:focus { border-color: rgba(192,0,26,.7); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 3px rgba(192,0,26,.1) }
        .btn {
          width: 100%; padding: 13px; border: none; border-radius: 10px; cursor: pointer;
          background: linear-gradient(135deg,#C0001A,#E30613); color: #fff;
          font-size: 14px; font-weight: 700; letter-spacing: .3px;
          box-shadow: 0 6px 28px rgba(192,0,26,.4); transition: all .2s;
        }
        .btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 36px rgba(192,0,26,.5) }
        .btn:active:not(:disabled) { transform: translateY(0) scale(.98) }
        .btn:disabled { background: rgba(255,255,255,.07); box-shadow: none; cursor: default }
      `}</style>

      {/* Canvas ECG full-screen */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />

      {/* Conteúdo centrado */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="login-fade" style={{ width: '100%', maxWidth: 380 }}>

          {/* Logo */}
          <div className="logo-anim" style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="logo-heart" style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}>
              <div style={{ position: 'absolute', inset: -4, borderRadius: 24, border: '1px solid rgba(192,0,26,.4)', animation: 'pulse-ring 1.5s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: -4, borderRadius: 24, border: '1px solid rgba(192,0,26,.2)', animation: 'pulse-ring 1.5s ease-out infinite .3s' }} />
              <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#C0001A,#ff1a1a)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 0 50px rgba(192,0,26,.6), 0 0 100px rgba(192,0,26,.2)' }}>
                <span style={{ color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: '-1px' }}>ATM</span>
              </div>
            </div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.5px', textShadow: '0 0 30px rgba(192,0,26,.4)' }}>
              ATM Eletromedicina
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ flex: 1, maxWidth: 40, height: '1px', background: 'linear-gradient(to left, rgba(192,0,26,.5), transparent)' }} />
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Sistema de Gestão · HPRT</span>
              <div style={{ flex: 1, maxWidth: 40, height: '1px', background: 'linear-gradient(to right, rgba(192,0,26,.5), transparent)' }} />
            </div>
          </div>

          {/* Card de login */}
          <div style={{ background: 'rgba(6,9,16,0.85)', border: '1px solid rgba(192,0,26,.2)', borderRadius: 20, padding: '32px', backdropFilter: 'blur(32px)', boxShadow: '0 40px 100px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.05), 0 0 0 1px rgba(192,0,26,.05)' }}>

            {/* Linha decorativa topo */}
            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(192,0,26,.8) 50%, transparent 100%)', borderRadius: 99, marginBottom: 28 }} />

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Utilizador
                </label>
                <input className="field" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" required autoFocus autoComplete="username" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Password
                </label>
                <input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
              </div>

              {erro && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(192,0,26,.1)', border: '1px solid rgba(192,0,26,.25)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                  <span style={{ color: '#f87171', fontSize: 13 }}>{erro}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn" style={{ marginTop: 4 }}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
                      A entrar...
                    </span>
                  : 'Entrar →'
                }
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.1)', fontSize: 11, marginTop: 20, letterSpacing: '0.05em' }}>
            ATM Manutenção Total · v1.0 · 2026
          </p>
        </div>
      </div>
    </div>
  )
}