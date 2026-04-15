import { useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { guardarEquipamentos } from '../data/storage'
import logoAtm from '../assets/logo-atm.png'
interface Props {
  onImportar: (equipamentos: Equipamento[]) => void
}

export default function ImportarExcel({ onImportar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFicheiro(e: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0]
    if (!ficheiro) return

    const reader = new FileReader()
    reader.onload = (evento) => {
      const dados = new Uint8Array(evento.target?.result as ArrayBuffer)
      const workbook = XLSX.read(dados, { type: 'array' })
      const folha = workbook.Sheets[workbook.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json(folha, { header: 1 }) as string[][]

      const equipamentos: Equipamento[] = linhas
        .slice(1)
 .filter((linha) => {
  const sap = String(linha[0] ?? '').trim()
  return sap !== '' && sap !== 'undefined' && sap !== 'Nº SAP' && sap.length > 3
})
        .map((linha, index) => {
          const sap = String(linha[0] ?? '')
          const periodicidade = sap === '631009707' ? 'Bienal' : 'Anual'
          return {
            id: index + 1,
            numeroSAP: sap,
            descricao: String(linha[1] ?? ''),
            marca: String(linha[2] ?? ''),
            modelo: String(linha[3] ?? ''),
            numeroSerie: String(linha[4] ?? ''),
            dataCalibracao: String(linha[5] ?? ''),
            responsavel: String(linha[6] ?? ''),
            warning: String(linha[7] ?? ''),
            localizacao: String(linha[8] ?? ''),
            obs: String(linha[9] ?? ''),
            obs2: String(linha[10] ?? ''),
            obs3: String(linha[11] ?? ''),
            ccPasta2025: String(linha[12] ?? ''),
            periodicidade,
          }
        })

      guardarEquipamentos(equipamentos)
      onImportar(equipamentos)
    }
    reader.readAsArrayBuffer(ficheiro)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f9fafb' }}>
      {/* Painel esquerdo vermelho */}
      <div className="w-80 min-h-screen flex flex-col justify-between p-8" style={{ background: '#b91c1c' }}>
        <div>
<div className="mb-8">
  <img src={logoAtm} alt="ATM" className="w-32 object-contain brightness-0 invert" />
</div>
          <h1 className="text-white font-bold text-2xl leading-tight mb-3">
            Gestão de<br />Equipamentos<br />de Teste
          </h1>
          <p className="text-red-200 text-sm leading-relaxed">
            Sistema de gestão de equipamentos de teste e calibração para a equipa de Eletromedicina da ATM.
          </p>
        </div>
        <p className="text-red-300 text-xs font-mono">v1.0 · ATM 2025</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-5 max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
            <FileSpreadsheet size={24} className="text-red-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-800">Importar Lista de Equipamentos</h2>
            <p className="text-sm text-gray-400 mt-1">Seleciona o ficheiro Excel (.xlsx) exportado do SAP</p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all"
            style={{ background: '#b91c1c' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#991b1b')}
            onMouseLeave={e => (e.currentTarget.style.background = '#b91c1c')}
          >
            <Upload size={15} />
            Selecionar ficheiro .xlsx
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFicheiro}
          />
          <p className="text-xs text-gray-300">Os dados ficam guardados no browser</p>
        </div>
      </div>
    </div>
  )
}