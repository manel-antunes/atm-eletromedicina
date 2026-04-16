import { useState, useEffect } from 'react'
import Documentos from './pages/Documentos'
import type { Equipamento } from './data/equipamentos'
import ImportarExcel from './components/ImportarExcel'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Calibracoes from './pages/Calibracoes'
import Inventario from './pages/Inventario'
import Cedencias from './pages/Cedencias'
import Relatorios from './pages/Relatorios'
import Contactos from './pages/Contactos'
import DetalheEquipamento from './pages/DetalheEquipamento'
import ModoApresentacao from './pages/ModoApresentacao'
import ToastContainer from './components/Toast'
import { useToast } from './hooks/useToast'
import { carregarEquipamentos, importarEquipamentos } from './services/api'
import DashboardIA from './pages/DashboardIA'
import Mapa from './pages/Mapa'
import EstadoOffline from './components/EstadoOffline'
import ErroBackend from './components/ErroBackend'

const titulos: Record<string, string> = {
  dashboard: 'Dashboard Geral',
  calibracoes: 'Calibrações',
  inventario: 'Inventário de Equipamentos',
  cedencias: 'Cedências',
  relatorios: 'Relatórios',
  ia: 'Análise Inteligente',
  documentos: 'Documentos',
  contactos: 'Contactos de Marcas',
  mapa: 'Mapa de Equipamentos',

}

function App() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard')
  const [equipDetalhe, setEquipDetalhe] = useState<Equipamento | null>(null)
  const [apresentacao, setApresentacao] = useState(false)
  const { toasts, mostrar, remover } = useToast()
const [erroBackend, setErroBackend] = useState(false)
useEffect(() => {
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

  if (carregando) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p className="text-sm text-gray-400">A carregar equipamentos...</p>
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
      return (
        <DetalheEquipamento
          equipamento={equipDetalhe}
          onVoltar={() => setEquipDetalhe(null)}
        />
      )
    }
    switch (paginaAtiva) {
      case 'dashboard':
        return <Dashboard equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'calibracoes':
        return <Calibracoes equipamentos={equipamentos} onAtualizar={handleAtualizar} onVerDetalhe={setEquipDetalhe} />
      case 'inventario':
        return <Inventario equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      case 'cedencias':
        return <Cedencias equipamentos={equipamentos} onAtualizar={setEquipamentos} />
      case 'relatorios':
        return <Relatorios equipamentos={equipamentos} />
      case 'ia':
        return <DashboardIA equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
        case 'documentos':
  return <Documentos equipamentos={equipamentos} />
      case 'contactos':
        return <Contactos equipamentos={equipamentos} />
        case 'mapa':
  return <Mapa equipamentos={equipamentos} onVerDetalhe={setEquipDetalhe} />
      default:
        return null
    }
  }

return (
  <>
    <EstadoOffline />

    {ErroBackend && (
      <ErroBackend
        onTentar={() => {
          setErroBackend(false)
          setCarregando(true)
          window.location.reload()
        }}
      />
    )}

    {apresentacao && (
      <ModoApresentacao
        equipamentos={equipamentos}
        onFechar={() => setApresentacao(false)}
      />
    )}

 

  

    <ToastContainer toasts={toasts} onRemover={remover} />
  </>
)
}

export default App