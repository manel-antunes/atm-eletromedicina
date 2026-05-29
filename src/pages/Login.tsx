import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://atm-eletromedicina.onrender.com'

interface Props {
  onLogin: (token: string, nome: string) => void
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef({ x: -999, y: -999 })
  const leftPanelRef = useRef<HTMLDivElement>(null)

  // ─── Mount + Parallax + Cursor ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)

    function handleMouse(e: MouseEvent) {
      const el = document.getElementById('atm-gigante')
      const ecg = document.getElementById('ecg-line')
      const cursor = document.getElementById('atm-cursor')
      const left = leftPanelRef.current

      if (!left) return
      const rect = left.getBoundingClientRect()
      const inLeft = e.clientX >= rect.left && e.clientX <= rect.right

      // Parallax — relativo ao painel esquerdo
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)   // -1 a 1
      const dy = (e.clientY - cy) / (rect.height / 2)  // -1 a 1

      if (el) {
        el.style.transform = `translate(calc(-50% + ${dx * 40}px), calc(-50% + ${dy * 20}px)) rotate(${dx * 2}deg)`
      }
      if (ecg) {
        ecg.style.transform = `translateY(calc(-50% + ${dy * 12}px))`
      }

      // Cursor personalizado
      if (cursor) {
        if (inLeft) {
          cursor.style.opacity = '1'
          cursor.style.left = (e.clientX - rect.left) + 'px'
          cursor.style.top = (e.clientY - rect.top) + 'px'
        } else {
          cursor.style.opacity = '0'
        }
      }

