import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle, Clock, ChevronRight, X, FileSpreadsheet, Search, Filter, RotateCcw, ClipboardList, AlertTriangle, CheckSquare, MinusSquare } from 'lucide-react'
import * as XLSX from 'xlsx'
import { FICHAS_TEMPLATES } from '../data/fichasTemplates'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://atm-eletromedicina.onrender.com'

function getToken() { return localStorage.getItem('atm_token') ?? '' }
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function encontrarFicha(nome: string) {
  const nomeLower = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return FICHAS_TEMPLATES.find(f => {
    const fNome = f.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return nomeLower.includes(fNome) || fNome.includes(nomeLower) ||
      nomeLower.split(' ').some(w => w.length > 4 && fNome.includes(w))
  }) ?? FICHAS_TEMPLATES.find(f => f.id === 'equipamento_eletromedicina_geral')
}

export default function PlanoPreventivas() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [mesAtivo, setMesAtivo] = useState(new Date().getMonth() + 1)
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear())
  const [pesquisa, setPesquisa] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [filtroPendentes, setFiltroPendentes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)
  const [modalEq, setModalEq] = useState<Equipamento | null>(null)
  const [respostas, setRespostas] = useState<Record<string, RespostaTarefa>>({})
  const [obsModal, setObsModal] = useState('')
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    const ficha = encontrarFicha(eq.nome)
    const init: Record<string, RespostaTarefa> = {}
    ficha?.tarefas.forEach(t => { init[t.codigo] = { estado: null, valor: '', comentario: '' } })
    setRespostas(init)
  }

  function setEstado(codigo: string, estado: EstadoTarefa) {
    setRespostas(prev => ({ ...prev, [codigo]: { ...prev[codigo], estado } }))
  }

  function setValor(codigo: string, valor: string) {
    setRespostas(prev => ({ ...prev, [codigo]: { ...prev[codigo], valor } }))
  }

  async function handleGuardarOT() {
    if (!modalEq) return
    setGuardando(true)
    try {
      await fetch(`${API_URL}/api/preventivas/${modalEq.id}/concluir`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ observacoes: obsModal }),
      })
      await carregarPlano()
      setModalEq(null)
    } catch { }
    finally { setGuardando(false) }
  }

  function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0]
    if (!ficheiro) return
    setImportando(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const dados = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(dados, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const linhas = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][]
        let headerIdx = linhas.findIndex(l => l.some(c => String(c).includes('Cód. Ativo') || String(c).includes('Cod. Ativo')))
        if (headerIdx === -1) headerIdx = 3
        const eqs = linhas.slice(headerIdx + 1)
          .filter(l => l[0] && String(l[0]).trim().length > 2)
          .map(l => ({
            codAtivo: String(l[0] ?? '').trim(),
            nome: String(l[4] ?? '').trim(),
            marca: String(l[8] ?? '').trim(),
            modelo: String(l[12] ?? '').trim(),
            numeroSerie: String(l[13] ?? '').trim(),
            codLocalizacao: String(l[14] ?? '').trim(),
            localizacao: String(l[15] ?? '').trim(),
            setor: String(l[17] ?? '').trim(),
            area: String(l[19] ?? '').trim(),
          }))
          .filter(e => e.codAtivo !== '' && e.codAtivo !== 'undefined')
        let mes = mesAtivo, ano = anoAtivo
        const nomeFich = ficheiro.name.toUpperCase()
        MESES.forEach((m, i) => { if (nomeFich.includes(m.toUpperCase().substring(0, 3))) mes = i + 1 })
        const res = await fetch(`${API_URL}/api/preventivas/importar`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ mes, ano, equipamentos: eqs }),
        })
        if (res.ok) { setMesAtivo(mes); setAnoAtivo(ano); await carregarPlano() }
      } catch (err) { console.error(err) }
      finally { setImportando(false) }
    }
    reader.readAsArrayBuffer(ficheiro)
    e.target.value = ''
  }

  async function toggleConcluir(eq: Equipamento, e: React.MouseEvent) {
    e.stopPropagation()
    if (eq.concluido) {
      await fetch(`${API_URL}/api/preventivas/${eq.id}/desconcluir`, { method: 'PATCH', headers: authHeaders() })
      await carregarPlano()
    } else {
      abrirModal(eq)
    }
  }

  const setores = ['Todos', ...Array.from(new Set(equipamentos.map(e => e.setor).filter(Boolean)))]
  const filtrados = equipamentos.filter(eq => {
    const t = pesquisa.toLowerCase()
    return (!pesquisa || eq.nome.toLowerCase().includes(t) || eq.cod_ativo.toLowerCase().includes(t) || eq.localizacao.toLowerCase().includes(t) || eq.marca.toLowerCase().includes(t))
      && (filtroSetor === 'Todos' || eq.setor === filtroSetor)
      && (!filtroPendentes || !eq.concluido)
  })
  const concluidos = equipamentos.filter(e => e.concluido).length
  const total = equipamentos.length
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0
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

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1a0a0f 100%)', padding: '20px 24px', borderBottom: '1px solid rgba(192,0,26,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>Plano de Preventivas</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>{MESES[mesAtivo - 1]} {anoAtivo} · {total} equipamentos</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={mesAtivo} onChange={e => setMesAtivo(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {MESES.map((m, i) => <option key={i} value={i+1} style={{ background: '#1e293b' }}>{m}</option>)}
            </select>
            <select value={anoAtivo} onChange={e => setAnoAtivo(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {[2024,2025,2026,2027].map(a => <option key={a} value={a} style={{ background: '#1e293b' }}>{a}</option>)}
            </select>
            <button onClick={() => inputRef.current?.click()} disabled={importando} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#C0001A', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Upload size={13} />{importando ? 'A importar...' : 'Importar Excel'}
            </button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcel} />
          </div>
        </div>
        {total > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Progresso do mês</span>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{concluidos}/{total} · {pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct > 60 ? '#f59e0b' : '#C0001A', transition: 'width 0.5s ease', boxShadow: `0 0 10px ${pct === 100 ? 'rgba(22,163,74,0.5)' : 'rgba(192,0,26,0.4)'}` }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[{label:'Concluídos',valor:concluidos,cor:'#4ade80'},{label:'Pendentes',valor:total-concluidos,cor:'#f87171'},{label:'Setores',valor:setores.length-1,cor:'#60a5fa'}].map(k => (
                <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: k.cor, fontSize: 16, fontWeight: 800, fontFamily: 'monospace' }}>{k.valor}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{k.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      {total > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar equipamento, cód. ativo, localização..." style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#0f172a' }} />
          </div>
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', color: '#0f172a', background: '#fff', cursor: 'pointer' }}>
            {setores.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setFiltroPendentes(!filtroPendentes)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${filtroPendentes ? '#C0001A' : '#e2e8f0'}`, background: filtroPendentes ? 'rgba(192,0,26,0.06)' : '#fff', color: filtroPendentes ? '#C0001A' : '#64748b', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Filter size={12} />Só pendentes
          </button>
          {(pesquisa || filtroSetor !== 'Todos' || filtroPendentes) && (
            <button onClick={() => { setPesquisa(''); setFiltroSetor('Todos'); setFiltroPendentes(false) }} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
              <RotateCcw size={12} />Limpar
            </button>
          )}
          <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 'auto' }}>{filtrados.length} de {total}</span>
        </div>
      )}

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: 13 }}>A carregar plano...</p>
          </div>
        )}
        {!loading && total === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(192,0,26,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <FileSpreadsheet size={36} color="#C0001A" style={{ opacity: 0.5 }} />
            </div>
            <p style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Sem plano para este mês</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px' }}>Importa o Excel do SAP para carregar os equipamentos</p>
            <button onClick={() => inputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#C0001A', border: 'none', borderRadius: 10, color: '#fff', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Upload size={15} />Importar Excel do SAP
            </button>
          </div>
        )}
        {!loading && Object.entries(porSetor).map(([setor, eqs]) => {
          const concluidosSetor = eqs.filter(e => e.concluido).length
          return (
            <div key={setor}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{setor}</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 11, color: concluidosSetor === eqs.length ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>{concluidosSetor}/{eqs.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {eqs.map(eq => (
                  <div key={eq.id} onClick={() => abrirModal(eq)} style={{ background: '#fff', border: `1px solid ${eq.concluido ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s', opacity: eq.concluido ? 0.75 : 1 }}
                    onMouseEnter={e => { if (!eq.concluido) (e.currentTarget as HTMLElement).style.borderColor = '#C0001A'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(192,0,26,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = eq.concluido ? '#bbf7d0' : '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  >
                    <div onClick={e => toggleConcluir(eq, e)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `2px solid ${eq.concluido ? '#16a34a' : '#cbd5e1'}`, background: eq.concluido ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', cursor: 'pointer' }}>
                      {eq.concluido && <CheckCircle size={14} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: eq.concluido ? '#64748b' : '#0f172a', textDecoration: eq.concluido ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eq.nome}</span>
                        {eq.area && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: eq.area.includes('Baixo') ? '#f0fdf4' : eq.area.includes('Médio') ? '#fffbeb' : '#fef2f2', color: eq.area.includes('Baixo') ? '#16a34a' : eq.area.includes('Médio') ? '#d97706' : '#dc2626', flexShrink: 0 }}>{eq.area.split(' ')[0]}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{eq.cod_ativo}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{eq.localizacao}</span>
                        {eq.marca && <span style={{ fontSize: 11, color: '#94a3b8' }}>{eq.marca}</span>}
                      </div>
                      {eq.concluido && eq.concluido_por && (
                        <div style={{ fontSize: 10, color: '#16a34a', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={10} />{eq.concluido_por} · {eq.concluido_em ? new Date(eq.concluido_em).toLocaleString('pt-PT') : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {!eq.concluido && <span style={{ fontSize: 10, fontWeight: 600, color: '#C0001A', background: 'rgba(192,0,26,0.08)', padding: '3px 8px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}><ClipboardList size={10} />Preencher OT</span>}
                      <ChevronRight size={14} color="#cbd5e1" />
                    </div>
                  </div>
                ))}
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
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, fontFamily: 'monospace' }}>{modalEq.cod_ativo} · {modalEq.localizacao}</p>
                </div>
                <button onClick={() => setModalEq(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', marginLeft: 12, flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>

              {/* Cabeçalho OT */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
                {[
                  { label: 'Marca', valor: modalEq.marca || '—' },
                  { label: 'Modelo', valor: modalEq.modelo || '—' },
                  { label: 'Nº Série', valor: modalEq.numero_serie || '—' },
                  { label: 'Setor', valor: modalEq.setor || '—' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{c.label}</p>
                    <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, margin: 0, fontFamily: c.label === 'Nº Série' ? 'monospace' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.valor}</p>
                  </div>
                ))}
              </div>

              {/* Progresso tarefas */}
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

            {/* Corpo modal — tarefas */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {fichaModal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fichaModal.tarefas.map((tarefa, i) => {
                    const resp = respostas[tarefa.codigo] ?? { estado: null, valor: '', comentario: '' }
                    const corEstado = resp.estado === 'ok' ? '#16a34a' : resp.estado === 'nok' ? '#dc2626' : resp.estado === 'na' ? '#64748b' : null
                    return (
                      <div key={tarefa.codigo} style={{ background: resp.estado ? `${corEstado}08` : '#f8fafc', border: `1px solid ${resp.estado ? `${corEstado}30` : '#e2e8f0'}`, borderRadius: 10, padding: '10px 14px', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', flexShrink: 0, marginTop: 2, minWidth: 80 }}>{tarefa.codigo}</span>
                          <p style={{ fontSize: 12, color: '#0f172a', flex: 1, margin: 0, lineHeight: 1.5 }}>{tarefa.descricao}</p>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {(['ok', 'nok', 'na'] as EstadoTarefa[]).map(estado => (
                              <button key={estado} onClick={() => setEstado(tarefa.codigo, resp.estado === estado ? null : estado)} style={{
                                border: `1px solid ${resp.estado === estado ? (estado === 'ok' ? '#16a34a' : estado === 'nok' ? '#dc2626' : '#64748b') : '#e2e8f0'}`,
                                background: resp.estado === estado ? (estado === 'ok' ? '#16a34a' : estado === 'nok' ? '#dc2626' : '#64748b') : '#fff',
                                color: resp.estado === estado ? '#fff' : '#94a3b8',
                                borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s',
                                textTransform: 'uppercase',
                              }}>
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
                  <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>Sem ficha de manutenção associada</p>
                </div>
              )}

              {/* Observações */}
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Observações gerais</p>
                <textarea value={obsModal} onChange={e => setObsModal(e.target.value)} placeholder="Notas sobre esta intervenção..." style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 12, resize: 'vertical', minHeight: 80, outline: 'none', color: '#0f172a', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* Footer modal */}
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button onClick={() => setModalEq(null)} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>
                Cancelar
              </button>
              <button onClick={handleGuardarOT} disabled={guardando} style={{ background: '#C0001A', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, opacity: guardando ? 0.7 : 1 }}>
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