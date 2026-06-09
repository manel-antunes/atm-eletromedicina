import { LayoutDashboard, ClipboardCheck, Package, ArrowLeftRight, FileText, Brain, FolderOpen, Phone, Map, Calendar, LogOut, QrCode, Stethoscope } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'
import logoAtm from '../assets/logo-atm.png'
import NotificacoesPush from './NotificacoesPush'

interface Props {
  paginaAtiva: string
  onNavegar: (pagina: string) => void
  equipamentos: Equipamento[]
  nomeUtilizador?: string
  onLogout?: () => void
}

function parseData(dataStr: string): Date | null {
  if (!dataStr || dataStr === 'undefined') return null
  const numerico = Number(dataStr)
  if (!isNaN(numerico) && numerico > 40000) {
    const data = new Date((numerico - 25569) * 86400 * 1000)
    if (isValid(data)) return data
  }
  const formatos = ['M/d/yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']
  for (const fmt of formatos) {
    const tentativa = parse(dataStr, fmt, new Date())
    if (isValid(tentativa)) return tentativa
  }
  return null
}

function contarAlertas(equipamentos: Equipamento[]): number {
  return equipamentos.filter(eq => {
    const proxima = parseData(eq.dataCalibracao)
    if (!proxima) return true
    return differenceInDays(proxima, new Date()) <= 60
  }).length
}

export default function Sidebar({ paginaAtiva, onNavegar, equipamentos, nomeUtilizador, onLogout }: Props) {
  const alertas = contarAlertas(equipamentos)

  const itens = [
    { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard, badge: alertas },
    { id: 'calibracoes', label: 'Calibrações',  icon: ClipboardCheck,  badge: alertas },
    { id: 'inventario',  label: 'Inventário',   icon: Package,         badge: 0 },
    { id: 'cedencias',   label: 'Cedências',    icon: ArrowLeftRight,  badge: 0 },
    { id: 'relatorios',  label: 'Relatórios',   icon: FileText,        badge: 0 },
    { id: 'ia',          label: 'Análise IA',   icon: Brain,           badge: 0 },
    { id: 'calendario',  label: 'Calendário',   icon: Calendar,        badge: 0 },
    { id: 'documentos',  label: 'Documentos',   icon: FolderOpen,      badge: 0 },
    { id: 'contactos',   label: 'Contactos',    icon: Phone,           badge: 0 },
    { id: 'mapa',        label: 'Mapa',         icon: Map,             badge: 0 },
    { id: 'qrcodes',     label: 'QR Codes',     icon: QrCode,          badge: 0 },
    { id: 'preventivas', label: 'Preventivas',  icon: Stethoscope,     badge: 0 },
  ]

  return (
    <aside style={{ width: 224, minWidth: 224, height: '100vh', display: 'flex', flexDirection: 'column', background: '#C0001A' }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px' }}>
        <img src={logoAtm} alt="ATM" style={{ width: 112, objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: 12 }} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', width: '100%' }} />
        <p style={{ color: 'rgba(255,200,200,0.7)', fontSize: 10, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
          Eletromedicina
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {itens.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => onNavegar(id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: paginaAtiva === id ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: paginaAtiva === id ? '#fff' : 'rgba(255,200,200,0.8)',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => { if (paginaAtiva !== id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { if (paginaAtiva !== id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Icon size={15} style={{ opacity: paginaAtiva === id ? 1 : 0.6, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge > 0 && (
              <span style={{ background: '#fff', color: '#C0001A', fontSize: 10, fontWeight: 900, padding: '1px 6px', minWidth: 20, textAlign: 'center' }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Notificações Push */}
      <div style={{ padding: '0 12px 8px' }}>
        <NotificacoesPush />
      </div>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {nomeUtilizador && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{nomeUtilizador.charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeUtilizador}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Sessão ativa</p>
              </div>
            </div>
            {onLogout && (
              <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 6, display: 'flex' }}
                title="Terminar sessão">
                <LogOut size={13} />
              </button>
            )}
          </div>
        )}
        <p style={{ fontSize: 10, color: 'rgba(255,200,200,0.3)', fontFamily: 'monospace', padding: '0 8px', marginTop: 4 }}>v1.0 · ATM 2026</p>
      </div>
    </aside>
  )
}