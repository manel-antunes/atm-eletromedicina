import { useState, useEffect } from 'react'

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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
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
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#F5F4F0', display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');

        @keyframes line-in {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slide-right {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

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
          transition: all 0.3s;
        }
        .login-btn:hover:not(:disabled) { background: #C0001A; }
        .login-btn:disabled { opacity: 0.4; cursor: default; }
      `}</style>

      {/* Painel esquerdo — imagem editorial */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 48,
      }}>
        {/* Fundo com padrão geométrico médico */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #0A0F1E 0%, #1a0509 60%, #C0001A 100%)',
        }} />

        {/* Grid ECG decorativo */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Número editorial gigante */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(120px, 20vw, 280px)',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.04)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          letterSpacing: '-0.05em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          ATM
        </div>

        {/* Linha ECG decorativa */}
        <svg
          viewBox="0 0 800 120"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            width: '100%',
            transform: 'translateY(-50%)',
            opacity: 0.15,
          }}
          preserveAspectRatio="none"
        >
          <polyline
            points="0,60 80,60 100,60 110,20 120,100 130,10 140,110 150,60 160,60 240,60 260,60 270,45 280,75 290,60 370,60 390,60 400,20 410,100 420,10 430,110 440,60 450,60 530,60 550,60 560,45 570,75 580,60 660,60 680,60 690,20 700,100 710,10 720,110 730,60 740,60 800,60"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
          />
        </svg>

        {/* Badges flutuantes */}
        <div style={{
          position: 'absolute',
          top: 48,
          left: 48,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease 0.3s',
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
            ATM Manutenção Total
          </p>
        </div>

        <div style={{
          position: 'absolute',
          top: 48,
          right: 48,
          textAlign: 'right',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease 0.5s',
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
            v1.0 · 2026
          </p>
        </div>

        {/* Stats editoriais */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.4s',
        }}>
          <div style={{ display: 'flex', gap: 48, marginBottom: 32 }}>
            {[
              { num: '52', label: 'Equipamentos' },
              { num: '5', label: 'Hospitais' },
              { num: '100%', label: 'Digital' },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 48,
                  fontWeight: 300,
                  color: '#fff',
                  margin: 0,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}>{stat.num}</p>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.4)',
                  margin: '6px 0 0',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Linha decorativa */}
          <div style={{
            width: '100%',
            height: 1,
            background: 'rgba(255,255,255,0.15)',
            marginBottom: 24,
            transformOrigin: 'left',
            animation: mounted ? 'line-in 1.2s cubic-bezier(0.16,1,0.3,1) 0.6s both' : 'none',
          }} />

          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 18,
            fontStyle: 'italic',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            Sistema de Gestão de Eletromedicina
          </p>
        </div>

        {/* Ticker horizontal */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 36,
          background: '#C0001A',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            display: 'flex',
            gap: 0,
            animation: 'marquee 20s linear infinite',
            whiteSpace: 'nowrap',
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '0 32px',
              }}>
                ATM Eletromedicina · Hospital CUF Porto · Gestão de Calibrações · Manutenção Preventiva ·
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div style={{
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
        transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s',
      }}>

        {/* Logo top */}
        <div style={{ position: 'absolute', top: 40, left: 56 }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 13,
            fontWeight: 400,
            color: '#1a1a1a',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: 0,
          }}>Eletromedicina</p>
        </div>

        {/* Título editorial */}
        <div style={{ marginBottom: 56 }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            fontWeight: 500,
            color: '#C0001A',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            margin: '0 0 16px',
          }}>Acesso Restrito</p>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 52,
            fontWeight: 300,
            color: '#1a1a1a',
            margin: 0,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>
            Bem-vindo
            <br />
            <em style={{ fontStyle: 'italic', color: '#666' }}>de volta.</em>
          </h1>

          <div style={{
            width: 40,
            height: 1,
            background: '#C0001A',
            marginTop: 24,
            transformOrigin: 'left',
            animation: mounted ? 'line-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s both' : 'none',
          }} />
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <label style={{
              display: 'block',
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              fontWeight: 500,
              color: focusedField === 'user' ? '#C0001A' : '#999',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 8,
              transition: 'color 0.3s',
            }}>
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
            <label style={{
              display: 'block',
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              fontWeight: 500,
              color: focusedField === 'pass' ? '#C0001A' : '#999',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 8,
              transition: 'color 0.3s',
            }}>
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              borderLeft: '2px solid #C0001A',
              paddingLeft: 12,
            }}>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: '#C0001A',
                fontWeight: 400,
              }}>{erro}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.3)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                A entrar
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 40, left: 56, right: 56 }}>
          <div style={{ height: 1, background: '#e0deda', marginBottom: 20 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              color: '#999',
              margin: 0,
              letterSpacing: '0.05em',
            }}>ATM Manutenção Total</p>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              color: '#999',
              margin: 0,
              letterSpacing: '0.05em',
            }}>Porto · 2026</p>
          </div>
        </div>
      </div>
    </div>
  )
}