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
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Partículas
    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      })
    }

    // ECG
    let ecgOffset = 0
    const ecgPath = [0,0,0,0,0,0,0,0,0.2,0.5,1,-0.3,0.1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]

    let animId: number
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Fundo
      ctx.fillStyle = '#060910'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid subtil
      ctx.strokeStyle = 'rgba(192,0,26,0.04)'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      // Partículas com linhas de conexão
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(192,0,26,${p.alpha})`
        ctx.fill()
      })
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const d = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (d < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(192,0,26,${0.08 * (1 - d / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      // ECG animado centrado
      const ecgW = 500
      const startX = (canvas.width - ecgW) / 2
      const centerY = canvas.height * 0.72
      const amplitude = 55

      ctx.beginPath()
      ctx.strokeStyle = 'rgba(192,0,26,0.6)'
      ctx.lineWidth = 1.5
      ctx.shadowColor = '#C0001A'
      ctx.shadowBlur = 8
      for (let x = 0; x < ecgW; x++) {
        const idx = Math.floor(((x + ecgOffset) / ecgW * ecgPath.length)) % ecgPath.length
        const y = centerY - ecgPath[idx] * amplitude
        x === 0 ? ctx.moveTo(startX + x, y) : ctx.lineTo(startX + x, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // Ponto a piscar no fim do ECG
      const lastIdx = Math.floor((ecgPath.length - 1 + ecgOffset) % ecgPath.length)
      const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 200)
      ctx.beginPath()
      ctx.arc(startX + ecgW, centerY - ecgPath[lastIdx] * amplitude, 4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(192,0,26,${pulseAlpha})`
      ctx.fill()

      ecgOffset = (ecgOffset + 0.5) % ecgPath.length

      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
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
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes fade-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.7} 70%{transform:scale(2);opacity:0} 100%{transform:scale(2);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .login-card { animation: fade-up .6s cubic-bezier(.16,1,.3,1) both }
        .logo-wrap { animation: float 3s ease-in-out infinite }
        .input-field {
          width: 100%; padding: 12px 16px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: white; font-size: 14px; outline: none;
          transition: border-color .2s, background .2s;
          box-sizing: border-box;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.2) }
        .input-field:focus { border-color: rgba(192,0,26,.6); background: rgba(255,255,255,0.07) }
        .btn-login {
          width: 100%; padding: 13px; border-radius: 10px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #C0001A, #E30613);
          color: white; font-size: 14px; font-weight: 700;
          box-shadow: 0 8px 32px rgba(192,0,26,.35);
          transition: opacity .2s, transform .15s;
        }
        .btn-login:hover { opacity: .9 }
        .btn-login:active { transform: scale(.98) }
        .btn-login:disabled { background: rgba(255,255,255,.08); box-shadow: none; cursor: default }
      `}</style>

      {/* Canvas de fundo */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Gradiente central */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(192,0,26,.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Conteúdo */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

        {/* Logo */}
        <div className="logo-wrap" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: '#C0001A', animation: 'pulse-ring 2s ease-out infinite', opacity: .3 }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: '#C0001A', animation: 'pulse-ring 2s ease-out infinite .4s', opacity: .2 }} />
            <div style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg,#C0001A,#E30613)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 0 40px rgba(192,0,26,.5)' }}>
              <span style={{ color: 'white', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>ATM</span>
            </div>
          </div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.3px' }}>ATM Eletromedicina</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,.15)' }} />
            <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sistema de Gestão · HPRT</p>
            <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,.15)' }} />
          </div>
        </div>

        {/* Card */}
        <div className="login-card" style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '28px 28px 24px', backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)' }}>
          {/* Linha vermelha topo */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #C0001A, transparent)', borderRadius: 99, marginBottom: 24, opacity: .6 }} />

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Utilizador</label>
              <input className="input-field" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" required autoFocus autoComplete="username" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Password</label>
              <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>

            {erro && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(192,0,26,.12)', border: '1px solid rgba(192,0,26,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                <span style={{ color: '#f87171', fontSize: 13 }}>{erro}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-login">
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.2)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
                  A entrar...
                </span>
              ) : 'Entrar →'}
            </button>
          </form>
        </div>

        <p style={{ color: 'rgba(255,255,255,.12)', fontSize: 11, marginTop: 24, letterSpacing: '0.05em' }}>
          ATM Manutenção Total · v1.0 · 2026
        </p>
      </div>
    </div>
  )
}