      // Coordenadas para partículas (relativas ao canvas)
      if (inLeft) {
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      } else {
        mouseRef.current = { x: -999, y: -999 }
      }
    }

    window.addEventListener('mousemove', handleMouse)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  // ─── Partículas luminosas ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas!.width = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface Particle {
      x: number; y: number
      baseX: number; baseY: number
      r: number; opacity: number
      vx: number; vy: number
    }

    const COUNT = 70
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      baseX: 0, baseY: 0,
      r: Math.random() * 1.6 + 0.4,
      opacity: Math.random() * 0.35 + 0.08,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }))

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      const { x: mx, y: my } = mouseRef.current

      particles.forEach(p => {
        // Repulsão suave pelo rato
        const dx = mx - p.x
        const dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 90 && mx > 0) {
          p.vx -= (dx / dist) * 0.5
          p.vy -= (dy / dist) * 0.5
        }

        // Damping + drift
        p.vx *= 0.97
        p.vy *= 0.97
        p.vx += (Math.random() - 0.5) * 0.04
        p.vy += (Math.random() - 0.5) * 0.04
        p.x += p.vx
        p.y += p.vy

        // Wrap
        if (p.x < 0) p.x = canvas!.width
        if (p.x > canvas!.width) p.x = 0
        if (p.y < 0) p.y = canvas!.height
        if (p.y > canvas!.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // ─── Login ───────────────────────────────────────────────────────────────
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
      if (!res.ok) {
        setErro('Utilizador ou password incorretos.')
        setLoading(false)
        return
      }
      const { token, nome } = await res.json()
      localStorage.setItem('atm_token', token)
      localStorage.setItem('atm_nome', nome)

      // 4. Transição cinematográfica de saída
      setExiting(true)
      setTimeout(() => onLogin(token, nome), 900)
    } catch {
      setErro('Erro de ligação ao servidor.')
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0A0F1E', display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');

        @keyframes line-in {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes bg-pulse {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.15); }
        }
        @keyframes ecg-scroll {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -2400; }
        }

        /* 7. Botão fill da esquerda para a direita */
        .login-btn {
          background: #1a1a1a;
          color: #F5F4F0;
          border: none;
          width: 100%;
          padding: 16px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: color 0.35s;
        }
        .login-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #C0001A;
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-btn:hover:not(:disabled)::before { transform: scaleX(1); }
        .login-btn:disabled { opacity: 0.4; cursor: default; }
        .login-btn span { position: relative; z-index: 1; }

        .login-field {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid #1a1a1a;
          padding: 12px 0;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          font-weight: 300;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.3s;
          box-sizing: border-box;
          letter-spacing: 0.02em;
        }
        .login-field::placeholder { color: #999; font-weight: 300; }
        .login-field:focus { border-bottom-color: #C0001A; }
        /* Fix autofill no Chrome */
        .login-field:-webkit-autofill,
        .login-field:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #F5F4F0 inset;
          -webkit-text-fill-color: #1a1a1a;
        }

        /* 6. Cursor personalizado — esconde o default só no painel esquerdo */
        .left-panel { cursor: none; }

        /* 5. Mobile: esconde painel esquerdo, fundo escuro no direito */
        @media (max-width: 640px) {
          .left-panel { display: none !important; }
          .right-panel {
            width: 100% !important;
            background: #0A0F1E !important;
          }
          .right-panel .login-field {
            border-bottom-color: rgba(255,255,255,0.25) !important;
            color: #F5F4F0 !important;
          }
          .right-panel .login-field::placeholder { color: rgba(255,255,255,0.3) !important; }
          .right-panel .login-field:-webkit-autofill,
          .right-panel .login-field:-webkit-autofill:focus {
            -webkit-box-shadow: 0 0 0 1000px #0A0F1E inset !important;
            -webkit-text-fill-color: #F5F4F0 !important;
          }
          .right-panel h1 { color: #F5F4F0 !important; }
          .right-panel h1 em { color: rgba(255,255,255,0.45) !important; }
          .right-panel .footer-line { background: rgba(255,255,255,0.1) !important; }
          .right-panel .footer-text { color: rgba(255,255,255,0.35) !important; }
          .right-panel .label-top { color: rgba(255,255,255,0.4) !important; }
          .login-btn { background: #C0001A !important; }
          .login-btn::before { background: #1a1a1a !important; }
        }
      `}</style>

      {/* ── PAINEL ESQUERDO ─────────────────────────────────────────────── */}
      <div
        ref={leftPanelRef}
        className="left-panel"
        style={{
   
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: 48,
          // 4. Expansão cinematográfica na saída
          transition: exiting ? 'flex 0.9s cubic-bezier(0.16,1,0.3,1)' : 'none',
          flex: exiting ? '1 0 100%' : '1',
        }}
      >
        {/* Gradiente de fundo */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #0A0F1E 0%, #1a0509 60%, #C0001A 100%)',
          animation: 'bg-pulse 8s ease-in-out infinite',
        }} />

        {/* Grid médico */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* 2. Canvas de partículas */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />

        {/* 6. Cursor médico personalizado */}
        <div
          id="atm-cursor"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            opacity: 0,
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.15s',
            zIndex: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="10" y1="0" x2="10" y2="20" stroke="#C0001A" strokeWidth="1.5"/>
            <line x1="0" y1="10" x2="20" y2="10" stroke="#C0001A" strokeWidth="1.5"/>
            <circle cx="10" cy="10" r="2.5" fill="#C0001A"/>
          </svg>
        </div>

        {/* 1. ATM gigante — parallax via DOM direto no mousemove handler */}
        <div
          id="atm-gigante"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(120px, 20vw, 280px)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.10)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            letterSpacing: '-0.05em',
            userSelect: 'none',
            pointerEvents: 'none',
            transition: 'transform 0.12s ease-out',
            willChange: 'transform',
          }}
        >
          ATM
        </div>

        {/* 3. ECG — scroll contínuo */}
        <svg
          id="ecg-line"
          viewBox="0 0 800 120"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            transform: 'translateY(-50%)',
            opacity: 0.18,
            transition: 'transform 0.2s ease-out',
            overflow: 'visible',
          }}
          preserveAspectRatio="none"
        >
          {/* Linha base longa (3× para o scroll contínuo funcionar) */}
          <polyline
            points="
              0,60 80,60 100,60 110,20 120,100 130,10 140,110 150,60 200,60
              240,60 260,60 270,45 280,75 290,60 340,60
              400,60 410,20 420,100 430,10 440,110 450,60 500,60
              540,60 560,45 570,75 580,60 640,60
              680,60 690,20 700,100 710,10 720,110 730,60 800,60
              880,60 890,20 900,100 910,10 920,110 930,60 980,60
              1020,60 1030,45 1040,75 1050,60 1100,60
              1160,60 1170,20 1180,100 1190,10 1200,110 1210,60 1260,60
              1340,60 1360,45 1370,75 1380,60 1440,60
              1480,60 1490,20 1500,100 1510,10 1520,110 1530,60 1600,60
            "
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="2400"
            strokeDashoffset="0"
            style={{ animation: 'ecg-scroll 6s linear infinite' }}
          />
        </svg>

        {/* Badges */}
        <div style={{ position: 'absolute', top: 48, left: 48, opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease 0.3s' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
            ATM Manutenção Total
          </p>
        </div>
        <div style={{ position: 'absolute', top: 48, right: 48, textAlign: 'right', opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease 0.5s' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
            v1.0 · 2026
          </p>
        </div>

        {/* Stats editoriais */}
        <div style={{
          position: 'relative', zIndex: 2,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.4s',
        }}>
          <div style={{ display: 'flex', gap: 48, marginBottom: 32 }}>
            {[
              { num: '52', label: 'Equipamentos' },
              { num: '5',  label: 'Hospitais' },
              { num: '100%', label: 'Digital' },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: '#fff', margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>{stat.num}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.4)', margin: '6px 0 0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{stat.label}</p>
              </div>
            ))}
          </div>
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.15)', marginBottom: 24, transformOrigin: 'left', animation: mounted ? 'line-in 1.2s cubic-bezier(0.16,1,0.3,1) 0.6s both' : 'none' }} />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: 'italic', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: '0.02em' }}>
            Sistema de Gestão de Eletromedicina
          </p>
        </div>

        {/* Ticker */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, background: '#C0001A', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', animation: 'marquee 20s linear infinite', whiteSpace: 'nowrap' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0 32px' }}>
                ATM Eletromedicina · Hospital CUF Porto · Gestão de Calibrações · Manutenção Preventiva ·
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAINEL DIREITO ──────────────────────────────────────────────── */}
      <div
        className="right-panel"
        style={{
          width: 420,
          flexShrink: 0,
          background: '#F5F4F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px 56px',
          position: 'relative',
          // Mounted entry
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(40px)',
          transition: exiting
            ? 'opacity 0.4s ease, transform 0.4s ease'
            : 'opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s',
          // 4. Saída: fade + slide para a direita
          ...(exiting && { opacity: 0, transform: 'translateX(40px)' }),
        }}
      >
        {/* Label topo */}
        <div style={{ position: 'absolute', top: 40, left: 56 }}>
          <p className="label-top" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 400, color: '#1a1a1a', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
            Eletromedicina
          </p>
        </div>

        {/* Título */}
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, color: '#C0001A', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Acesso Restrito
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, fontWeight: 300, color: '#1a1a1a', margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
            Bem-vindo
            <br />
            <em style={{ fontStyle: 'italic', color: '#666' }}>de volta.</em>
          </h1>
          <div style={{ width: 40, height: 1, background: '#C0001A', marginTop: 24, transformOrigin: 'left', animation: mounted ? 'line-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s both' : 'none' }} />
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: focusedField === 'user' ? '#C0001A' : '#999', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, transition: 'color 0.3s' }}>
              Utilizador
            </label>
            <input
              className="login-field"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={() => setFocusedField('user')}
              onBlur={() => setFocusedField(null)}
              placeholder="username"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: focusedField === 'pass' ? '#C0001A' : '#999', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, transition: 'color 0.3s' }}>
              Password
            </label>
            <input
              className="login-field"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocusedField('pass')}
              onBlur={() => setFocusedField(null)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {erro && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '2px solid #C0001A', paddingLeft: 12 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#C0001A', fontWeight: 400 }}>{erro}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.3)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>A entrar</span>
              </span>
            ) : (
              <span>Entrar</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 40, left: 56, right: 56 }}>
          <div className="footer-line" style={{ height: 1, background: '#e0deda', marginBottom: 20 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="footer-text" style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#999', margin: 0, letterSpacing: '0.05em' }}>ATM Manutenção Total</p>
            <p className="footer-text" style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#999', margin: 0, letterSpacing: '0.05em' }}>Porto · 2026</p>
          </div>
        </div>
      </div>
    </div>
  )
}