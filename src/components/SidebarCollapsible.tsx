import { useState } from 'react'
import { LayoutDashboard, ClipboardCheck, Package, ArrowLeftRight, FileText, Brain, FolderOpen, Phone, Calendar, LogOut, QrCode, Stethoscope, Command, User, ShieldCheck, MessageSquare, ChevronDown } from 'lucide-react'
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

interface ItemNav { id: string; label: string; icon: React.ElementType }
interface Grupo { label: string; itens: ItemNav[] }

const DASHBOARD: ItemNav = { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }

const GRUPOS: Grupo[] = [
  {
    label: 'Equipamentos',
    itens: [
      { id: 'inventario',  label: 'Inventário',  icon: Package },
      { id: 'calibracoes', label: 'Calibrações', icon: ClipboardCheck },
      { id: 'preventivas', label: 'Preventivas', icon: Stethoscope },
      { id: 'qrcodes',     label: 'QR Codes',    icon: QrCode },
    ],
  },
  {
    label: 'Operações',
    itens: [
      { id: 'cedencias',  label: 'Cedências',  icon: ArrowLeftRight },
      { id: 'calendario', label: 'Calendário', icon: Calendar },
    ],
  },
  {
    label: 'Análise & Docs',
    itens: [
      { id: 'relatorios', label: 'Relatórios', icon: FileText },
      { id: 'ia',         label: 'Análise IA', icon: Brain },
      { id: 'documentos', label: 'Documentos', icon: FolderOpen },
    ],
  },
  {
    label: 'Comunicação',
    itens: [
      { id: 'contactos', label: 'Contactos', icon: Phone },
      { id: 'chat',      label: 'Chat',      icon: MessageSquare },
    ],
  },
]

const ITENS_FOOTER = [
  { id: 'perfil',        label: 'Perfil',        icon: User,        roles: ['admin', 'tecnico'] },
  { id: 'administracao', label: 'Administração', icon: ShieldCheck, roles: ['admin'] },
]

