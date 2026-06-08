import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import type { Equipamento } from './data/equipamentos'
import ImportarExcel from './components/ImportarExcel'
import SidebarCollapsible from './components/SidebarCollapsible'
import BottomNav from './components/BottomNav'
import CommandPalette from './components/CommandPalette'
import Topbar from './components/Topbar'
import PageTransition from './components/PageTransition'
import Dashboard from './pages/Dashboard'
import Calibracoes from './pages/Calibracoes'
import Inventario from './pages/Inventario'
import PlanoPreventivas from './pages/PlanoPreventivas'
import Cedencias from './pages/Cedencias'
import Relatorios from './pages/Relatorios'
import DetalheEquipamento from './pages/DetalheEquipamento'
import ModoApresentacao from './pages/ModoApresentacao'
import DashboardIA from './pages/DashboardIA'
import Documentos from './pages/Documentos'
import Contactos from './pages/Contactos'
import Perfil from './pages/Perfil'
import Administracao from './pages/Administracao'
import Chat from './pages/Chat'
import Calendario from './pages/Calendario'
import Login from './pages/Login'
import ToastContainer from './components/Toast'
import EstadoOffline from './components/EstadoOffline'
import ErroBackend from './components/ErroBackend'
import { useToast } from './hooks/useToast'
import LoadingATM from './components/LoadingATM'
import QRCodes from './pages/QRCodes'
import FichaPublica from './pages/FichaPublica'
import { carregarEquipamentos, importarEquipamentos } from './services/api'
import { differenceInDays, isValid } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://atm-eletromedicina.onrender.com'

const titulos: Record<string, string> = {
  dashboard:    'Dashboard Geral',
  calibracoes:  'Calibrações',
  inventario:   'Inventário de Equipamentos',
  cedencias:    'Cedências',
  relatorios:   'Relatórios',
  ia:           'Análise Inteligente',
  calendario:   'Calendário',
  documentos:   'Documentos',
  contactos:    'Contactos de Marcas',
  qrcodes:      'QR Codes',
  preventivas:  'Plano de Preventivas',
  chat:         'Chat',
  perfil:       'O Meu Perfil',
  administracao:'Administração',
}

// ── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { erro: boolean; mensagem: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { erro: false, mensagem: '' }
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { erro: true, mensagem: error.message }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info)
  }
  render() {
    if (this.state.erro) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f3f4f6', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 36, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 52, height: 52, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>⚠️</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Ocorreu um erro inesperado</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px', wordBreak: 'break-word' }}>{this.state.mensagem}</p>
            <button onClick={() => window.location.reload()}
              style={{ padding: '10px 24px', background: '#C0001A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Recarregar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function contarAlertas(equipamentos: Equipamento[]): number {
  return equipamentos.filter(eq => {
    const dataStr = eq.dataCalibracao
    if (!dataStr || dataStr === 'undefined') return true
    const numerico = Number(dataStr)
    let data: Date | null = null
    if (!isNaN(numerico) && numerico > 40000) {
      data = new Date((numerico - 25569) * 86400 * 1000)
    } else {
      data = new Date(dataStr)
    }
    if (!isValid(data)) return true
    return differenceInDays(data, new Date()) <= 60
  }).length
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const isFichaPublica = window.location.pathname.startsWith('/eq/')

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard')
  const [equipDetalhe, setEquipDetalhe] = useState<Equipamento | null>(null)
  const [apresentacao, setApresentacao] = useState(false)
  const [erroBackend, setErroBackend] = useState(false)
  const [token, setToken] = useState<string | null>(localStorage.getItem('atm_token'))
  const [nomeUtilizador, setNomeUtilizador] = useState(localStorage.getItem('atm_nome') ?? '')
  const [verificandoToken, setVerificandoToken] = useState(true)
  const [commandPaletteAberta, setCommandPaletteAberta] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null)
  const { toasts, mostrar, remover } = useToast()
  const isMobile = useIsMobile()
  const role = localStorage.getItem('atm_role') ?? 'tecnico'

  useEffect(() => {
    if (!token) { setVerificandoToken(false); return }
    fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) {
          setToken(null)
          setNomeUtilizador('')
          localStorage.removeItem('atm_token')
          localStorage.removeItem('atm_nome')
          localStorage.removeItem('atm_username')
          localStorage.removeItem('atm_role')
        }
      })
      .catch(() => {})
      .finally(() => setVerificandoToken(false))
  }, [token])

  useEffect(() => {
    if (!token || verificandoToken) return
    setSincronizando(true)
    carregarEquipamentos()
      .then(dados => {
        setErroBackend(false)
        setUltimaSync(new Date())
        if (dados && dados.length > 0) {
          const mapped = dados.map((row: Record<string, string>, i: number) => ({
            id: i + 1,
            numeroSAP: row.numero_sap,
            descricao: row.descricao,
            marca: row.marca,
            modelo: row.modelo,
            numeroSerie: row.numero_serie,
            dataCalibracao: row.data_calibracao,
            responsavel: row.responsavel,
            warning: row.warning,
            localizacao: row.localizacao,
            obs: row.obs,
            obs2: row.obs2,
            obs3: row.obs3,
            ccPasta2025: row.cc_pasta_2025,
            periodicidade: row.periodicidade ?? 'Anual',
          }))
          setEquipamentos(mapped)
        }
      })
      .catch(() => setErroBackend(true))
      .finally(() => { setCarregando(false); setSincronizando(false) })
  }, [token, verificandoToken])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteAberta(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Ficha pública — não precisa de auth nem layout
  if (isFichaPublica) return <FichaPublica />

  function handleLogin(novoToken: string, nome: string) {
    setToken(novoToken)
    setNomeUtilizador(nome)
    setCarregando(true)
  }

  function handleLogout() {
    setToken(null)
    setNomeUtilizador('')
    setEquipamentos([])
    localStorage.removeItem('atm_token')
    localStorage.removeItem('atm_nome')
    localStorage.removeItem('atm_username')
    localStorage.removeItem('atm_role')
  }

  async function handleImportar(novos: Equipamento[]) {
    await importarEquipamentos(novos)
    setEquipamentos(novos)
    mostrar('sucesso', `${novos.length} equipamentos importados`, 'Dados guardados na base de dados.')
  }

  function handleAtualizar(novos: Equipamento[]) {
    setEquipamentos(novos)
    mostrar('sucesso', 'Calibração registada!', 'Dados guardados na base de dados.')
  }

  function navegar(pagina: string) {
    setPaginaAtiva(pagina)
    setEquipDetalhe(null)
  }

  if (verificandoToken) return <LoadingATM mensagem="A verificar sessão..." />

  if (!token) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onRemover={remover} />
      </>
    )
  }

  if (carregando) return <LoadingATM mensagem="A carregar equipamentos..." />

  if (equipamentos.length === 0 && !erroBackend) {
    return (
      <>
        <ImportarExcel onImportar={handleImportar} />
        <ToastContainer toasts={toasts} onRemover={remover} />
      </>
    )
  }

  function renderPagina() {
    if (equipDetalhe) {
      return <DetalheEquipamento equipamento={equipDetalhe} onVoltar={() => setEquipDetalhe(null)} />
    }
    switch (paginaAtiva) {
      case 'dashboard':    return <Dashboard equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} onNavegar={navegar} />
      case 'calibracoes':  return <Calibracoes equipamentos={equipamentos} onAtualizar={handleAtualizar} onVerDetalhe={setEquipDetalhe} />
      case 'inventario':   return <Inventario equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'cedencias':    return <Cedencias equipamentos={equipamentos} onAtualizar={setEquipamentos} />
      case 'relatorios':   return <Relatorios equipamentos={equipamentos} />
      case 'ia':           return <DashboardIA equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'calendario':   return <Calendario />
      case 'documentos':   return <Documentos equipamentos={equipamentos} />
      case 'contactos':    return <Contactos equipamentos={equipamentos} />
      case 'preventivas':  return <PlanoPreventivas />
      case 'qrcodes':      return <QRCodes equipamentos={equipamentos} />
      case 'chat':         return <Chat />
      case 'perfil':       return <Perfil />
      case 'administracao': return role === 'admin' ? <Administracao /> : null
      default:             return null
    }
  }

  const isCalendario = paginaAtiva === 'calendario' && !equipDetalhe
  const alertas = contarAlertas(equipamentos)

  return (
    <>
      <EstadoOffline />

      {erroBackend && (
        <ErroBackend onTentar={() => { setErroBackend(false); setCarregando(true); window.location.reload() }} />
      )}

      {apresentacao && (
        <ModoApresentacao equipamentos={equipamentos} onFechar={() => setApresentacao(false)} />
      )}

      <CommandPalette
        aberto={commandPaletteAberta}
        onFechar={() => setCommandPaletteAberta(false)}
        onNavegar={navegar}
      />

      <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6', overflow: 'hidden' }}>
        {!isMobile && (
          <SidebarCollapsible
            paginaAtiva={paginaAtiva}
            onNavegar={navegar}
            equipamentos={equipamentos}
            nomeUtilizador={nomeUtilizador}
            onLogout={handleLogout}
            onCommandPalette={() => setCommandPaletteAberta(true)}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <Topbar
            titulo={equipDetalhe ? equipDetalhe.descricao : (titulos[paginaAtiva] ?? paginaAtiva)}
            totalEquipamentos={equipamentos.length}
            onReimportar={() => setEquipamentos([])}
            equipamentos={equipamentos}
            onVerDetalhe={(eq) => setEquipDetalhe(eq)}
            onApresentacao={() => setApresentacao(true)}
            onMenuToggle={() => setCommandPaletteAberta(true)}
            isMobile={isMobile}
            sincronizando={sincronizando}
            ultimaSync={ultimaSync}
            erroBackend={erroBackend}
          />
          <main style={{
            flex: 1,
            overflow: isCalendario ? 'hidden' : 'auto',
            padding: isCalendario ? 0 : (isMobile ? '12px 12px 80px' : '20px'),
          }}>
            <PageTransition paginaKey={equipDetalhe ? `detalhe-${equipDetalhe.id}` : paginaAtiva}>
              {renderPagina()}
            </PageTransition>
          </main>
        </div>
      </div>

      {isMobile && (
        <BottomNav
          paginaAtiva={paginaAtiva}
          onNavegar={navegar}
          alertas={alertas}
        />
      )}

      <ToastContainer toasts={toasts} onRemover={remover} />
    </>
  )
}

export default function AppComBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}
