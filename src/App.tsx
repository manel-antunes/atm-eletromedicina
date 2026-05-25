import { useState, useEffect } from 'react'
import type { Equipamento } from './data/equipamentos'
import ImportarExcel from './components/ImportarExcel'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
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
import Mapa from './pages/Mapa'
import Calendario from './pages/Calendario'
import Login from './pages/Login'
import ToastContainer from './components/Toast'
import EstadoOffline from './components/EstadoOffline'
import ErroBackend from './components/ErroBackend'
import { useToast } from './hooks/useToast'
import LoadingATM from './components/LoadingATM'
import { carregarEquipamentos, importarEquipamentos } from './services/api'

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
  mapa:         'Mapa de Equipamentos',
  
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function App() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard')
  const [equipDetalhe, setEquipDetalhe] = useState<Equipamento | null>(null)
  const [apresentacao, setApresentacao] = useState(false)
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [erroBackend, setErroBackend] = useState(false)
  const [token, setToken] = useState<string | null>(localStorage.getItem('atm_token'))
  const [nomeUtilizador, setNomeUtilizador] = useState(localStorage.getItem('atm_nome') ?? '')
  const [verificandoToken, setVerificandoToken] = useState(true)
  const { toasts, mostrar, remover } = useToast()
  const isMobile = useIsMobile()

  // Verifica token
  useEffect(() => {
    if (!token) { setVerificandoToken(false); return }
    fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) {
          setToken(null)
          setNomeUtilizador('')
          localStorage.removeItem('atm_token')
          localStorage.removeItem('atm_nome')
        }
      })
      .catch(() => {})
      .finally(() => setVerificandoToken(false))
  }, [])

  // Carrega equipamentos
  useEffect(() => {
    if (!token || verificandoToken) return
    carregarEquipamentos()
      .then(dados => {
        setErroBackend(false)
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
      .finally(() => setCarregando(false))
  }, [token, verificandoToken])

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
    setSidebarAberta(false)
  }

  // A verificar token
if (verificandoToken) {
  return <LoadingATM mensagem="A verificar sessão..." />
}

  // Não autenticado
  if (!token) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onRemover={remover} />
      </>
    )
  }

  // A carregar
if (carregando) {
  return <LoadingATM mensagem="A carregar equipamentos..." />
}

  // Sem equipamentos ou a reimportar
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
      case 'dashboard':   return <Dashboard equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'calibracoes': return <Calibracoes equipamentos={equipamentos} onAtualizar={handleAtualizar} onVerDetalhe={setEquipDetalhe} />
      case 'inventario':  return <Inventario equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'cedencias':   return <Cedencias equipamentos={equipamentos} onAtualizar={setEquipamentos} />
      case 'relatorios':  return <Relatorios equipamentos={equipamentos} />
      case 'ia':          return <DashboardIA equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'calendario':  return <Calendario />
      case 'documentos':  return <Documentos equipamentos={equipamentos} />
      case 'contactos':   return <Contactos equipamentos={equipamentos} />
      case 'mapa':        return <Mapa equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'preventivas': return <PlanoPreventivas />
      default:            return null
    }
  }

  const isCalendario = paginaAtiva === 'calendario' && !equipDetalhe

  return (
    <>
      <EstadoOffline />

      {erroBackend && (
        <ErroBackend onTentar={() => { setErroBackend(false); setCarregando(true); window.location.reload() }} />
      )}

      {apresentacao && (
        <ModoApresentacao equipamentos={equipamentos} onFechar={() => setApresentacao(false)} />
      )}

      {isMobile && sidebarAberta && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarAberta(false)} />
      )}

      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <div className={`${isMobile ? `fixed top-0 left-0 h-full z-50 transition-transform duration-300 ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}` : 'relative'}`}>
          <Sidebar
            paginaAtiva={paginaAtiva}
            onNavegar={navegar}
            equipamentos={equipamentos}
            nomeUtilizador={nomeUtilizador}
            onLogout={handleLogout}
          />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar
            titulo={equipDetalhe ? equipDetalhe.descricao : titulos[paginaAtiva]}
            totalEquipamentos={equipamentos.length}
            onReimportar={() => {
              setEquipamentos([])
            }}
            equipamentos={equipamentos}
            onVerDetalhe={(eq) => setEquipDetalhe(eq)}
            onApresentacao={() => setApresentacao(true)}
            onMenuToggle={() => setSidebarAberta(!sidebarAberta)}
            isMobile={isMobile}
          />
          <main className={`flex-1 overflow-hidden ${isCalendario ? '' : 'overflow-y-auto p-3 md:p-5'}`}>
            {renderPagina()}
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemover={remover} />
    </>
  )
}

export default App