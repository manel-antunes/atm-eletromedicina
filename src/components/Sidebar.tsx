import { LayoutDashboard, ClipboardCheck, ClipboardList, Package, ArrowLeftRight, FileText, Brain, FolderOpen, Phone, Map, Calendar, LogOut } from 'lucide-react'
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
    { id: 'preventivas', label: 'Preventivas', icon: ClipboardList, badge: 0 },
  ]

  return (
    <aside className="w-56 min-w-56 h-screen flex flex-col" style={{ background: '#C0001A' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <img src={logoAtm} alt="ATM" className="w-28 object-contain brightness-0 invert mb-3" />
        <div className="h-px w-full opacity-20" style={{ background: 'white' }} />
        <p className="text-red-100 text-xs mt-3 opacity-70 uppercase tracking-widest font-semibold">
          Eletromedicina
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {itens.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => onNavegar(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-all rounded-lg ${
              paginaAtiva === id
                ? 'text-white bg-white/20'
                : 'text-red-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={15} className={paginaAtiva === id ? 'opacity-100' : 'opacity-60'} />
            <span className="flex-1 text-left">{label}</span>
            {badge > 0 && (
              <span className="bg-white text-red-700 text-xs font-black px-1.5 py-0.5 rounded-full min-w-5 text-center leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Notificações Push */}
      <div className="px-3 pb-2">
        <NotificacoesPush />
      </div>

      {/* Footer com utilizador e logout */}
      <div className="px-3 py-3 border-t border-white/10">
        {nomeUtilizador && (
          <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {nomeUtilizador.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate">{nomeUtilizador}</p>
                <p className="text-xs text-white/30">Sessão ativa</p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/10 transition-all flex-shrink-0"
                title="Terminar sessão"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        )}
        <p className="text-red-200 text-xs opacity-30 font-mono px-2 mt-1">v1.0 · ATM 2026</p>
      </div>
    </aside>
  )
}