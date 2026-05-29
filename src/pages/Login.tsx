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
      const ecg = document.getElementById('ecg-canvas')
      const cursor = document.getElementById('atm-cursor')
      const left = leftPanelRef.current

      if (!left) return
      const rect = left.getBoundingClientRect()
      const inLeft = e.clientX >= rect.left && e.clientX <= rect.right

      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)

      if (el) {
        el.style.transform = `translate(calc(-50% + ${dx * 40}px), calc(-50% + ${dy * 20}px)) rotate(${dx * 2}deg)`
      }
      if (ecg) {
        (ecg as HTMLElement).style.marginTop = `${dy * 12}px`
      }

      if (cursor) {
        if (inLeft) {
          cursor.style.opacity = '1'
          cursor.style.left = (e.clientX - rect.left) + 'px'
          cursor.style.top = (e.clientY - rect.top) + 'px'
        } else {
          cursor.style.opacity = '0'
        }
      }

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
        const dx = mx - p.x
        const dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 90 && mx > 0) {
          p.vx -= (dx / dist) * 0.5
          p.vy -= (dy / dist) * 0.5
        }
        p.vx *= 0.97
        p.vy *= 0.97
        p.vx += (Math.random() - 0.5) * 0.04
        p.vy += (Math.random() - 0.5) * 0.04
        p.x += p.vx
        p.y += p.vy
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

  // ─── ECG desenha ATM depois scroll infinito ───────────────────────────────
  useEffect(() => {
    const canvas = document.getElementById('ecg-canvas') as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let rafId = 0

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      init()
    }

    // Constrói os pontos do path: cada segmento tem largura = canvas.width
    // Repete 3× para o scroll infinito
    function buildPoints(W: number, H: number): [number, number][] {
      const mid = H * 0.5
      const ecgH = H * 0.32   // amplitude pico ECG normal
      const letH = H * 0.36   // altura das letras

      function flat(x: number, len: number): [number, number][] {
        return [[x, mid], [x + len, mid]]
      }

      function peak(x: number): [number, number][] {
        return [
          [x,      mid],
          [x + 4,  mid - ecgH * 0.3],
          [x + 8,  mid - ecgH],
          [x + 12, mid + ecgH],
          [x + 16, mid - ecgH * 0.15],
          [x + 20, mid],
        ]
      }

      // A: diagonal esquerda sobe, diagonal direita desce, crossbar horizontal
      function letterA(x: number): [number, number][] {
        const top = mid - letH
        const bot = mid + letH * 0.4
        const w = 36
        return [
          [x,           bot],
          [x + w * 0.5, top],
          [x + w,       bot],
          // crossbar: volta ao 30% e vai ao 70%
          [x + w * 0.28, mid - letH * 0.1],
          [x + w * 0.72, mid - letH * 0.1],
          [x + w,        bot],
        ]
      }

      // T: sobe ao centro, faz crossbar, desce
      function letterT(x: number): [number, number][] {
        const top = mid - letH
        const bot = mid + letH * 0.4
        const w = 32
        return [
          [x,           mid],
          [x,           top],
          [x + w,       top],
          [x + w * 0.5, top],
          [x + w * 0.5, bot],
          [x + w,       bot],
        ]
      }

      // M: sobe esquerda, desce ao meio, sobe direita, desce
      function letterM(x: number): [number, number][] {
        const top = mid - letH
        const bot = mid + letH * 0.4
        const w = 42
        return [
          [x,           bot],
          [x,           top],
          [x + w * 0.5, mid - letH * 0.3],
          [x + w,       top],
          [x + w,       bot],
        ]
      }

      // Um segmento completo (ocupa W px)
      function segment(ox: number): [number, number][] {
        const tail = W - 510  // preenche o resto com flat+peak
        return [
          ...flat(ox,       20),
          ...peak(ox +      24),
          ...flat(ox +      48,  18),
          ...letterA(ox +   70),
          ...flat(ox +     112,  18),
          ...peak(ox +     134),
          ...flat(ox +     158,  18),
          ...letterT(ox +  180),
          ...flat(ox +     218,  18),
          ...peak(ox +     240),
          ...flat(ox +     264,  18),
          ...letterM(ox +  286),
          ...flat(ox +     334,  18),
          ...peak(ox +     356),
          ...flat(ox +     380,  18),
          ...peak(ox +     402),
          ...flat(ox +     426,  18),
          ...peak(ox +     448),
          ...flat(ox +     472, Math.max(tail, 20)),
        ]
      }

      return [
        ...segment(0),
        ...segment(W),
        ...segment(W * 2),
      ]
    }

    let pts: [number, number][] = []
    let totalLen = 0
    let drawnLen = 0
    let offset = 0
    let phase: 'draw' | 'scroll' = 'draw'
    const DRAW_DURATION = 3500  // ms para desenhar o path
    const SCROLL_SPEED = 0.4    // px por frame

    function calcLen(points: [number, number][]): number {
      let l = 0
      for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0]
        const dy = points[i][1] - points[i - 1][1]
        l += Math.sqrt(dx * dx + dy * dy)
      }
      return l
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.6
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      const W = canvas.width

      if (phase === 'draw') {
        // Desenha até drawnLen
        let accumulated = 0
        ctx.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) {
          const dx = pts[i][0] - pts[i - 1][0]
          const dy = pts[i][1] - pts[i - 1][1]
          const segLen = Math.sqrt(dx * dx + dy * dy)
          if (accumulated + segLen >= drawnLen) {
            const t = (drawnLen - accumulated) / segLen
            ctx.lineTo(pts[i - 1][0] + dx * t, pts[i - 1][1] + dy * t)
            break
          }
          accumulated += segLen
          ctx.lineTo(pts[i][0], pts[i][1])
        }
        ctx.stroke()

        drawnLen += totalLen / (DRAW_DURATION / (1000 / 60))
        if (drawnLen >= totalLen / 3) {
          phase = 'scroll'
          offset = 0
        }
      } else {
        // Scroll: desloca o path para a esquerda, wraps a cada W
        ctx.save()
        ctx.translate(-offset, 0)
        ctx.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0], pts[i][1])
        }
        ctx.stroke()
        ctx.restore()

        offset += SCROLL_SPEED
        if (offset >= W) offset -= W
      }

      rafId = requestAnimationFrame(render)
    }

    function init() {
      pts = buildPoints(canvas.width, canvas.height)
      totalLen = calcLen(pts)
      drawnLen = 0
      phase = 'draw'
      offset = 0
      cancelAnimationFrame(rafId)
      render()
    }

    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafId)
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
        .login-field:-webkit-autofill,
        .login-field:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #F5F4F0 inset;
          -webkit-text-fill-color: #1a1a1a;
        }

        .left-panel { cursor: none; }

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

        {/* Partículas */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />

        {/* ECG canvas — desenha ATM depois scroll */}
        <canvas
          id="ecg-canvas"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            height: '40%',
            marginTop: '-20%',
            pointerEvents: 'none',
            opacity: 0.22,
            transition: 'margin-top 0.2s ease-out',
          }}
        />

        {/* Cursor médico */}
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

        {/* ATM gigante */}
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
            color: 'rgba(255,255,255,0.07)',
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
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(40px)',
          transition: exiting
            ? 'opacity 0.4s ease, transform 0.4s ease'
            : 'opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s',
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