export default function SidebarCollapsible({ paginaAtiva, onNavegar, equipamentos, nomeUtilizador, onLogout, onCommandPalette }: Props) {
  const [expandida, setExpandida] = useState(false)

  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    GRUPOS.forEach(g => { init[g.label] = g.itens.some(i => i.id === paginaAtiva) })
    return init
  })

  const role = localStorage.getItem('atm_role') ?? 'tecnico'
  const alertas = contarAlertas(equipamentos)
  const largura = expandida ? 224 : 64

  function toggleGrupo(label: string) {
    setGruposAbertos(prev => ({ ...prev, [label]: !prev[label] }))
  }

  function renderItem({ id, label, icon: Icon }: ItemNav, indentado = false) {
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
          gap: 10, justifyContent: expandida ? 'flex-start' : 'center',
          padding: expandida ? (indentado ? '8px 12px 8px 14px' : '9px 12px') : '9px',
          border: 'none', cursor: 'pointer',
          background: ativo ? 'rgba(192,0,26,0.15)' : 'transparent',
          borderLeft: ativo && indentado ? '2px solid #C0001A' : '2px solid transparent',
          transition: 'background 0.15s',
          position: 'relative',
        }}
        onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Icon size={16} color={ativo ? '#ff4458' : 'rgba(255,255,255,0.45)'} />
          {temBadge && !expandida && (
            <div style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: '#C0001A', border: '1.5px solid #0A0F1E' }} />
          )}
        </div>
        {expandida && (
          <>
            <span style={{ fontSize: 12, fontWeight: ativo ? 600 : 400, color: ativo ? '#fff' : 'rgba(255,255,255,0.55)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {label}
            </span>
            {temBadge && (
              <span style={{ background: '#C0001A', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 2 }}>
                {alertas > 99 ? '99+' : alertas}
              </span>
            )}
          </>
        )}
      </button>
    )
  }

  return (
    <aside
      style={{
        width: largura, minWidth: largura, height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: '#0A0F1E',
        transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1), min-width 0.25s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 10,
      }}
      onMouseEnter={() => setExpandida(true)}
      onMouseLeave={() => setExpandida(false)}
    >
      {/* Logo */}
      <div
        onClick={() => onNavegar('dashboard')}
        style={{ padding: expandida ? '20px 20px 16px' : '20px 14px 16px', display: 'flex', alignItems: 'center', gap: 10, transition: 'padding 0.25s', borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: 72, cursor: 'pointer' }}
      >
        <div style={{ width: 36, height: 36, background: '#C0001A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src={logoAtm} alt="ATM" style={{ width: 24, filter: 'brightness(0) invert(1)' }} />
        </div>
        {expandida && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 800, margin: 0 }}>ATM</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: 0 }}>Eletromedicina</p>
          </div>
        )}
      </div>

      {/* Command Palette */}
      <div style={{ padding: expandida ? '8px 12px' : '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onCommandPalette}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            padding: expandida ? '7px 10px' : '7px', cursor: 'pointer',
            transition: 'all 0.15s', justifyContent: expandida ? 'flex-start' : 'center',
            borderRadius: 4,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
        >
          <Command size={13} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
          {expandida && (
            <>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', flex: 1, textAlign: 'left' }}>Pesquisar...</span>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', padding: '1px 5px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', borderRadius: 3 }}>⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <style>{`.atm-nav::-webkit-scrollbar{display:none}`}</style>
      <nav
        className="atm-nav"
        aria-label="Navegação principal"
        style={{ flex: 1, padding: '6px 8px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', scrollbarWidth: 'none' } as React.CSSProperties}
      >
        {/* Dashboard */}
        {renderItem(DASHBOARD)}

        {/* Separador */}
        {expandida && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 4px' }} />}

        {expandida ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {GRUPOS.map(grupo => {
              const aberto = gruposAbertos[grupo.label] ?? false
              const temAtivo = grupo.itens.some(i => paginaAtiva === i.id)
              return (
                <div key={grupo.label}>
                  {/* Header do grupo */}
                  <button
                    onClick={() => toggleGrupo(grupo.label)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', border: 'none', cursor: 'pointer',
                      background: aberto ? 'rgba(255,255,255,0.04)' : 'transparent',
                      borderRadius: 4,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!aberto) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!aberto) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {temAtivo && !aberto && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0001A', flexShrink: 0 }} />
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: temAtivo ? 'rgba(255,150,150,0.9)' : aberto ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                      flex: 1, textAlign: 'left', transition: 'color 0.15s',
                    }}>
                      {grupo.label}
                    </span>
                    <ChevronDown
                      size={12}
                      color={aberto ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}
                      style={{ transition: 'transform 0.22s ease', transform: aberto ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }}
                    />
                  </button>

                  {/* Itens com animação */}
                  <div style={{
                    overflow: 'hidden',
                    maxHeight: aberto ? `${grupo.itens.length * 44}px` : '0px',
                    transition: 'max-height 0.22s ease',
                    paddingLeft: 4,
                  }}>
                    {grupo.itens.map(item => renderItem(item, true))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </nav>

      {/* Perfil + Administração */}
      <div style={{ padding: '4px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                gap: expandida ? 10 : 0, justifyContent: expandida ? 'flex-start' : 'center',
                padding: expandida ? '8px 12px' : '9px',
                border: 'none', cursor: 'pointer',
                background: ativo ? 'rgba(192,0,26,0.15)' : 'transparent',
                transition: 'background 0.15s', borderRadius: 4,
              }}
              onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon size={16} color={ativo ? '#ff4458' : 'rgba(255,255,255,0.45)'} />
              {expandida && (
                <span style={{ fontSize: 12, fontWeight: ativo ? 600 : 400, color: ativo ? '#fff' : 'rgba(255,255,255,0.55)' }}>{label}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Push */}
      <div style={{ padding: '0 8px 6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <NotificacoesPush compacto={!expandida} />
      </div>

      {/* Footer utilizador */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {nomeUtilizador && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', justifyContent: expandida ? 'flex-start' : 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C0001A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{nomeUtilizador.charAt(0).toUpperCase()}</span>
            </div>
            {expandida && (
              <>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeUtilizador}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Sessão ativa</p>
                </div>
                {onLogout && (
                  <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 4, display: 'flex' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'}
                  >
                    <LogOut size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Indicador lateral ativo (modo colapsado) */}
      {!expandida && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, pointerEvents: 'none' }}>
          {(() => {
            const grupoAtivo = GRUPOS.find(g => g.itens.some(i => i.id === paginaAtiva))
            if (!grupoAtivo) return null
            const idx = GRUPOS.indexOf(grupoAtivo)
            const totalAltura = 72 + 52 + 6
            const alturaItem = 38
            const offset = totalAltura + idx * alturaItem
            return <div style={{ position: 'absolute', top: offset, height: alturaItem, width: 2, background: '#C0001A', borderRadius: 1 }} />
          })()}
        </div>
      )}
    </aside>
  )
}
