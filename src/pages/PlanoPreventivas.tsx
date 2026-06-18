import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle, X, FileSpreadsheet, Search, Filter, RotateCcw, ClipboardList, AlertTriangle, MapPin, Camera, Loader, PenLine, Trash2, Clock } from 'lucide-react'
import * as XLSX from 'xlsx'
import { createWorker } from 'tesseract.js'
import { FICHAS_TEMPLATES } from '../data/fichasTemplates'

import { API_URL } from '../config'
const SETORES_PROPRIOS = ['MEGOPMCOPMEQ', 'MEGOPMCOPMPR', 'MEGOPMGARTEQ']
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function getToken() { return localStorage.getItem('atm_token') ?? '' }
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
}

function diasRestantesMes(mes: number, ano: number) {
  const hoje = new Date()
  const fimMes = new Date(ano, mes, 0)
  const diff = Math.ceil((fimMes.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

interface Equipamento {
  id: number
  cod_ativo: string
  nome: string
  marca: string
  modelo: string
  numero_serie: string
  cod_localizacao: string
  localizacao: string
  setor: string
  area: string
  concluido: boolean
  concluido_em?: string
  concluido_por?: string
  observacoes?: string
}

type EstadoTarefa = 'ok' | 'nok' | 'na' | null

interface RespostaTarefa {
  estado: EstadoTarefa
  valor: string
  comentario: string
}

function encontrarFicha(nome: string) {
  const nomeLower = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return FICHAS_TEMPLATES.find(f => {
    const fNome = f.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return nomeLower.includes(fNome) || fNome.includes(nomeLower) ||
      nomeLower.split(' ').some(w => w.length > 4 && fNome.includes(w))
  }) ?? FICHAS_TEMPLATES.find(f => f.id === 'equipamento_eletromedicina_geral')
}

// Componente canvas de assinatura
function AssinaturaCanvas({ onAssinar, assinatura, onLimpar }: {
  onAssinar: (dataUrl: string) => void
  assinatura: string | null
  onLimpar: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)
  const temTraco = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    desenhando.current = true
    temTraco.current = true
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function desenhar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!desenhando.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function terminar() {
    if (!desenhando.current) return
    desenhando.current = false
    const canvas = canvasRef.current
    if (!canvas || !temTraco.current) return
    onAssinar(canvas.toDataURL('image/png'))
  }

  function limpar() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    temTraco.current = false
    onLimpar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <PenLine size={12} /> Assinatura do técnico
        </p>
        <button onClick={limpar} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>
          <Trash2 size={11} /> Limpar
        </button>
      </div>
      <div style={{ position: 'relative', border: `2px dashed ${assinatura ? '#16a34a' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', background: '#fafafa', transition: 'border-color 0.2s' }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={120}
          onMouseDown={iniciar}
          onMouseMove={desenhar}
          onMouseUp={terminar}
          onMouseLeave={terminar}
          onTouchStart={iniciar}
          onTouchMove={desenhar}
          onTouchEnd={terminar}
          style={{ width: '100%', height: 100, display: 'block', cursor: 'crosshair', touchAction: 'none' }}
        />
        {!assinatura && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ color: '#cbd5e1', fontSize: 12 }}>Assine aqui com o rato ou dedo</p>
          </div>
        )}
        {assinatura && (
          <div style={{ position: 'absolute', top: 6, right: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={12} color="#16a34a" />
            <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>Assinado</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlanoPreventivas() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [mesAtivo, setMesAtivo] = useState(new Date().getMonth() + 1)
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear())
  const [pesquisa, setPesquisa] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroLocalizacao, setFiltroLocalizacao] = useState('Todas')
  const [filtroPendentes, setFiltroPendentes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [modalEq, setModalEq] = useState<Equipamento | null>(null)
  const [respostas, setRespostas] = useState<Record<string, RespostaTarefa>>({})
  const [obsModal, setObsModal] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [erroOT, setErroOT] = useState('')
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [scanando, setScanando] = useState(false)
  const [scanProgresso, setScanProgresso] = useState(0)
  const [recemConcluido, setRecemConcluido] = useState<number | null>(null)
  const [alertaDismissed, setAlertaDismissed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scanRef = useRef<HTMLInputElement>(null)

  useEffect(() => { carregarPlano() }, [mesAtivo, anoAtivo])

  async function carregarPlano() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/preventivas/${mesAtivo}/${anoAtivo}`, { headers: authHeaders() })
      if (res.ok) setEquipamentos(await res.json())
      else setEquipamentos([])
    } catch { setEquipamentos([]) }
    finally { setLoading(false) }
  }

  function abrirModal(eq: Equipamento) {
    setModalEq(eq)
    setObsModal(eq.observacoes ?? '')
    setErroOT('')
    setAssinatura(null)
    const ficha = encontrarFicha(eq.nome)
    const init: Record<string, RespostaTarefa> = {}
    ficha?.tarefas.forEach(t => { init[t.codigo] = { estado: null, valor: '', comentario: '' } })
    setRespostas(init)
  }

  function setEstado(codigo: string, estado: EstadoTarefa) {
    setRespostas(prev => ({ ...prev, [codigo]: { ...prev[codigo], estado } }))
    setErroOT('')
  }

  function setValor(codigo: string, valor: string) {
    setRespostas(prev => ({ ...prev, [codigo]: { ...prev[codigo], valor } }))
  }

  async function handleGuardarOT() {
    if (!modalEq) return

    if (fichaModal) {
      const porPreencher = fichaModal.tarefas.filter(t => !respostas[t.codigo]?.estado)
      if (porPreencher.length > 0) {
        setErroOT(`${porPreencher.length} tarefa(s) por preencher antes de concluir.`)
        return
      }
    }

    if (!assinatura) {
      setErroOT('É necessário assinar antes de concluir a OT.')
      return
    }

    setErroOT('')
    setGuardando(true)
    try {
      await fetch(`${API_URL}/api/preventivas/${modalEq.id}/concluir`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ observacoes: obsModal }),
      })
      const idConcluido = modalEq.id
      setModalEq(null)
      await carregarPlano()
      setRecemConcluido(idConcluido)
      setTimeout(() => setRecemConcluido(null), 1500)
    } catch { }
    finally { setGuardando(false) }
  }

  async function handleDesconcluir(eq: Equipamento, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    await fetch(`${API_URL}/api/preventivas/${eq.id}/desconcluir`, { method: 'PATCH', headers: authHeaders() })
    await carregarPlano()
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanando(true)
    setScanProgresso(0)
    try {
      const worker = await createWorker('por', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setScanProgresso(Math.round(m.progress * 100))
        },
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      const textoLimpo = text.trim().replace(/\n{3,}/g, '\n\n')
      setObsModal(prev => prev ? `${prev}\n\n--- SCAN OCR ---\n${textoLimpo}` : `--- SCAN OCR ---\n${textoLimpo}`)
    } catch (err) { console.error('Erro OCR:', err) }
    finally { setScanando(false); setScanProgresso(0); e.target.value = '' }
  }

  function handleExcelAnual(e: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0]
    if (!ficheiro) return
    setImportando(true)
    setImportProgress('A ler ficheiro...')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const dados = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(dados, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const linhas = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        let ano = anoAtivo
        const primeiraLinha = String(linhas[0]?.[0] ?? '')
        const anoMatch = primeiraLinha.match(/\d{4}/)
        if (anoMatch) ano = parseInt(anoMatch[0])

        const mesesData: { mes: number; equipamentos: any[] }[] = []
        let mesAtualIdx = 0
        let eqsMesAtual: any[] = []

        for (const linha of linhas) {
          const val0 = String(linha[0] ?? '').trim()
          const mesIdx = MESES_PT.findIndex(m => val0.startsWith(m))
          if (mesIdx !== -1) {
            if (mesAtualIdx > 0 && eqsMesAtual.length > 0) mesesData.push({ mes: mesAtualIdx, equipamentos: eqsMesAtual })
            mesAtualIdx = mesIdx + 1
            eqsMesAtual = []
            continue
          }
          if (!val0 || val0 === 'Cód. Ativo' || val0.startsWith('Manutenção')) continue
          if (mesAtualIdx === 0) continue
          const setor = String(linha[6] ?? '').trim()
          if (!SETORES_PROPRIOS.some(s => setor.includes(s))) continue
          eqsMesAtual.push({
            codAtivo: val0,
            nome: String(linha[1] ?? '').trim(),
            marca: String(linha[2] ?? '').trim(),
            modelo: String(linha[3] ?? '').trim(),
            numeroSerie: String(linha[4] ?? '').trim(),
            codLocalizacao: '',
            localizacao: String(linha[5] ?? '').trim(),
            setor,
            area: String(linha[7] ?? '').trim(),
          })
        }
        if (mesAtualIdx > 0 && eqsMesAtual.length > 0) mesesData.push({ mes: mesAtualIdx, equipamentos: eqsMesAtual })

        const totalEqs = mesesData.reduce((acc, m) => acc + m.equipamentos.length, 0)
        setImportProgress(`A importar ${totalEqs} equipamentos em ${mesesData.length} meses...`)

        const res = await fetch(`${API_URL}/api/preventivas/importar-anual`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ ano, meses: mesesData }),
        })

        if (res.ok) { setAnoAtivo(ano); await carregarPlano(); setImportProgress('') }
        else { setImportProgress('Erro na importação'); setTimeout(() => setImportProgress(''), 3000) }
      } catch (err) {
        console.error(err)
        setImportProgress('Erro ao processar ficheiro')
        setTimeout(() => setImportProgress(''), 3000)
      } finally { setImportando(false) }
    }
    reader.readAsArrayBuffer(ficheiro)
    e.target.value = ''
  }

  const setores = ['Todos', ...Array.from(new Set(equipamentos.map(e => e.setor).filter(Boolean)))]
  const tipos = ['Todos', ...Array.from(new Set(equipamentos.map(e => e.nome).filter(Boolean))).sort()]
  const localizacoes = ['Todas', ...Array.from(new Set(equipamentos.map(e => e.localizacao).filter(Boolean))).sort()]

  const filtrados = equipamentos.filter(eq => {
    const t = pesquisa.toLowerCase()
    return (!pesquisa || eq.nome.toLowerCase().includes(t) || eq.cod_ativo.toLowerCase().includes(t) || eq.localizacao.toLowerCase().includes(t) || eq.marca.toLowerCase().includes(t))
      && (filtroSetor === 'Todos' || eq.setor === filtroSetor)
      && (filtroTipo === 'Todos' || eq.nome === filtroTipo)
      && (filtroLocalizacao === 'Todas' || eq.localizacao === filtroLocalizacao)
      && (!filtroPendentes || !eq.concluido)
  })

  const concluidos = equipamentos.filter(e => e.concluido).length
  const total = equipamentos.length
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const temFiltrosAtivos = pesquisa || filtroSetor !== 'Todos' || filtroTipo !== 'Todos' || filtroLocalizacao !== 'Todas' || filtroPendentes
  const pendentes = total - concluidos
  const diasRestantes = diasRestantesMes(mesAtivo, anoAtivo)
  const mostrarAlerta = !alertaDismissed && total > 0 && pendentes > 0 && diasRestantes <= 5 && mesAtivo === new Date().getMonth() + 1 && anoAtivo === new Date().getFullYear()

  const porSetor = filtrados.reduce((acc, eq) => {
    const s = eq.setor || 'Sem setor'
    if (!acc[s]) acc[s] = []
    acc[s].push(eq)
    return acc
  }, {} as Record<string, Equipamento[]>)

  const fichaModal = modalEq ? encontrarFicha(modalEq.nome) : null
  const totalTarefas = fichaModal?.tarefas.length ?? 0
  const tarefasRespondidas = Object.values(respostas).filter(r => r.estado !== null).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      <style>{`
        @keyframes concluido-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(22,163,74,0.8); transform: scale(1); }
          40%  { box-shadow: 0 0 0 12px rgba(22,163,74,0.3); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 20px rgba(22,163,74,0); transform: scale(1); }
        }
        .card-concluido {
          animation: concluido-pulse 0.9s ease-out forwards;
          background: #f0fdf4 !important;
          border-color: #16a34a !important;
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes alerta-slide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1a0a0f 100%)', padding: '14px 24px', borderBottom: '1px solid rgba(192,0,26,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: total > 0 ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div>
              <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>Plano de Preventivas</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>{MESES[mesAtivo - 1]} {anoAtivo} · {total} equipamentos</p>
            </div>
            {total > 0 && (
              <div style={{ display: 'flex', gap: 14 }}>
                {[
                  { label: 'Concluídos', valor: concluidos, cor: '#4ade80' },
                  { label: 'Pendentes', valor: pendentes, cor: '#f87171' },
                  { label: 'Localizações', valor: localizacoes.length - 1, cor: '#a78bfa' },
                ].map(k => (
                  <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: k.cor, fontSize: 14, fontWeight: 800, fontFamily: 'Noto Sans' }}>{k.valor}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{k.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={mesAtivo} onChange={e => setMesAtivo(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '5px 8px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {MESES.map((m, i) => <option key={i} value={i+1} style={{ background: '#1e293b' }}>{m}</option>)}
            </select>
            <select value={anoAtivo} onChange={e => setAnoAtivo(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '5px 8px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {[2024,2025,2026,2027].map(a => <option key={a} value={a} style={{ background: '#1e293b' }}>{a}</option>)}
            </select>
            <button onClick={() => inputRef.current?.click()} disabled={importando} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#C0001A', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: importando ? 'wait' : 'pointer', opacity: importando ? 0.8 : 1 }}>
              <Upload size={13} />
              {importando ? (importProgress || 'A importar...') : 'Importar Plano Anual'}
            </button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcelAnual} />
          </div>
        </div>
        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct > 60 ? '#f59e0b' : '#C0001A', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, whiteSpace: 'nowrap' }}>{concluidos}/{total} · {pct}%</span>
          </div>
        )}
      </div>

      {/* Alerta fim de mês */}
      {mostrarAlerta && (
        <div style={{ animation: 'alerta-slide 0.3s ease-out', background: diasRestantes === 0 ? '#7f1d1d' : diasRestantes <= 2 ? '#92400e' : '#78350f', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Clock size={14} color="#fbbf24" />
            <span style={{ color: '#fef3c7', fontSize: 12, fontWeight: 700 }}>
              {diasRestantes === 0
                ? `Último dia do mês! ${pendentes} equipamento(s) por concluir.`
                : `${diasRestantes} dia(s) para o fim do mês · ${pendentes} equipamento(s) pendentes`}
            </span>
          </div>
          <button onClick={() => setFiltroPendentes(true)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, color: '#fef3c7', fontSize: 11, fontWeight: 600, padding: '4px 10px', cursor: 'pointer' }}>
            Ver pendentes
          </button>
          <button onClick={() => setAlertaDismissed(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Filtros */}
      {total > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '8px 24px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar equipamento, cód. ativo, localização..." style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#0f172a' }} />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', color: filtroTipo !== 'Todos' ? '#C0001A' : '#64748b', background: filtroTipo !== 'Todos' ? 'rgba(192,0,26,0.04)' : '#fff', cursor: 'pointer', maxWidth: 160, fontWeight: filtroTipo !== 'Todos' ? 600 : 400 }}>
            <option value="Todos">Tipo: Todos</option>
            {tipos.filter(t => t !== 'Todos').map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtroLocalizacao} onChange={e => setFiltroLocalizacao(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', color: filtroLocalizacao !== 'Todas' ? '#7c3aed' : '#64748b', background: filtroLocalizacao !== 'Todas' ? 'rgba(124,58,237,0.04)' : '#fff', cursor: 'pointer', maxWidth: 160, fontWeight: filtroLocalizacao !== 'Todas' ? 600 : 400 }}>
            <option value="Todas">Local: Todas</option>
            {localizacoes.filter(l => l !== 'Todas').map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', color: filtroSetor !== 'Todos' ? '#0369a1' : '#64748b', background: filtroSetor !== 'Todos' ? 'rgba(3,105,161,0.04)' : '#fff', cursor: 'pointer', maxWidth: 160, fontWeight: filtroSetor !== 'Todos' ? 600 : 400 }}>
            <option value="Todos">Setor: Todos</option>
            {setores.filter(s => s !== 'Todos').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setFiltroPendentes(!filtroPendentes)} style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${filtroPendentes ? '#C0001A' : '#e2e8f0'}`, background: filtroPendentes ? 'rgba(192,0,26,0.06)' : '#fff', color: filtroPendentes ? '#C0001A' : '#64748b', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Filter size={11} />Pendentes
          </button>
          {temFiltrosAtivos && (
            <button onClick={() => { setPesquisa(''); setFiltroSetor('Todos'); setFiltroTipo('Todos'); setFiltroLocalizacao('Todas'); setFiltroPendentes(false) }} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
              <RotateCcw size={11} />Limpar
            </button>
          )}
          <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 'auto' }}>{filtrados.length}/{total}</span>
        </div>
      )}

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12 }}>A carregar plano...</p>
          </div>
        )}

        {!loading && total === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(192,0,26,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileSpreadsheet size={28} color="#C0001A" style={{ opacity: 0.5 }} />
            </div>
            <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>Sem plano para este mês</p>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 16px' }}>Importa o ficheiro anual do SAP para carregar os equipamentos</p>
            <button onClick={() => inputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#C0001A', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Upload size={13} />Importar Plano Anual
            </button>
          </div>
        )}

        {!loading && total > 0 && filtrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <Search size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: 12 }}>Nenhum equipamento corresponde aos filtros</p>
            <button onClick={() => { setPesquisa(''); setFiltroSetor('Todos'); setFiltroTipo('Todos'); setFiltroLocalizacao('Todas'); setFiltroPendentes(false) }} style={{ marginTop: 10, border: 'none', background: 'none', color: '#C0001A', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              Limpar filtros
            </button>
          </div>
        )}

        {!loading && Object.entries(porSetor).map(([setor, eqs]) => {
          const concluidosSetor = eqs.filter(e => e.concluido).length
          return (
            <div key={setor}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{setor}</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ height: 3, width: 32, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${eqs.length > 0 ? (concluidosSetor / eqs.length) * 100 : 0}%`, background: concluidosSetor === eqs.length ? '#16a34a' : '#C0001A', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 10, color: concluidosSetor === eqs.length ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>{concluidosSetor}/{eqs.length}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                {eqs.map(eq => {
                  const isRecemConcluido = recemConcluido === eq.id
                  return (
                    <div
                      key={eq.id}
                      onClick={() => { if (!eq.concluido) abrirModal(eq) }}
                      className={isRecemConcluido ? 'card-concluido' : ''}
                      style={{
                        background: isRecemConcluido ? '#f0fdf4' : '#fff',
                        border: `1px solid ${isRecemConcluido ? '#16a34a' : eq.concluido ? '#bbf7d0' : '#e2e8f0'}`,
                        borderRadius: 10, padding: '9px 12px',
                        cursor: eq.concluido ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'all 0.4s ease',
                        opacity: eq.concluido && !isRecemConcluido ? 0.85 : 1,
                        transform: isRecemConcluido ? 'scale(1.02)' : 'scale(1)',
                      }}
                      onMouseEnter={e => { if (!eq.concluido) { (e.currentTarget as HTMLElement).style.borderColor = '#C0001A'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(192,0,26,0.08)' } }}
                      onMouseLeave={e => { if (!isRecemConcluido) { (e.currentTarget as HTMLElement).style.borderColor = eq.concluido ? '#bbf7d0' : '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' } }}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); if (eq.concluido) handleDesconcluir(eq, e); else abrirModal(eq) }}
                        title={eq.concluido ? 'Clica para cancelar' : ''}
                        style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${eq.concluido ? '#16a34a' : '#cbd5e1'}`, background: eq.concluido ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', cursor: 'pointer', padding: 0, pointerEvents: 'all', position: 'relative', zIndex: 2 }}
                      >
                        {eq.concluido && <CheckCircle size={11} color="#fff" />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: eq.concluido ? '#64748b' : '#0f172a', textDecoration: eq.concluido ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eq.nome}</span>
                          {eq.area && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 99, flexShrink: 0, background: eq.area.includes('Baixo') ? '#f0fdf4' : eq.area.includes('Médio') ? '#fffbeb' : '#fef2f2', color: eq.area.includes('Baixo') ? '#16a34a' : eq.area.includes('Médio') ? '#d97706' : '#dc2626' }}>{eq.area.split(' ')[0]}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Noto Sans' }}>{eq.cod_ativo}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><MapPin size={9} />{eq.localizacao}</span>
                        </div>
                        {eq.concluido && eq.concluido_por && (
                          <div style={{ fontSize: 9, color: '#16a34a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle size={9} />{eq.concluido_por}
                          </div>
                        )}
                      </div>
                      {!eq.concluido && <ClipboardList size={12} color="#C0001A" style={{ flexShrink: 0, opacity: 0.6 }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal OT */}
      {modalEq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalEq(null) }}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }}>

            {/* Header modal */}
            <div style={{ background: 'linear-gradient(135deg, #0A0F1E, #1a0a0f)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ background: 'rgba(192,0,26,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ordem de Trabalho</span>
                    {fichaModal && <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{fichaModal.nome}</span>}
                  </div>
                  <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.3 }}>{modalEq.nome}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, fontFamily: 'Noto Sans' }}>{modalEq.cod_ativo} · {modalEq.localizacao}</p>
                </div>
                <button onClick={() => setModalEq(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', marginLeft: 12, flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
                {[
                  { label: 'Marca', valor: modalEq.marca || '—' },
                  { label: 'Modelo', valor: modalEq.modelo || '—' },
                  { label: 'Nº Série', valor: modalEq.numero_serie || '—' },
                  { label: 'Localização', valor: modalEq.localizacao || '—' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{c.label}</p>
                    <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, margin: 0, fontFamily: 'Noto Sans', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.valor}</p>
                  </div>
                ))}
              </div>
              {fichaModal && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Tarefas preenchidas</span>
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{tarefasRespondidas}/{totalTarefas}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${totalTarefas > 0 ? (tarefasRespondidas / totalTarefas) * 100 : 0}%`, background: '#4ade80', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Corpo modal */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {fichaModal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fichaModal.tarefas.map((tarefa) => {
                    const resp = respostas[tarefa.codigo] ?? { estado: null, valor: '', comentario: '' }
                    const corEstado = resp.estado === 'ok' ? '#16a34a' : resp.estado === 'nok' ? '#dc2626' : resp.estado === 'na' ? '#64748b' : null
                    return (
                      <div key={tarefa.codigo} style={{ background: resp.estado ? `${corEstado}08` : '#f8fafc', border: `1px solid ${resp.estado ? `${corEstado}30` : '#e2e8f0'}`, borderRadius: 10, padding: '10px 14px', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Noto Sans', flexShrink: 0, marginTop: 2, minWidth: 80 }}>{tarefa.codigo}</span>
                          <p style={{ fontSize: 12, color: '#0f172a', flex: 1, margin: 0, lineHeight: 1.5 }}>{tarefa.descricao}</p>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {(['ok', 'nok', 'na'] as EstadoTarefa[]).map(estado => (
                              <button key={estado} onClick={() => setEstado(tarefa.codigo, resp.estado === estado ? null : estado)} style={{ border: `1px solid ${resp.estado === estado ? (estado === 'ok' ? '#16a34a' : estado === 'nok' ? '#dc2626' : '#64748b') : '#e2e8f0'}`, background: resp.estado === estado ? (estado === 'ok' ? '#16a34a' : estado === 'nok' ? '#dc2626' : '#64748b') : '#fff', color: resp.estado === estado ? '#fff' : '#94a3b8', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s', textTransform: 'uppercase' }}>
                                {estado === 'ok' ? '✓ OK' : estado === 'nok' ? '✗ NOK' : 'N/A'}
                              </button>
                            ))}
                          </div>
                        </div>
                        {tarefa.temValorNumerico && (
                          <input value={resp.valor} onChange={e => setValor(tarefa.codigo, e.target.value)} placeholder="Valor medido..." style={{ marginTop: 8, marginLeft: 90, width: 'calc(100% - 90px)', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', fontSize: 11, outline: 'none', color: '#0f172a', boxSizing: 'border-box' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <AlertTriangle size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontSize: 12 }}>Sem ficha de manutenção associada</p>
                </div>
              )}

              {/* Observações + Scan */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Observações / OT em papel</p>
                  <button onClick={() => scanRef.current?.click()} disabled={scanando} style={{ display: 'flex', alignItems: 'center', gap: 6, background: scanando ? 'rgba(192,0,26,0.06)' : 'rgba(192,0,26,0.08)', border: '1px solid rgba(192,0,26,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#C0001A', cursor: scanando ? 'wait' : 'pointer' }}>
                    {scanando ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
                    {scanando ? `A processar... ${scanProgresso}%` : 'Scan OT em papel'}
                  </button>
                  <input ref={scanRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleScan} />
                </div>
                {scanando && (
                  <div style={{ marginBottom: 8, height: 3, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${scanProgresso}%`, background: '#C0001A', borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                )}
                <textarea value={obsModal} onChange={e => setObsModal(e.target.value)} placeholder="Notas sobre esta intervenção..." style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 12, resize: 'vertical', minHeight: 72, outline: 'none', color: '#0f172a', boxSizing: 'border-box', fontFamily: 'Noto Sans' }} />
              </div>

              {/* Assinatura */}
              <div style={{ marginTop: 16 }}>
                <AssinaturaCanvas
                  assinatura={assinatura}
                  onAssinar={setAssinatura}
                  onLimpar={() => setAssinatura(null)}
                />
              </div>
            </div>

            {/* Footer modal */}
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', gap: 10, alignItems: 'center', background: '#f8fafc' }}>
              {erroOT && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px' }}>
                  <AlertTriangle size={12} color="#dc2626" />
                  <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{erroOT}</span>
                </div>
              )}
              {!erroOT && <div style={{ flex: 1 }} />}
              <button onClick={() => setModalEq(null)} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>
                Cancelar
              </button>
              <button onClick={handleGuardarOT} disabled={guardando} style={{ background: '#C0001A', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, opacity: guardando ? 0.7 : 1 }}>
                <CheckCircle size={14} />
                {guardando ? 'A guardar...' : 'Concluir OT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}