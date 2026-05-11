import { useState, useRef, useCallback } from 'react'
import {
  ClipboardList, Camera, FileText, CheckCircle, XCircle,
  MinusCircle, Download, ChevronDown, ChevronUp, Loader2,
  RotateCcw, Search, Calendar, BarChart2, ArrowRight
} from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { FICHAS_TEMPLATES } from '../data/fichasTemplates'

interface Props {
  equipamentos: Equipamento[]
}

interface Tarefa {
  codigo: string
  descricao: string
  valor: 'OK' | 'NA' | 'NOK' | null
  valorNumerico: string
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

const PLANO_ANUAL: Record<number, { equipamento: string; cor: string; fichaId?: string }[]> = {
  1:  [],
  2:  [],
  3:  [{ equipamento: 'Eletrobisturis', cor: '#16a34a', fichaId: 'eletrobisturi' }],
  4:  [
    { equipamento: 'Desfibrilhadores', cor: '#C0001A', fichaId: 'desfibrilhador_monitor' },
    { equipamento: 'Multímetro 179', cor: '#2563eb' },
    { equipamento: 'Tacómetro', cor: '#7c3aed' },
  ],
  5:  [{ equipamento: 'Analisador Fetal', cor: '#0891b2' }],
  6:  [{ equipamento: 'Termómetros', cor: '#d97706', fichaId: 'term_metro_timp_nico' }],
  7:  [{ equipamento: 'Luxímetro', cor: '#db2777' }],
  8:  [{ equipamento: 'Tacómetro', cor: '#7c3aed' }],
  9:  [
    { equipamento: 'Eletrobisturis', cor: '#16a34a', fichaId: 'eletrobisturi' },
    { equipamento: 'Incubadoras', cor: '#0891b2', fichaId: 'incubadora' },
  ],
  10: [
    { equipamento: 'Equip. Infusão', cor: '#ea580c', fichaId: 'bomba_perfusora' },
    { equipamento: 'Desfibrilhadores', cor: '#C0001A', fichaId: 'desfibrilhador_monitor' },
    { equipamento: 'Ventiladores', cor: '#4f46e5', fichaId: 'ventilador_de_cuidados_intensivos' },
  ],
  11: [
    { equipamento: 'Pesos (Balanças)', cor: '#65a30d', fichaId: 'balan_a' },
    { equipamento: 'Radiômetro', cor: '#0369a1' },
  ],
  12: [
    { equipamento: 'Termómetros', cor: '#d97706', fichaId: 'term_metro_timp_nico' },
    { equipamento: 'Tacómetro', cor: '#7c3aed' },
  ],
}

const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function gerarPDFPreenchido(cabecalho: Cabecalho, tarefas: Tarefa[]) {
  const corOK = '#16a34a', corNOK = '#dc2626', corNA = '#64748b'
  const linhasTarefas = tarefas.map((t, i) => {
    const cor = t.valor === 'OK' ? corOK : t.valor === 'NOK' ? corNOK : corNA
    const valorTexto = t.temValorNumerico && t.valorNumerico ? t.valorNumerico : (t.valor || '')
    return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;font-weight:600;color:#475569;white-space:nowrap">${t.codigo}</td>
      <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;color:#0f172a">${t.descricao}</td>
      <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;font-weight:700;color:${cor};text-align:center">${valorTexto}</td>
      <td style="border:1px solid #e2e8f0;padding:5px 8px;font-size:9px;text-align:center"></td>
    </tr>`
  }).join('')
  const stats = {
    ok: tarefas.filter(t=>t.valor==='OK').length,
    nok: tarefas.filter(t=>t.valor==='NOK').length,
    na: tarefas.filter(t=>t.valor==='NA').length,
  }
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px}table{width:100%;border-collapse:collapse}.campo{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e2e8f0;margin-bottom:8px}.ci{padding:6px 10px;border-right:1px solid #e2e8f0}.ci:last-child{border-right:none}.cl2{font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:.08em}.cv{font-size:11px;color:#0f172a;margin-top:2px;min-height:14px}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #e2e8f0;padding-bottom:10px">
  <div style="font-size:24px;font-weight:900;color:#0066cc">≡ cuf</div>
  <div style="font-size:9px;color:#94a3b8;text-align:right">Preventiva Electromedicina<br>Powered By NBITT</div>
</div>
<h2 style="text-align:center;font-size:16px;font-weight:700;color:#0f172a;margin-bottom:14px">${cabecalho.tipoEquipamento} # OT- ${cabecalho.numeroOT}</h2>
<div class="campo"><div class="ci"><div class="cl2">Ativo</div><div class="cv">${cabecalho.ativo}</div></div><div class="ci"><div class="cl2">Data Abertura</div><div class="cv">${cabecalho.dataAbertura}</div></div></div>
<div class="campo"><div class="ci"><div class="cl2">Localização</div><div class="cv">${cabecalho.localizacao}</div></div><div class="ci"><div class="cl2">Tipo Trabalho</div><div class="cv">Preventiva Electromedicina</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border:1px solid #e2e8f0;margin-bottom:8px">
  <div class="ci"><div class="cl2">Marca</div><div class="cv">${cabecalho.marca}</div></div>
  <div class="ci"><div class="cl2">Modelo</div><div class="cv">${cabecalho.modelo}</div></div>
  <div class="ci"><div class="cl2">Nº Série</div><div class="cv">${cabecalho.numeroSerie}</div></div>
  <div class="ci"><div class="cl2">Local/Cliente</div><div class="cv">${cabecalho.localCliente}</div></div>
</div>
<div style="border:1px solid #e2e8f0;padding:6px 10px;margin-bottom:4px"><div class="cl2">Descrição</div><div class="cv">TPP ${cabecalho.tipoEquipamento}</div></div>
<div style="border:1px solid #e2e8f0;padding:6px 10px;margin-bottom:12px"><div class="cl2">Equipamentos Teste</div><div class="cv">${cabecalho.equipamentosTeste}</div></div>
<div style="display:flex;gap:10px;margin-bottom:12px">
  ${[['OK',stats.ok,'#f0fdf4','#16a34a'],['NOK',stats.nok,'#fef2f2','#dc2626'],['N/A',stats.na,'#f8fafc','#64748b']].map(([l,v,bg,c])=>`
  <div style="flex:1;text-align:center;padding:8px;background:${bg};border:1px solid ${c}22;border-radius:6px">
    <div style="font-size:18px;font-weight:800;color:${c}">${v}</div>
    <div style="font-size:9px;color:${c};font-weight:700">${l}</div>
  </div>`).join('')}
</div>
<p style="font-size:9px;color:#94a3b8;margin:6px 0"><sup>º</sup> <strong>Valor (Estado) = OK / NA / NOK</strong></p>
<table><thead><tr style="background:#f1f5f9">
  <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:left;width:90px">Código</th>
  <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:left">Tarefa</th>
  <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:center;width:50px">Valor</th>
  <th style="border:1px solid #e2e8f0;padding:6px 8px;font-size:9px;text-align:center;width:50px">UdM</th>
</tr></thead><tbody>${linhasTarefas}</tbody></table>
<div style="margin-top:12px;border:1px solid #e2e8f0;padding:6px 10px"><div class="cl2">Data de Realização</div><div class="cv">${cabecalho.dataRealizacao}</div></div>
<div style="margin-top:10px;border:1px solid #e2e8f0;padding:10px"><div class="cl2">Observações</div><div style="min-height:60px;font-size:11px;color:#0f172a;margin-top:4px">${cabecalho.observacoes||''}</div></div>
<div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:48px">
  <div style="text-align:center"><div style="border-top:1px solid #0f172a;padding-top:6px;font-size:9px;color:#64748b">Operador/Utilizador</div><div style="font-size:10px;font-weight:600;color:#0f172a;margin-top:2px">${cabecalho.operador}</div></div>
  <div style="text-align:center"><div style="border-top:1px solid #0f172a;padding-top:6px;font-size:9px;color:#64748b">Supervisor/Responsável</div><div style="font-size:10px;font-weight:600;color:#0f172a;margin-top:2px">${cabecalho.supervisor}</div></div>
</div>
<div style="margin-top:20px;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:6px">
  <div style="font-size:8px;color:#94a3b8">Powered By NBITT</div>
  <div style="font-size:8px;color:#94a3b8">Pág. 1/1</div>
</div>
</body></html>`
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600) }
}

export default function Manutencoes({ equipamentos }: Props) {
  const mesAtual = new Date().getMonth() + 1
  const [modo, setModo] = useState<'dashboard' | 'selecionar' | 'preencher'>('dashboard')
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pesquisaFicha, setPesquisaFicha] = useState('')
  const [fichaSelId, setFichaSelId] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null)
  const [carregandoOCR, setCarregandoOCR] = useState(false)
  const [expandido, setExpandido] = useState(true)
  const [cabecalho, setCabecalho] = useState<Cabecalho>({
    tipoEquipamento: '', numeroOT: '', ativo: '', dataAbertura: '',
    localizacao: '', marca: '', modelo: '', numeroSerie: '',
    localCliente: 'CUF', equipamentosTeste: '',
    dataRealizacao: new Date().toLocaleDateString('pt-PT'),
    observacoes: '', operador: '', supervisor: '',
  })
  const camaraRef = useRef<HTMLInputElement>(null)
  const imagemRef = useRef<HTMLInputElement>(null)

  const progresso = tarefas.length > 0
    ? Math.round((tarefas.filter(t => t.valor !== null).length / tarefas.length) * 100) : 0

  const fichasFiltradas = FICHAS_TEMPLATES.filter(f =>
    f.nome.toLowerCase().includes(pesquisaFicha.toLowerCase())
  )

  const totalOTsAno = Object.values(PLANO_ANUAL).reduce((acc, mes) => acc + mes.length, 0)
  const otsMesAtual = PLANO_ANUAL[mesAtual] || []

  function carregarFicha(id: string, nome?: string) {
    const ficha = FICHAS_TEMPLATES.find(f => f.id === id)
    if (!ficha) return
    setFichaSelId(id)
    setTarefas(ficha.tarefas.map(t => ({
      codigo: t.codigo, descricao: t.descricao,
      valor: null, valorNumerico: '', temValorNumerico: t.temValorNumerico,
    })))
    setCabecalho(prev => ({ ...prev, tipoEquipamento: nome || ficha.nome }))
  }

  function iniciarComFicha(fichaId: string, nomeEquip: string) {
    carregarFicha(fichaId, nomeEquip)
    setModo('preencher')
  }

  async function handleOCRScan(file: File) {
    setCarregandoOCR(true)
    try {
      const Tesseract = await import('tesseract.js')
      const { data: { text } } = await Tesseract.default.recognize(file, 'por', { logger: () => {} })
      const textoLower = text.toLowerCase()
      const fichaDetectada = FICHAS_TEMPLATES.find(f => textoLower.includes(f.nome.toLowerCase()))
      if (fichaDetectada) { carregarFicha(fichaDetectada.id); setFichaSelId(fichaDetectada.id) }
      setModo('preencher')
    } catch { alert('Erro ao processar a imagem.') }
    finally { setCarregandoOCR(false) }
  }

  const setValor = useCallback((index: number, valor: 'OK' | 'NA' | 'NOK') => {
    setTarefas(prev => prev.map((t, i) => i === index ? { ...t, valor } : t))
  }, [])

  const setValorNumerico = useCallback((index: number, v: string) => {
    setTarefas(prev => prev.map((t, i) => i === index ? { ...t, valorNumerico: v } : t))
  }, [])

  const preencherTodos = (valor: 'OK' | 'NA' | 'NOK') => {
    setTarefas(prev => prev.map(t => ({ ...t, valor })))
  }

  function resetar() {
    setModo('dashboard')
    setTarefas([])
    setFichaSelId('')
    setPesquisaFicha('')
    setMesSelecionado(null)
  }

  // ── DASHBOARD ──
