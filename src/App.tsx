import { useState, useEffect } from 'react'
import type { Equipamento } from './data/equipamentos'
import ImportarExcel from './components/ImportarExcel'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Calibracoes from './pages/Calibracoes'
import Inventario from './pages/Inventario'
import Cedencias from './pages/Cedencias'
import Relatorios from './pages/Relatorios'
import DetalheEquipamento from './pages/DetalheEquipamento'
import ModoApresentacao from './pages/ModoApresentacao'
import DashboardIA from './pages/DashboardIA'
import ToastContainer from './components/Toast'
import { useToast } from './hooks/useToast'
import { carregarEquipamentos, importarEquipamentos } from './services/api'

const titulos: Record<string, string> = {
  dashboard: 'Dashboard Geral',
  calibracoes: 'Calibrações',
  inventario: 'Inventário de Equipamentos',
  cedencias: 'Cedências',
  relatorios: 'Relatórios',
  ia: 'Análise Inteligente',
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
  const { toasts, mostrar, remover } = useToast()
  const isMobile = useIsMobile()

  useEffect(() => {
    carregarEquipamentos()
      .then(dados => {
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
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  async function handleImportar(novos: Equipamento[]) {
    await importarEquipamentos(novos)
    setEquipamentos(novos)
    mostrar('sucesso', `${novos.length} equipamentos importados`, 'Dados guardados na base de dados.')
  }

  async function handleAtualizar(novos: Equipamento[]) {
    setEquipamentos(novos)
    mostrar('sucesso', 'Calibração registada!', 'Dados guardados na base de dados.')
  }

  function navegar(pagina: string) {
    setPaginaAtiva(pagina)
    setEquipDetalhe(null)
    setSidebarAberta(false)
  }

  if (carregando) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p className="text-sm text-gray-400">A carregar...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (equipamentos.length === 0) {
    return (
      <>
        <div className="h-screen bg-gray-50">
          <ImportarExcel onImportar={handleImportar} />
        </div>
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
      default:            return null
    }
  }

  return (
    <>
      {apresentacao && (
        <ModoApresentacao equipamentos={equipamentos} onFechar={() => setApresentacao(false)} />
      )}

      {/* Overlay mobile */}
      {isMobile && sidebarAberta && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      <div className="flex h-screen bg-gray-100 overflow-hidden">

        {/* Sidebar */}
        <div className={`
          ${isMobile
            ? `fixed top-0 left-0 h-full z-50 transition-transform duration-300 ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}`
            : 'relative'
          }
        `}>
          <Sidebar
            paginaAtiva={paginaAtiva}
            onNavegar={navegar}
            equipamentos={equipamentos}
          />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar
            titulo={equipDetalhe ? equipDetalhe.descricao : titulos[paginaAtiva]}
            totalEquipamentos={equipamentos.length}
            onReimportar={() => setEquipamentos([])}
            equipamentos={equipamentos}
            onVerDetalhe={(eq) => setEquipDetalhe(eq)}
            onApresentacao={() => setApresentacao(true)}
            onMenuToggle={() => setSidebarAberta(!sidebarAberta)}
            isMobile={isMobile}
          />
          <main className="flex-1 overflow-y-auto p-3 md:p-5">
            {renderPagina()}
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemover={remover} />
    </>
  )
}

export default App