import { ServerCrash, RefreshCw } from 'lucide-react'
import logoAtm from '../assets/logo-atm.png'

interface Props {
  onTentar: () => void
}

export default function ErroBackend({ onTentar }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: '#080c14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: ''Noto Sans'',
    }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <img
        src={logoAtm}
        alt="ATM"
        style={{ height: 48, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9, marginBottom: 32, animation: 'float 3s ease-in-out infinite' }}
      />
      

      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(234,179,8,0.1)',
        border: '1px solid rgba(234,179,8,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <ServerCrash size={32} color="#facc15" />
      </div>

      <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Servidor temporariamente indisponível
      </p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32, maxWidth: 360, lineHeight: 1.6, textAlign: 'center' }}>
        Não foi possível ligar ao servidor ATM. O servidor pode estar a reiniciar — tenta novamente em alguns segundos.
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onTentar}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#C0001A', color: '#fff',
            border: 'none',
            padding: '12px 24px', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 24px',
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
          }}
        >
          Recarregar página
        </button>
      </div>
    </div>
  )
}