if (modo === 'dashboard') {
  return (
    <div className="space-y-4">
      <style>{`
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.7}70%{transform:scale(1.6);opacity:0}100%{transform:scale(1.6);opacity:0}}
        @keyframes fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fade-up .25s ease both}
        .pulse-dot::before{content:'';position:absolute;inset:0;border-radius:50%;background:inherit;animation:pulse-ring 2s ease-out infinite}
        .mes-btn:hover .mes-inner{background:#f8fafc}
        .ot-pill{transition:transform .15s ease}
        .ot-pill:hover{transform:translateY(-1px)}
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Ordens de Trabalho</h1>
          <p className="text-sm text-gray-400 mt-0.5">HPRT · Plano anual de manutenções preventivas 2026</p>
        </div>
        <button
          onClick={() => setModo('selecionar')}
          className="flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-lg transition-all hover:shadow-red-200 hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #C0001A 0%, #E30613 100%)' }}
        >
          <ClipboardList size={15} /> Nova OT
        </button>
      </div>

      {/* KPIs — compactos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'OTs este mês', valor: otsMesAtual.length, sub: MESES_FULL[mesAtual-1], cor: '#C0001A', bg: '#fff1f2', borda: '#fecdd3' },
          { label: 'Total anual', valor: totalOTsAno, sub: 'intervenções planeadas', cor: '#2563eb', bg: '#eff6ff', borda: '#bfdbfe' },
          { label: 'Fichas disponíveis', valor: FICHAS_TEMPLATES.length, sub: 'tipos de equipamento', cor: '#059669', bg: '#ecfdf5', borda: '#a7f3d0' },
        ].map((k, i) => (
          <div key={i} className="fade-up bg-white rounded-xl border p-4 shadow-sm flex items-center gap-4"
            style={{ borderColor: k.borda, animationDelay: `${i*60}ms` }}>
            <div className="rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
              <span className="text-2xl font-black font-mono" style={{ color: k.cor }}>{k.valor}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">{k.label}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendário */}
{/* Calendário */}
<div className="fade-up bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ animationDelay: '150ms' }}>
  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Calendar size={14} className="text-gray-400" />
      <span className="text-sm font-bold text-gray-700">Calendário 2026 — HPRT</span>
    </div>
    <span className="text-xs text-gray-400 italic">Clica num mês para ver detalhes</span>
  </div>

  {/* Cabeçalho dos meses */}
  <div className="grid grid-cols-12 border-b border-gray-100">
    {MESES_SHORT.map((mes, idx) => {
      const num = idx + 1
      const isAtual = num === mesAtual
      const isSel = mesSelecionado === num
      const ots = PLANO_ANUAL[num] || []
      return (
        <div key={num} className={`text-center py-2 border-r border-gray-100 last:border-r-0 ${isAtual ? 'bg-red-600' : isSel ? 'bg-slate-700' : 'bg-gray-50'}`}>
          <p className={`text-xs font-bold ${isAtual || isSel ? 'text-white' : 'text-gray-500'}`}>{mes}</p>
          {ots.length > 0 && (
            <p className={`text-xs font-mono ${isAtual || isSel ? 'text-white/70' : 'text-gray-400'}`}>{ots.length}</p>
          )}
          {isAtual && (
            <div className="flex justify-center mt-0.5">
              <div className="relative w-1.5 h-1.5">
                <div className="pulse-dot relative w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          )}
        </div>
      )
    })}
  </div>

  {/* Corpo do calendário */}
  <div className="grid grid-cols-12" style={{ minHeight: 120 }}>
    {MESES_SHORT.map((_, idx) => {
      const num = idx + 1
      const ots = PLANO_ANUAL[num] || []
      const isAtual = num === mesAtual
      const isSel = mesSelecionado === num
      return (
        <button
          key={num}
          onClick={() => setMesSelecionado(isSel ? null : num)}
          className="flex flex-col gap-1 p-1.5 border-r border-gray-50 last:border-r-0 transition-all hover:bg-gray-50 group text-left"
          style={{
            background: isSel ? '#f0f9ff' : isAtual ? '#fffbfb' : undefined,
            borderLeft: isAtual ? '2px solid #C0001A' : isSel ? '2px solid #0ea5e9' : '2px solid transparent',
          }}
        >
          {ots.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#e2e8f0' }} />
            </div>
          ) : (
            ots.map((ot, i) => (
              <div
                key={i}
                className="w-full rounded-md px-1.5 py-1 text-white text-center leading-tight transition-transform group-hover:scale-[1.02]"
                style={{ background: ot.cor, fontSize: 9, fontWeight: 700, letterSpacing: '0.01em' }}
                title={ot.equipamento}
              >
                {ot.equipamento.length > 11 ? ot.equipamento.slice(0, 11) + '…' : ot.equipamento}
              </div>
            ))
          )}
        </button>
      )
    })}
  </div>

  {/* Linha de legenda */}
  <div className="px-5 py-2 border-t border-gray-50 bg-gray-50/30 flex items-center gap-4 flex-wrap">
    {Object.values(PLANO_ANUAL).flat().filter((v,i,a)=>a.findIndex(t=>t.equipamento===v.equipamento)===i).map((ot,i)=>(
      <div key={i} className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: ot.cor }} />
        <span className="text-xs text-gray-500">{ot.equipamento}</span>
      </div>
    ))}
  </div>

  {/* Detalhe mês selecionado */}
  {mesSelecionado && (
    <div className="border-t border-blue-100 px-5 py-4" style={{ background: 'linear-gradient(90deg, #f0f9ff, white)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-blue-400" />
          <h3 className="text-sm font-bold text-gray-700">{MESES_FULL[mesSelecionado-1]}</h3>
          <span className="text-xs text-gray-400">· {(PLANO_ANUAL[mesSelecionado]||[]).length} manutenções</span>
        </div>
        <button onClick={() => setMesSelecionado(null)}
          className="text-xs text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors">✕</button>
      </div>
      {(PLANO_ANUAL[mesSelecionado]||[]).length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sem manutenções planeadas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(PLANO_ANUAL[mesSelecionado]||[]).map((ot, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: ot.cor }} />
              <span className="text-sm font-semibold text-gray-700">{ot.equipamento}</span>
              {ot.fichaId ? (
                <button onClick={() => iniciarComFicha(ot.fichaId!, ot.equipamento)}
                  className="flex items-center gap-1 text-xs font-bold text-white px-2.5 py-1 rounded-lg transition-all hover:opacity-80 ml-1"
                  style={{ background: ot.cor }}>
                  Iniciar <ArrowRight size={10} />
                </button>
              ) : (
                <span className="text-xs text-gray-300 ml-1 italic">sem ficha</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )}
</div>

      {/* Este mês */}
      {otsMesAtual.length > 0 && (
        <div className="fade-up bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden" style={{ animationDelay: '250ms' }}>
          <div className="px-5 py-3 border-b border-red-50 flex items-center gap-2.5" style={{ background: 'linear-gradient(90deg, #fff5f5, white)' }}>
            <div className="relative w-2.5 h-2.5 flex-shrink-0">
              <div className="pulse-dot relative w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Este mês — {MESES_FULL[mesAtual-1]}</span>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            {otsMesAtual.map((ot, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 px-4 py-3 transition-colors">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ot.cor }} />
                <div>
                  <p className="text-sm font-bold text-gray-800">{ot.equipamento}</p>
                  <p className="text-xs text-gray-400">Preventiva Eletromedicina</p>
                </div>
                {ot.fichaId ? (
                  <button onClick={() => iniciarComFicha(ot.fichaId!, ot.equipamento)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90 ml-2 shadow-sm"
                    style={{ background: '#C0001A' }}>
                    <ClipboardList size={12} /> Iniciar OT
                  </button>
                ) : (
                  <button onClick={() => setModo('selecionar')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white transition-all ml-2">
                    <ClipboardList size={12} /> Selecionar ficha
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

  // ── SELECIONAR FICHA ──
  if (modo === 'selecionar') {
    return (
      <div className="space-y-5">
        <style>{`
          @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.5);opacity:0}100%{transform:scale(1.5);opacity:0}}
          @keyframes slide-in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
          .ficha-row{animation:slide-in .2s ease both}
          .pulse-dot::before{content:'';position:absolute;inset:0;border-radius:50%;background:inherit;animation:pulse-ring 2s ease-out infinite}
        `}</style>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Nova OT</h1>
            <p className="text-sm text-gray-400 mt-0.5">Seleciona a ficha de manutenção preventiva</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetar}
              className="text-xs text-gray-500 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-1.5">
              <RotateCcw size={12} /> Dashboard
            </button>
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
              <div className="relative w-2 h-2 flex-shrink-0">
                <div className="pulse-dot relative w-2 h-2 rounded-full bg-red-500" />
              </div>
              <span className="text-xs font-semibold text-gray-500">{FICHAS_TEMPLATES.length} fichas</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 280px' }}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input type="text" placeholder="Pesquisar equipamento..." value={pesquisaFicha}
                onChange={e => setPesquisaFicha(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400" autoFocus />
              {pesquisaFicha && (
                <button onClick={() => setPesquisaFicha('')}
                  className="text-xs text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors">✕</button>
              )}
              <span className="text-xs text-gray-300 font-mono">{fichasFiltradas.length}</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 460 }}>
              {fichasFiltradas.map((ficha, i) => {
                const ativo = fichaSelId === ficha.id
                return (
                  <button key={ficha.id} onClick={() => { setFichaSelId(ficha.id); carregarFicha(ficha.id) }}
                    className="ficha-row w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 text-left transition-all hover:bg-gray-50/80 group"
                    style={{
                      animationDelay: `${Math.min(i*12,250)}ms`,
                      background: ativo ? 'linear-gradient(90deg,#fff5f5 0%,#fff 100%)' : undefined,
                      borderLeft: ativo ? '3px solid #C0001A' : '3px solid transparent',
                    }}>
                    <span className="text-xs font-mono text-gray-300 w-5 flex-shrink-0 text-right">{String(i+1).padStart(2,'0')}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${ativo?'bg-red-100':'bg-gray-100 group-hover:bg-gray-200'}`}>
                      <FileText size={14} className={ativo?'text-red-600':'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate transition-colors ${ativo?'text-red-700':'text-gray-700 group-hover:text-gray-900'}`}>{ficha.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{ficha.tarefas.length} tarefas</p>
                    </div>
                    {ativo && (
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all duration-300 ${fichaSelId?'border-red-200 shadow-red-100/50':'border-gray-100'}`}>
              {fichaSelId ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative w-3 h-3">
                      <div className="pulse-dot relative w-3 h-3 rounded-full bg-red-500" />
                    </div>
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Pronto</span>
                  </div>
                  <p className="text-base font-bold text-gray-800 leading-tight mb-1">
                    {FICHAS_TEMPLATES.find(f=>f.id===fichaSelId)?.nome}
                  </p>
                  <p className="text-xs text-gray-400 mb-5">
                    {FICHAS_TEMPLATES.find(f=>f.id===fichaSelId)?.tarefas.length} tarefas · Preventiva Eletromedicina
                  </p>
                  <button onClick={() => setModo('preencher')}
                    className="w-full text-sm font-bold text-white py-3 rounded-xl transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                    style={{ background: 'linear-gradient(135deg,#C0001A 0%,#E30613 100%)' }}>
                    <ClipboardList size={15} /> Iniciar preenchimento
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ClipboardList size={22} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">Nenhuma ficha</p>
                  <p className="text-xs text-gray-300 mt-1">Seleciona um equipamento</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Camera size={15} className="text-blue-500" />
                </div>
                <p className="text-sm font-bold text-gray-700">Scan OCR</p>
              </div>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">Fotografa a ficha em papel. O sistema identifica o equipamento automaticamente.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => camaraRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-white py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 transition-all">
                  <Camera size={13} /> Abrir câmara
                </button>
                <button onClick={() => imagemRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  <FileText size={13} /> Upload imagem
                </button>
              </div>
              <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && handleOCRScan(e.target.files[0])} />
              <input ref={imagemRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleOCRScan(e.target.files[0])} />
            </div>

            {carregandoOCR && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-700">A processar OCR...</p>
                  <p className="text-xs text-blue-400 mt-0.5">Pode demorar alguns segundos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── PREENCHIMENTO ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{cabecalho.tipoEquipamento}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{tarefas.length} tarefas · {progresso}% concluído</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetar}
            className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
            <RotateCcw size={12} /> Dashboard
          </button>
          <button onClick={() => gerarPDFPreenchido(cabecalho, tarefas)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-lg transition-all"
            style={{ background: '#C0001A' }}>
            <Download size={13} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">Progresso</span>
          <span className="text-xs font-bold text-gray-700">{progresso}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progresso}%`, background: progresso===100?'#16a34a':'#C0001A' }} />
        </div>
        <div className="flex gap-4 mt-3">
          <span className="text-xs text-green-600 font-semibold">✓ {tarefas.filter(t=>t.valor==='OK').length} OK</span>
          <span className="text-xs text-red-600 font-semibold">✗ {tarefas.filter(t=>t.valor==='NOK').length} NOK</span>
          <span className="text-xs text-gray-400 font-semibold">— {tarefas.filter(t=>t.valor==='NA').length} N/A</span>
          <span className="text-xs text-gray-300 font-semibold">· {tarefas.filter(t=>t.valor===null).length} por preencher</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <button onClick={() => setExpandido(!expandido)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
          Cabeçalho da OT {expandido ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
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
                <input type="text" value={cabecalho[key as keyof Cabecalho]}
                  onChange={e => setCabecalho(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 transition-colors" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Equipamentos Teste</label>
              <input type="text" value={cabecalho.equipamentosTeste}
                onChange={e => setCabecalho(prev => ({ ...prev, equipamentosTeste: e.target.value }))}
                placeholder="Ex: Fluke ESA612 SN:12345 Cal:01/2026"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 transition-colors" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Preencher tudo:</span>
        {(['OK','NA','NOK'] as const).map(v => (
          <button key={v} onClick={() => preencherTodos(v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={{
              background: v==='OK'?'#f0fdf4':v==='NOK'?'#fef2f2':'#f8fafc',
              borderColor: v==='OK'?'#bbf7d0':v==='NOK'?'#fecaca':'#e2e8f0',
              color: v==='OK'?'#16a34a':v==='NOK'?'#dc2626':'#64748b',
            }}>{v}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Código</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Tarefa</th>
              <th className="text-center px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide w-52">Valor</th>
            </tr>
          </thead>
          <tbody>
            {tarefas.map((tarefa, i) => (
              <tr key={tarefa.codigo} className={`border-b border-gray-50 transition-colors ${
                tarefa.valor==='OK'?'bg-green-50/30':tarefa.valor==='NOK'?'bg-red-50/30':tarefa.valor==='NA'?'bg-gray-50/50':''
              }`}>
                <td className="px-4 py-2.5">
                  <span className="text-xs font-mono font-semibold text-gray-400">{tarefa.codigo}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-700 leading-relaxed">{tarefa.descricao}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 justify-center">
                    {tarefa.temValorNumerico && (
                      <input type="text" value={tarefa.valorNumerico}
                        onChange={e => setValorNumerico(i, e.target.value)}
                        placeholder="Val."
                        className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-red-400 text-center" />
                    )}
                    {([
                      { v: 'OK' as const, icon: <CheckCircle size={12}/>, cor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                      { v: 'NOK' as const, icon: <XCircle size={12}/>, cor: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                      { v: 'NA' as const, icon: <MinusCircle size={12}/>, cor: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
                    ]).map(({ v, icon, cor, bg, border }) => (
                      <button key={v} onClick={() => setValor(i, v)}
                        className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg border transition-all"
                        style={{
                          background: tarefa.valor===v ? cor : bg,
                          borderColor: tarefa.valor===v ? cor : border,
                          color: tarefa.valor===v ? '#fff' : cor,
                        }}>{icon} {v}</button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Data de Realização</label>
          <input type="text" value={cabecalho.dataRealizacao}
            onChange={e => setCabecalho(prev => ({ ...prev, dataRealizacao: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 transition-colors" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Observações</label>
          <textarea value={cabecalho.observacoes}
            onChange={e => setCabecalho(prev => ({ ...prev, observacoes: e.target.value }))}
            rows={3} placeholder="Observações adicionais..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 transition-colors resize-none" />
        </div>
      </div>

      <button onClick={() => gerarPDFPreenchido(cabecalho, tarefas)}
        className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-all"
        style={{ background: '#C0001A' }}>
        <Download size={16} /> Gerar PDF preenchido
      </button>
    </div>
  )
}