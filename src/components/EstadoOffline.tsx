import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import logoAtm from '../assets/logo-atm.png'

export default function EstadoOffline() {
  const [online, setOnline] = useState(navigator.onLine)
  const [tentativas, setTentativas] = useState(0)

  useEffect(() => {
    function handleOnline() { setOnline(true) }
    function handleOffline() { setOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#080c14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Noto Sans',
    }}>
      {/* Fundo animado */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 300 + i * 80,
            height: 300 + i * 80,
            borderRadius: '50%',
            border: '1px solid rgba(192,0,26,0.08)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `pulse-ring ${2 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.1; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px' }}>

        {/* Logo */}
        <img
          src={logoAtm}
          alt="ATM"
          style={{ height: 48, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9, marginBottom: 32, animation: 'float 3s ease-in-out infinite' }}
        />

        {/* Ícone offline */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(192,0,26,0.1)',
          border: '1px solid rgba(192,0,26,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <WifiOff size={32} color="#f87171" />
        </div>

        <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Sem ligação à internet
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32, maxWidth: 320, lineHeight: 1.6 }}>
          O sistema ATM Eletromedicina necessita de ligação à internet para aceder aos dados dos equipamentos.
        </p>

        <button
          onClick={() => { setTentativas(t => t + 1); window.location.reload() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#C0001A', color: '#fff',
            border: 'none',
            padding: '12px 24px', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            margin: '0 auto',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
          onMouseLeave={e => e.currentTarget.style.background = '#C0001A'}
        >
          <RefreshCw size={14} style={{ animation: tentativas > 0 ? 'spin-slow 1s linear' : 'none' }} />
          Tentar novamente
        </button>

        {tentativas > 0 && (
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 16 }}>
            {tentativas} tentativa(s) de reconexão
          </p>
        )}
      </div>
    </div>
  )
}