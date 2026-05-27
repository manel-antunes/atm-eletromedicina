import { useState } from 'react'
import { LayoutDashboard, ClipboardCheck, Stethoscope, FileText, MoreHorizontal, X, ClipboardList, Package, ArrowLeftRight, Brain, FolderOpen, Phone, Map, Calendar, QrCode } from 'lucide-react'

const PRINCIPAIS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'calibracoes', label: 'Calibrações',  icon: ClipboardCheck },
  { id: 'preventivas', label: 'Preventivas',  icon: Stethoscope },
  { id: 'relatorios',  label: 'Relatórios',   icon: FileText },
]

const SECUNDARIOS = [
  { id: 'inventario',  label: 'Inventário',   icon: Package },
  { id: 'cedencias',   label: 'Cedências',    icon: ArrowLeftRight },
  { id: 'ia',          label: 'Análise IA',   icon: Brain },
  { id: 'calendario',  label: 'Calendário',   icon: Calendar },
  { id: 'documentos',  label: 'Documentos',   icon: FolderOpen },
  { id: 'contactos',   label: 'Contactos',    icon: Phone },
  { id: 'mapa',        label: 'Mapa',         icon: Map },
  { id: 'qrcodes',     label: 'QR Codes',     icon: QrCode },
]

interface Props {
  paginaAtiva: string
  onNavegar: (pagina: string) => void
  alertas: number
}

export default function BottomNav({ paginaAtiva, onNavegar, alertas }: Props) {
  const [maisAberto, setMaisAberto] = useState(false)

  function navegar(id: string) {
    onNavegar(id)
    setMaisAberto(false)
  }

  return (
    <>
      {/* Drawer "Mais" */}
      {maisAberto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMaisAberto(false)}
        />
      )}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: maisAberto ? 64 : -300,
        zIndex: 91, background: '#fff', borderRadius: '20px 20px 0 0',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.15)',
        padding: '20px 16px 16px',
        transition: 'bottom 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Mais secções</p>
          <button onClick={() => setMaisAberto(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 99, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={14} color="#64748b" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {SECUNDARIOS.map(({ id, label, icon: Icon }) => {
            const ativo = paginaAtiva === id
            return (
              <button
                key={id}
                onClick={() => navegar(id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: ativo ? 'rgba(192,0,26,0.08)' : '#f8fafc',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={20} color={ativo ? '#C0001A' : '#64748b'} />
                <span style={{ fontSize: 10, fontWeight: 600, color: ativo ? '#C0001A' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 92,
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {PRINCIPAIS.map(({ id, label, icon: Icon }) => {
          const ativo = paginaAtiva === id
          const temBadge = (id === 'dashboard' || id === 'calibracoes') && alertas > 0
          return (
            <button
              key={id}
              onClick={() => navegar(id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '10px 4px', border: 'none', cursor: 'pointer',
                background: 'transparent', position: 'relative', transition: 'all 0.15s',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 40, height: 28, borderRadius: 14,
                  background: ativo ? 'rgba(192,0,26,0.1)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <Icon size={20} color={ativo ? '#C0001A' : '#94a3b8'} />
                </div>
                {temBadge && (
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 99, background: '#C0001A', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 900, color: '#fff' }}>{alertas > 9 ? '9+' : alertas}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: ativo ? 700 : 500, color: ativo ? '#C0001A' : '#94a3b8', transition: 'all 0.15s' }}>{label}</span>
            </button>
          )
        })}

        {/* Botão Mais */}
        <button
          onClick={() => setMaisAberto(!maisAberto)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 4px', border: 'none', cursor: 'pointer',
            background: 'transparent', transition: 'all 0.15s',
          }}
        >
          <div style={{
            width: 40, height: 28, borderRadius: 14,
            background: maisAberto ? 'rgba(192,0,26,0.1)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            <MoreHorizontal size={20} color={maisAberto ? '#C0001A' : '#94a3b8'} />
          </div>
          <span style={{ fontSize: 10, fontWeight: maisAberto ? 700 : 500, color: maisAberto ? '#C0001A' : '#94a3b8' }}>Mais</span>
        </button>
      </nav>
    </>
  )
}