import { useState } from 'react'

const API_URL = 'https://atm-eletromedicina-production.up.railway.app'

interface Props {
  onLogin: (token: string, nome: string) => void
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

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
  <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#060910' }}>
    <style>{`
      @keyframes fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 70%{transform:scale(1.5);opacity:0} 100%{transform:scale(1.5);opacity:0} }
      @keyframes rotate-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      .fade-up { animation: fade-up .5s ease both }
      .float { animation: float 4s ease-in-out infinite }
    `}</style>

    {/* Fundo animado */}
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Gradiente central */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(192,0,26,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
      {/* Círculo decorativo grande */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, border: '1px solid rgba(192,0,26,0.06)', borderRadius: '50%', animation: 'rotate-slow 30s linear infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 550, height: 550, border: '1px solid rgba(192,0,26,0.08)', borderRadius: '50%', animation: 'rotate-slow 20s linear infinite reverse' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, border: '1px solid rgba(192,0,26,0.1)', borderRadius: '50%' }} />
      {/* Grid de pontos */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(192,0,26,0.07) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Brilho superior */}
      <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(192,0,26,0.08) 0%, transparent 70%)' }} />
    </div>

    <div className="fade-up w-full max-w-sm px-6 relative z-10">
      {/* Logo com animação float */}
      <div className="text-center mb-8 float">
        <div className="relative inline-block mb-4">
          {/* Pulse rings */}
          <div style={{ position: 'absolute', inset: -8, borderRadius: 24, border: '1px solid rgba(192,0,26,0.3)', animation: 'pulse-ring 2s ease-out infinite' }} />
          <div style={{ position: 'absolute', inset: -4, borderRadius: 22, border: '1px solid rgba(192,0,26,0.2)', animation: 'pulse-ring 2s ease-out infinite .5s' }} />
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #C0001A 0%, #E30613 100%)', boxShadow: '0 0 40px rgba(192,0,26,0.4)' }}>
            <span className="text-white text-xl font-black tracking-tight">ATM</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">ATM Eletromedicina</h1>
        <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Sistema de Gestão · HPRT
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl p-6" style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
      }}>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Utilizador
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'white',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(192,0,26,0.5)'; e.target.style.background = 'rgba(255,255,255,0.07)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(192,0,26,0.5)'; e.target.style.background = 'rgba(255,255,255,0.07)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5" style={{ background: 'rgba(192,0,26,0.12)', border: '1px solid rgba(192,0,26,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-xs font-medium" style={{ color: '#f87171' }}>{erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 mt-1"
            style={{
              background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #C0001A 0%, #E30613 100%)',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(192,0,26,0.35)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'rotate-slow .6s linear infinite' }} />
                A entrar...
              </span>
            ) : 'Entrar →'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
        ATM Manutenção Total · v1.0 · 2026
      </p>
    </div>
  </div>
)
}