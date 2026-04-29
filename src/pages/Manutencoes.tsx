import { useState, useRef, useCallback } from 'react'
import { ClipboardList, Upload, Camera, FileText, CheckCircle, XCircle, MinusCircle, Download, ChevronDown, ChevronUp, Loader2, RotateCcw } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'

interface Props {
  equipamentos: Equipamento[]
}

interface Tarefa {
  codigo: string
  descricao: string
  valor: 'OK' | 'NA' | 'NOK' | 'NUM' | null
  valorNumerico?: string
  temValorNumerico: boolean
}

interface Cabecalho {
  tipoEquipamento: string
  numeroOT: string
  ativo: string
  dataAbertura: string
  localizacao: string
  marca: string
  modelo: string
  numeroSerie: string
  localCliente: string
  equipamentosTeste: string
  dataRealizacao: string
  observacoes: string
  operador: string
  supervisor: string
}

function detectaValorNumerico(descricao: string): boolean {
  return /±|mmHg|bpm|mV|seg|min|Ohm|Joule|%|Hz|kHz|MHz|mA|µA|mW|kPa|Pa|rpm|°C|°F/.test(descricao)
}

function extrairTarefasDoPDF(texto: string): { titulo: string; tarefas: Tarefa[] } {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  let titulo = ''
  const tarefas: Tarefa[] = []

  for (const linha of linhas) {
    if (linha.includes('# OT-') || linha.includes('#OT-')) {
      titulo = linha.replace(/# OT-.*/, '').replace(/#OT-.*/, '').trim()
    }
    const match = linha.match(/^(P-JMS\d+)\s+(.+)/)
    if (match) {
      const codigo = match[1]
      const descricao = match[2].replace(/\s+$/, '')
      tarefas.push({
        codigo,
        descricao,
        valor: null,
        valorNumerico: '',
        temValorNumerico: detectaValorNumerico(descricao),
      })
    }
  }

  return { titulo, tarefas }
}

function gerarPDFPreenchido(cabecalho: Cabecalho, tarefas: Tarefa[]) {
  const corOK = '#16a34a'
  const corNOK = '#dc2626'
  const corNA = '#64748b'

  const linhasTarefas = tarefas.map((t, i) => {
    const cor = t.valor === 'OK' ? corOK : t.valor === 'NOK' ? corNOK : corNA
    const valorTexto = t.valor === 'NUM' ? (t.valorNumerico || '') : (t.valor || '')
    return `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;font-weight:600;color:#475569;white-space:nowrap">${t.codigo}</td>
        <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;color:#0f172a">${t.descricao}</td>
        <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;font-weight:700;color:${cor};text-align:center;white-space:nowrap">${valorTexto}</td>
        <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;color:#94a3b8;text-align:center"></td>
      </tr>
    `
  }).join('')

  const stats = {
    ok: tarefas.filter(t => t.valor === 'OK').length,
    nok: tarefas.filter(t => t.valor === 'NOK').length,
    na: tarefas.filter(t => t.valor === 'NA').length,
    total: tarefas.length,
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fff; }
  @media print { body { padding: 10px; } }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
  .logo-cuf { font-size: 28px; font-weight: 900; color: #0066cc; letter-spacing: -1px; }
  .titulo { font-size: 18px; font-weight: 700; color: #0f172a; text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  .campo { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 12px; border: 1px solid #e2e8f0; }
  .campo-item { padding: 6px 10px; border-right: 1px solid #e2e8f0; }
  .campo-item:last-child { border-right: none; }
  .campo-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.08em; }
  .campo-valor { font-size: 11px; color: #0f172a; margin-top: 2px; min-height: 16px; }
  .stats { display: flex; gap: 12px; margin: 12px 0; }
  .stat { flex: 1; text-align: center; padding: 8px; border-radius: 6px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo-cuf">≡ cuf</div>
  <div style="font-size:10px;color:#94a3b8;text-align:right">Preventiva Electromedicina<br>Powered By NBITT</div>
</div>

<div class="titulo">${cabecalho.tipoEquipamento} # OT- ${cabecalho.numeroOT}</div>

<div class="campo">
  <div class="campo-item"><div class="campo-label">Ativo</div><div class="campo-valor">${cabecalho.ativo}</div></div>
  <div class="campo-item"><div class="campo-label">Data Abertura</div><div class="campo-valor">${cabecalho.dataAbertura}</div></div>
</div>
<div class="campo">
  <div class="campo-item"><div class="campo-label">Localização</div><div class="campo-valor">${cabecalho.localizacao}</div></div>
  <div class="campo-item"><div class="campo-label">Tipo Trabalho</div><div class="campo-valor">Preventiva Electromedicina</div></div>
</div>
<div class="campo">
  <div class="campo-item" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0">
    <div style="padding:6px 10px;border-right:1px solid #e2e8f0"><div class="campo-label">Marca</div><div class="campo-valor">${cabecalho.marca}</div></div>
    <div style="padding:6px 10px;border-right:1px solid #e2e8f0"><div class="campo-label">Modelo</div><div class="campo-valor">${cabecalho.modelo}</div></div>
    <div style="padding:6px 10px"><div class="campo-label">Nº Série</div><div class="campo-valor">${cabecalho.numeroSerie}</div></div>
  </div>
  <div class="campo-item"><div class="campo-label">Local/Cliente</div><div class="campo-valor">${cabecalho.localCliente}</div></div>
</div>

<div style="margin:8px 0;padding:6px 10px;border:1px solid #e2e8f0">
  <div class="campo-label">Descrição</div>
  <div class="campo-valor">TPP ${cabecalho.tipoEquipamento}</div>
</div>
<div style="margin:8px 0;padding:6px 10px;border:1px solid #e2e8f0">
  <div class="campo-label">Equipamentos Teste</div>
  <div class="campo-valor">${cabecalho.equipamentosTeste}</div>
</div>

<div class="stats">
  <div class="stat" style="background:#f0fdf4;border:1px solid #bbf7d0">
    <div style="font-size:20px;font-weight:800;color:#16a34a">${stats.ok}</div>
    <div style="font-size:9px;color:#16a34a;font-weight:700">OK</div>
  </div>
  <div class="stat" style="background:#fef2f2;border:1px solid #fecaca">
    <div style="font-size:20px;font-weight:800;color:#dc2626">${stats.nok}</div>
    <div style="font-size:9px;color:#dc2626;font-weight:700">NOK</div>
  </div>
  <div class="stat" style="background:#f8fafc;border:1px solid #e2e8f0">
    <div style="font-size:20px;font-weight:800;color:#64748b">${stats.na}</div>
    <div style="font-size:9px;color:#64748b;font-weight:700">N/A</div>
  </div>
  <div class="stat" style="background:#f0f9ff;border:1px solid #bae6fd">
    <div style="font-size:20px;font-weight:800;color:#0284c7">${stats.total}</div>
    <div style="font-size:9px;color:#0284c7;font-weight:700">TOTAL</div>
  </div>
</div>

<p style="font-size:9px;color:#94a3b8;margin:8px 0"><sup>º</sup> <strong>Valor (Estado) = OK / NA / NOK</strong></p>

<table>
  <thead>
    <tr style="background:#f1f5f9">
      <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:left;width:90px">Código</th>
      <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:left">Tarefa</th>
      <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:center;width:50px">Valor</th>
      <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:center;width:50px">UdM</th>
    </tr>
  </thead>
  <tbody>${linhasTarefas}</tbody>
</table>

<div style="margin-top:16px;border:1px solid #e2e8f0;padding:6px 10px">
  <div class="campo-label">Data de Realização</div>
  <div class="campo-valor">${cabecalho.dataRealizacao}</div>
</div>

<div style="margin-top:12px;border:1px solid #e2e8f0;padding:10px">
  <div class="campo-label">Observações</div>
  <div style="min-height:60px;font-size:11px;color:#0f172a;margin-top:4px">${cabecalho.observacoes || ''}</div>
</div>

<div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:48px">
  <div style="text-align:center">
    <div style="border-top:1px solid #0f172a;padding-top:6px;font-size:9px;color:#64748b">Operador/Utilizador</div>
    <div style="font-size:10px;font-weight:600;color:#0f172a;margin-top:2px">${cabecalho.operador || ''}</div>
  </div>
  <div style="text-align:center">
    <div style="border-top:1px solid #0f172a;padding-top:6px;font-size:9px;color:#64748b">Supervisor/Responsável</div>
    <div style="font-size:10px;font-weight:600;color:#0f172a;margin-top:2px">${cabecalho.supervisor || ''}</div>
  </div>
</div>

<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:8px">
  <div style="font-size:8px;color:#94a3b8">Powered By NBITT</div>
  <div style="font-size:8px;color:#94a3b8">Pág. 1/1</div>
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }
}

export default function Manutencoes({ equipamentos }: Props) {
  const [modo, setModo] = useState<'inicio' | 'manual' | 'scan'>('inicio')
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [cabecalho, setCabecalho] = useState<Cabecalho>({
    tipoEquipamento: '', numeroOT: '', ativo: '', dataAbertura: '',
    localizacao: '', marca: '', modelo: '', numeroSerie: '',
    localCliente: 'CUF', equipamentosTeste: '',
    dataRealizacao: new Date().toLocaleDateString('pt-PT'),
    observacoes: '', operador: '', supervisor: '',
  })
  const [carregandoPDF, setCarregandoPDF] = useState(false)
  const [carregandoOCR, setCarregandoOCR] = useState(false)
  const [imagemScan, setImagemScan] = useState<string | null>(null)
  const [expandido, setExpandido] = useState(true)
  const inputPDFRef = useRef<HTMLInputElement>(null)
  const inputImagemRef = useRef<HTMLInputElement>(null)
  const camaraRef = useRef<HTMLInputElement>(null)

  const progresso = tarefas.length > 0
    ? Math.round((tarefas.filter(t => t.valor !== null).length / tarefas.length) * 100)
    : 0

  async function handlePDFUpload(file: File) {
    setCarregandoPDF(true)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let textoCompleto = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        textoCompleto += content.items.map((item: { str: string }) => item.str).join('\n') + '\n'
      }
      const { titulo, tarefas: tarefasExtraidas } = extrairTarefasDoPDF(textoCompleto)
      setTarefas(tarefasExtraidas)
      setCabecalho(prev => ({ ...prev, tipoEquipamento: titulo }))
      setModo('manual')
    } catch (err) {
      console.error(err)
      alert('Erro ao ler o PDF. Verifica se o ficheiro é válido.')
    } finally {
      setCarregandoPDF(false)
    }
  }

  async function handleOCRScan(file: File) {
    setCarregandoOCR(true)
    const url = URL.createObjectURL(file)
    setImagemScan(url)
    try {
      const Tesseract = await import('tesseract.js')
      const { data: { text } } = await Tesseract.default.recognize(file, 'por', {
        logger: () => {},
      })
      const { titulo, tarefas: tarefasOCR } = extrairTarefasDoPDF(text)
      if (tarefasOCR.length > 0) {
        setTarefas(tarefasOCR)
        if (titulo) setCabecalho(prev => ({ ...prev, tipoEquipamento: titulo }))
      } else {
        alert('Não foi possível extrair tarefas da imagem. Tenta com uma foto mais nítida ou usa o modo manual.')
      }
      setModo('manual')
    } catch (err) {
      console.error(err)
      alert('Erro ao processar a imagem OCR.')
    } finally {
      setCarregandoOCR(false)
    }
  }

  const setValor = useCallback((index: number, valor: 'OK' | 'NA' | 'NOK' | 'NUM') => {
    setTarefas(prev => prev.map((t, i) => i === index ? { ...t, valor } : t))
  }, [])

  const setValorNumerico = useCallback((index: number, v: string) => {
    setTarefas(prev => prev.map((t, i) => i === index ? { ...t, valorNumerico: v, valor: 'NUM' } : t))
  }, [])

  const preencherTodos = (valor: 'OK' | 'NA' | 'NOK') => {
    setTarefas(prev => prev.map(t => ({ ...t, valor })))
  }

  if (modo === 'inicio') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ordens de Trabalho</h1>
          <p className="text-sm text-gray-400 mt-1">Preenche a ficha de manutenção preventiva digitalmente</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          {/* Modo Manual */}
          <div
            className="bg-white rounded-2xl border-2 border-gray-100 p-6 cursor-pointer hover:border-red-200 hover:shadow-lg transition-all group"
            onClick={() => inputPDFRef.current?.click()}
          >
            <div className="bg-red-50 rounded-xl p-3 w-fit mb-4 group-hover:bg-red-100 transition-colors">
              <Upload size={24} className="text-red-600" />
            </div>
            <h2 className="font-bold text-gray-800 mb-1">Preencher manualmente</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Faz upload do PDF da ficha. O sistema extrai as tarefas e preenchas com toque rápido.
            </p>
            <div className="mt-4 text-xs font-semibold text-red-600">
              Upload PDF da ficha →
            </div>
            <input
              ref={inputPDFRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && handlePDFUpload(e.target.files[0])}
            />
          </div>

          {/* Modo Scan */}
          <div
            className="bg-white rounded-2xl border-2 border-gray-100 p-6 cursor-pointer hover:border-blue-200 hover:shadow-lg transition-all group"
            onClick={() => camaraRef.current?.click()}
          >
            <div className="bg-blue-50 rounded-xl p-3 w-fit mb-4 group-hover:bg-blue-100 transition-colors">
              <Camera size={24} className="text-blue-600" />
            </div>
            <h2 className="font-bold text-gray-800 mb-1">Scan com câmara</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Fotografa a ficha em papel preenchida. OCR lê os valores automaticamente.
            </p>
            <div className="mt-4 text-xs font-semibold text-blue-600">
              Abrir câmara →
            </div>
            <input
              ref={camaraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleOCRScan(e.target.files[0])}
            />
          </div>
        </div>

        {/* Upload imagem alternativo */}
        <div
          className="max-w-2xl bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => inputImagemRef.current?.click()}
        >
          <FileText size={16} className="text-gray-400" />
          <span className="text-sm text-gray-400">Ou faz upload de uma imagem/scan da ficha preenchida</span>
          <input
            ref={inputImagemRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleOCRScan(e.target.files[0])}
          />
        </div>

        {(carregandoPDF || carregandoOCR) && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin text-red-600" />
            {carregandoPDF ? 'A extrair tarefas do PDF...' : 'A processar imagem com OCR...'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{cabecalho.tipoEquipamento || 'Ordem de Trabalho'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{tarefas.length} tarefas · {progresso}% concluído</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setModo('inicio'); setTarefas([]); setImagemScan(null) }}
            className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
          >
            <RotateCcw size={12} /> Nova OT
          </button>
          <button
            onClick={() => gerarPDFPreenchido(cabecalho, tarefas)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-lg transition-all"
            style={{ background: '#C0001A' }}
          >
            <Download size={13} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">Progresso</span>
          <span className="text-xs font-bold text-gray-700">{progresso}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progresso}%`, background: progresso === 100 ? '#16a34a' : '#C0001A' }}
          />
        </div>
        <div className="flex gap-4 mt-3">
          <span className="text-xs text-green-600 font-semibold">✓ {tarefas.filter(t => t.valor === 'OK').length} OK</span>
          <span className="text-xs text-red-600 font-semibold">✗ {tarefas.filter(t => t.valor === 'NOK').length} NOK</span>
          <span className="text-xs text-gray-400 font-semibold">— {tarefas.filter(t => t.valor === 'NA').length} N/A</span>
          <span className="text-xs text-gray-300 font-semibold">· {tarefas.filter(t => t.valor === null).length} por preencher</span>
        </div>
      </div>

      {/* Cabeçalho da OT */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cabeçalho da OT
          {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {expandido && (
          <div className="px-5 pb-4 grid grid-cols-2 gap-3 border-t border-gray-50">
            {[
              { label: 'Nº OT (Nextbitt)', key: 'numeroOT', placeholder: '12345' },
              { label: 'Data Abertura', key: 'dataAbertura', placeholder: 'dd/mm/aaaa' },
              { label: 'Ativo', key: 'ativo', placeholder: 'Nome do ativo' },
              { label: 'Localização', key: 'localizacao', placeholder: 'Ex: Bloco OT 2' },
              { label: 'Marca', key: 'marca', placeholder: 'Ex: Philips' },
              { label: 'Modelo', key: 'modelo', placeholder: 'Ex: IntelliVue MX450' },
              { label: 'Nº Série', key: 'numeroSerie', placeholder: 'Ex: DE123456' },
              { label: 'Local/Cliente', key: 'localCliente', placeholder: 'Ex: CUF Porto' },
              { label: 'Operador', key: 'operador', placeholder: 'Nome do técnico' },
              { label: 'Supervisor', key: 'supervisor', placeholder: 'Nome do supervisor' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
                <input
                  type="text"
                  value={cabecalho[key as keyof Cabecalho]}
                  onChange={e => setCabecalho(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 transition-colors"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Equipamentos Teste</label>
              <input
                type="text"
                value={cabecalho.equipamentosTeste}
                onChange={e => setCabecalho(prev => ({ ...prev, equipamentosTeste: e.target.value }))}
                placeholder="Ex: Fluke ESA612 SN:12345 Cal:01/2026"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Preencher tudo como:</span>
        {(['OK', 'NA', 'NOK'] as const).map(v => (
          <button
            key={v}
            onClick={() => preencherTodos(v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={{
              background: v === 'OK' ? '#f0fdf4' : v === 'NOK' ? '#fef2f2' : '#f8fafc',
              borderColor: v === 'OK' ? '#bbf7d0' : v === 'NOK' ? '#fecaca' : '#e2e8f0',
              color: v === 'OK' ? '#16a34a' : v === 'NOK' ? '#dc2626' : '#64748b',
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Lista de tarefas */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Código</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Tarefa</th>
              <th className="text-center px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide w-48">Valor</th>
            </tr>
          </thead>
          <tbody>
            {tarefas.map((tarefa, i) => (
              <tr
                key={tarefa.codigo}
                className={`border-b border-gray-50 transition-colors ${
                  tarefa.valor === 'OK' ? 'bg-green-50/30' :
                  tarefa.valor === 'NOK' ? 'bg-red-50/30' :
                  tarefa.valor === 'NA' ? 'bg-gray-50/50' : ''
                }`}
              >
                <td className="px-4 py-2.5">
                  <span className="text-xs font-mono font-semibold text-gray-400">{tarefa.codigo}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-700 leading-relaxed">{tarefa.descricao}</span>
                </td>
                <td className="px-4 py-2.5">
                  {tarefa.temValorNumerico ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tarefa.valorNumerico}
                        onChange={e => setValorNumerico(i, e.target.value)}
                        placeholder="Valor"
                        className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-red-400 text-center"
                      />
                      <div className="flex gap-1">
                        {(['OK', 'NOK', 'NA'] as const).map(v => (
                          <button
                            key={v}
                            onClick={() => setValor(i, v)}
                            className="text-xs font-bold px-2 py-1 rounded-lg border transition-all"
                            style={{
                              background: tarefa.valor === v
                                ? (v === 'OK' ? '#16a34a' : v === 'NOK' ? '#dc2626' : '#64748b')
                                : 'transparent',
                              borderColor: v === 'OK' ? '#bbf7d0' : v === 'NOK' ? '#fecaca' : '#e2e8f0',
                              color: tarefa.valor === v ? '#fff'
                                : (v === 'OK' ? '#16a34a' : v === 'NOK' ? '#dc2626' : '#94a3b8'),
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 justify-center">
                      {[
                        { v: 'OK' as const, icon: <CheckCircle size={14} />, cor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                        { v: 'NOK' as const, icon: <XCircle size={14} />, cor: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                        { v: 'NA' as const, icon: <MinusCircle size={14} />, cor: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
                      ].map(({ v, icon, cor, bg, border }) => (
                        <button
                          key={v}
                          onClick={() => setValor(i, v)}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all"
                          style={{
                            background: tarefa.valor === v ? cor : bg,
                            borderColor: tarefa.valor === v ? cor : border,
                            color: tarefa.valor === v ? '#fff' : cor,
                          }}
                        >
                          {icon} {v}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observações e data */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Data de Realização</label>
          <input
            type="text"
            value={cabecalho.dataRealizacao}
            onChange={e => setCabecalho(prev => ({ ...prev, dataRealizacao: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Observações</label>
          <textarea
            value={cabecalho.observacoes}
            onChange={e => setCabecalho(prev => ({ ...prev, observacoes: e.target.value }))}
            rows={3}
            placeholder="Observações adicionais..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 transition-colors resize-none"
          />
        </div>
      </div>

      {/* Botão exportar em baixo */}
      <button
        onClick={() => gerarPDFPreenchido(cabecalho, tarefas)}
        className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-all"
        style={{ background: '#C0001A' }}
      >
        <Download size={16} /> Gerar PDF preenchido
      </button>
    </div>
  )
}