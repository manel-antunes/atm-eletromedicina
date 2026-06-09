import { useState } from 'react'
import { LayoutDashboard, ClipboardCheck, Package, ArrowLeftRight, FileText, Brain, FolderOpen, Phone, Calendar, LogOut, QrCode, Stethoscope, ChevronRight, Command, User, ShieldCheck, MessageSquare } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import logoAtm from '../assets/logo-atm.png'
import NotificacoesPush from './NotificacoesPush'
import { contarAlertas } from '../utils/equipamentoUtils'

interface Props {
  paginaAtiva: string
  onNavegar: (pagina: string) => void
  equipamentos: Equipamento[]
  nomeUtilizador?: string
  onLogout?: () => void
  onCommandPalette: () => void
}

const ITENS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'calibracoes', label: 'Calibrações',  icon: ClipboardCheck },
  { id: 'inventario',  label: 'Inventário',   icon: Package },
  { id: 'cedencias',   label: 'Cedências',    icon: ArrowLeftRight },
  { id: 'relatorios',  label: 'Relatórios',   icon: FileText },
  { id: 'ia',          label: 'Análise IA',   icon: Brain },
  { id: 'calendario',  label: 'Calendário',   icon: Calendar },
  { id: 'documentos',  label: 'Documentos',   icon: FolderOpen },
  { id: 'contactos',   label: 'Contactos',    icon: Phone },
  { id: 'qrcodes',     label: 'QR Codes',     icon: QrCode },
  { id: 'preventivas', label: 'Preventivas',  icon: Stethoscope },
  { id: 'chat',        label: 'Chat',         icon: MessageSquare },
]

const ITENS_FOOTER = [
  { id: 'perfil',        label: 'Perfil',         icon: User,         roles: ['admin', 'tecnico'] },
  { id: 'administracao', label: 'Administração',  icon: ShieldCheck,  roles: ['admin'] },
]

export default function SidebarCollapsible({ paginaAtiva, onNavegar, equipamentos, nomeUtilizador, onLogout, onCommandPalette }: Props) {
  const [expandida, setExpandida] = useState(false)
  const role = localStorage.getItem('atm_role') ?? 'tecnico'
  const alertas = contarAlertas(equipamentos)
  const largura = expandida ? 224 : 64

  return (
    <aside
      style={{
        width: largura, minWidth: largura, height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: '#0A0F1E',
        transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1), min-width 0.25s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10,
      }}
      onMouseEnter={() => setExpandida(true)}
      onMouseLeave={() => setExpandida(false)}
    >
      {/* Logo */}
<div onClick={() => onNavegar('dashboard')} style={{ padding: expandida ? '20px 20px 16px' : '20px 14px 16px', display: 'flex', alignItems: 'center', gap: 10, transition: 'padding 0.25s', borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: 72, cursor: 'pointer' }}>        <div style={{ width: 36, height: 36, background: '#C0001A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src={logoAtm} alt="ATM" style={{ width: 24, filter: 'brightness(0) invert(1)' }} />
        </div>
        {expandida && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 800, margin: 0 }}>ATM</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Eletromedicina</p>
          </div>
        )}
      </div>

      {/* Command Palette trigger */}
      <div style={{ padding: expandida ? '10px 12px' : '10px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onCommandPalette}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            padding: expandida ? '8px 12px' : '8px', cursor: 'pointer',
            transition: 'all 0.15s', justifyContent: expandida ? 'flex-start' : 'center',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
        >
          <Command size={14} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
          {expandida && (
            <>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1, textAlign: 'left' }}>Pesquisar...</span>
              <kbd style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 5px', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <style>{`
        .atm-sidebar-nav::-webkit-scrollbar { display: none; }
      `}</style>
      <nav className="atm-sidebar-nav" aria-label="Navegação principal" style={{ flex: 1, padding: '8px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 2, scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
        {ITENS.map(({ id, label, icon: Icon }) => {
          const ativo = paginaAtiva === id
          const temBadge = (id === 'dashboard' || id === 'calibracoes') && alertas > 0
          return (
            <button
              key={id}
              onClick={() => onNavegar(id)}
              aria-label={label}
              aria-current={ativo ? 'page' : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: expandida ? 12 : 0, justifyContent: expandida ? 'flex-start' : 'center',
                padding: expandida ? '9px 12px' : '9px',
                border: 'none', cursor: 'pointer',
                background: ativo ? 'rgba(192,0,26,0.2)' : 'transparent',
                transition: 'all 0.15s', position: 'relative',
              }}
              onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)' }}
              onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={18} color={ativo ? '#ff4458' : 'rgba(255,255,255,0.5)'} />
                {temBadge && !expandida && (
                  <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#C0001A', border: '1.5px solid #0A0F1E' }} />
                )}
              </div>
              {expandida && (
                <>
                  <span style={{ fontSize: 12, fontWeight: ativo ? 700 : 500, color: ativo ? '#fff' : 'rgba(255,255,255,0.6)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>
                  {temBadge && (
                    <span style={{ background: '#C0001A', color: '#fff', fontSize: 10, fontWeight: 900, padding: '1px 6px' }}>{alertas > 99 ? '99+' : alertas}</span>
                  )}
                  {ativo && <ChevronRight size={12} color="rgba(255,255,255,0.3)" />}
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* Perfil + Administração */}
      <div style={{ padding: '0 8px 4px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 6 }}>
        {ITENS_FOOTER.filter(item => item.roles.includes(role)).map(({ id, label, icon: Icon }) => {
          const ativo = paginaAtiva === id
          return (
            <button
              key={id}
              onClick={() => onNavegar(id)}
              aria-label={label}
              aria-current={ativo ? 'page' : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: expandida ? 12 : 0, justifyContent: expandida ? 'flex-start' : 'center',
                padding: expandida ? '9px 12px' : '9px',
                border: 'none', cursor: 'pointer',
                background: ativo ? 'rgba(192,0,26,0.2)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)' }}
              onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon size={18} color={ativo ? '#ff4458' : 'rgba(255,255,255,0.5)'} />
              {expandida && (
                <span style={{ fontSize: 12, fontWeight: ativo ? 700 : 500, color: ativo ? '#fff' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>
              )}
            </button>
          )
        })}
      </div>

{/* Push */}
<div style={{ padding: '0 8px 6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
  <NotificacoesPush compacto={!expandida} />
</div>
      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {nomeUtilizador && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', justifyContent: expandida ? 'flex-start' : 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C0001A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{nomeUtilizador.charAt(0).toUpperCase()}</span>
            </div>
            {expandida && (
              <>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeUtilizador}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Sessão ativa</p>
                </div>
                {onLogout && (
                  <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, display: 'flex' }}>
                    <LogOut size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
