import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle, Clock, ChevronRight, X, FileSpreadsheet, Search, Filter, RotateCcw, Clipboard } from 'lucide-react'
import * as XLSX from 'xlsx'

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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function PlanoPreventivas() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [mesAtivo, setMesAtivo] = useState(new Date().getMonth() + 1)
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear())
  const [selecionado, setSelecionado] = useState<Equipamento | null>(null)
  const [pesquisa, setPesquisa] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [filtroPendentes, setFiltroPendentes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)
  const [obsTemp, setObsTemp] = useState('')
  const [copiado, setCopiado] = useState('')
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

        // Encontra linha de cabeçalho (tem "Cód. Ativo")
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

        // Detecta mês/ano do ficheiro pelo nome ou usa o atual
        let mes = mesAtivo
        let ano = anoAtivo
        const nomeFich = ficheiro.name.toUpperCase()
        MESES.forEach((m, i) => {
          if (nomeFich.includes(m.toUpperCase().substring(0, 3))) mes = i + 1
        })

        const res = await fetch(`${API_URL}/api/preventivas/importar`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ mes, ano, equipamentos: eqs }),
        })
        if (res.ok) {
          setMesAtivo(mes)
          setAnoAtivo(ano)
          await carregarPlano()
        }
      } catch (err) { console.error(err) }
      finally { setImportando(false) }
    }
    reader.readAsArrayBuffer(ficheiro)
    e.target.value = ''
  }

  async function toggleConcluir(eq: Equipamento) {
    if (eq.concluido) {
      await fetch(`${API_URL}/api/preventivas/${eq.id}/desconcluir`, { method: 'PATCH', headers: authHeaders() })
    } else {
      await fetch(`${API_URL}/api/preventivas/${eq.id}/concluir`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ observacoes: obsTemp }),
      })
    }
    await carregarPlano()
    if (selecionado?.id === eq.id) setSelecionado(null)
    setObsTemp('')
  }

  function copiar(texto: string, chave: string) {
    navigator.clipboard.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado(''), 2000)
  }

  const setores = ['Todos', ...Array.from(new Set(equipamentos.map(e => e.setor).filter(Boolean)))]

  const filtrados = equipamentos.filter(eq => {
    const termoPesquisa = pesquisa.toLowerCase()
    const matchPesquisa = !pesquisa ||
      eq.nome.toLowerCase().includes(termoPesquisa) ||
      eq.cod_ativo.toLowerCase().includes(termoPesquisa) ||
      eq.localizacao.toLowerCase().includes(termoPesquisa) ||
      eq.marca.toLowerCase().includes(termoPesquisa)
    const matchSetor = filtroSetor === 'Todos' || eq.setor === filtroSetor
    const matchPendente = !filtroPendentes || !eq.concluido
    return matchPesquisa && matchSetor && matchPendente
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0, background: '#f1f5f9' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1a0a0f 100%)', padding: '20px 24px', borderBottom: '1px solid rgba(192,0,26,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
              Plano de Preventivas
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>
              {MESES[mesAtivo - 1]} {anoAtivo} · {total} equipamentos
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Seletor mês */}
            <select
              value={mesAtivo}
              onChange={e => setMesAtivo(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
            >
              {MESES.map((m, i) => <option key={i} value={i+1} style={{ background: '#1e293b' }}>{m}</option>)}
            </select>
            <select
              value={anoAtivo}
              onChange={e => setAnoAtivo(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
            >
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a} style={{ background: '#1e293b' }}>{a}</option>)}
            </select>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={importando}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#C0001A', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Upload size={13} />
              {importando ? 'A importar...' : 'Importar Excel'}
            </button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcel} />
          </div>
        </div>

        {/* Barra de progresso */}
        {total > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Progresso do mês</span>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{concluidos}/{total} · {pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${pct}%`,
                background: pct === 100 ? '#16a34a' : pct > 60 ? '#f59e0b' : '#C0001A',
                transition: 'width 0.5s ease',
                boxShadow: `0 0 10px ${pct === 100 ? 'rgba(22,163,74,0.5)' : 'rgba(192,0,26,0.4)'}`,
              }} />
            </div>
            {/* Mini KPIs */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[
                { label: 'Concluídos', valor: concluidos, cor: '#4ade80' },
                { label: 'Pendentes', valor: total - concluidos, cor: '#f87171' },
                { label: 'Setores', valor: setores.length - 1, cor: '#60a5fa' },
              ].map(k => (
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
            <input
              value={pesquisa}
              onChange={e => setPesquisa(e.target.value)}
              placeholder="Pesquisar equipamento, cód. ativo, localização..."
              style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
            />
          </div>
          <select
            value={filtroSetor}
            onChange={e => setFiltroSetor(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', color: '#0f172a', background: '#fff', cursor: 'pointer' }}
          >
            {setores.map(s => <option key={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setFiltroPendentes(!filtroPendentes)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: `1px solid ${filtroPendentes ? '#C0001A' : '#e2e8f0'}`,
              background: filtroPendentes ? 'rgba(192,0,26,0.06)' : '#fff',
              color: filtroPendentes ? '#C0001A' : '#64748b',
              borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Filter size={12} />
            Só pendentes
          </button>
          {(pesquisa || filtroSetor !== 'Todos' || filtroPendentes) && (
            <button
              onClick={() => { setPesquisa(''); setFiltroSetor('Todos'); setFiltroPendentes(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
            >
              <RotateCcw size={12} /> Limpar
            </button>
          )}
          <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 'auto' }}>{filtrados.length} de {total}</span>
        </div>
      )}

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
              <button
                onClick={() => inputRef.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#C0001A', border: 'none', borderRadius: 10, color: '#fff', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                <Upload size={15} /> Importar Excel do SAP
              </button>
            </div>
          )}

          {!loading && Object.entries(porSetor).map(([setor, eqs]) => {
            const concluidosSetor = eqs.filter(e => e.concluido).length
            return (
              <div key={setor}>
                {/* Header do setor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{setor}</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: concluidosSetor === eqs.length ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                    {concluidosSetor}/{eqs.length}
                  </span>
                </div>

                {/* Equipamentos do setor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {eqs.map(eq => (
                    <div
                      key={eq.id}
                      onClick={() => { setSelecionado(selecionado?.id === eq.id ? null : eq); setObsTemp(eq.observacoes ?? '') }}
                      style={{
                        background: '#fff',
                        border: `1px solid ${selecionado?.id === eq.id ? '#C0001A' : eq.concluido ? '#bbf7d0' : '#e2e8f0'}`,
                        borderRadius: 12,
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        transition: 'all 0.15s',
                        opacity: eq.concluido ? 0.7 : 1,
                        boxShadow: selecionado?.id === eq.id ? '0 0 0 3px rgba(192,0,26,0.1)' : 'none',
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={e => { e.stopPropagation(); toggleConcluir(eq) }}
                        style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          border: `2px solid ${eq.concluido ? '#16a34a' : '#cbd5e1'}`,
                          background: eq.concluido ? '#16a34a' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s', cursor: 'pointer',
                        }}
                      >
                        {eq.concluido && <CheckCircle size={14} color="#fff" />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: eq.concluido ? '#64748b' : '#0f172a', textDecoration: eq.concluido ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {eq.nome}
                          </span>
                          {eq.area && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: eq.area.includes('Baixo') ? '#f0fdf4' : eq.area.includes('Médio') ? '#fffbeb' : '#fef2f2', color: eq.area.includes('Baixo') ? '#16a34a' : eq.area.includes('Médio') ? '#d97706' : '#dc2626', flexShrink: 0 }}>
                              {eq.area.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{eq.cod_ativo}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{eq.localizacao}</span>
                          {eq.marca && <span style={{ fontSize: 11, color: '#94a3b8' }}>{eq.marca}</span>}
                        </div>
                        {eq.concluido && eq.concluido_por && (
                          <div style={{ fontSize: 10, color: '#16a34a', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={10} />
                            {eq.concluido_por} · {eq.concluido_em ? new Date(eq.concluido_em).toLocaleString('pt-PT') : ''}
                          </div>
                        )}
                      </div>

                      <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink: 0, transform: selecionado?.id === eq.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Painel lateral — cabeçalho OT */}
        {selecionado && (
          <div style={{
            width: 340, borderLeft: '1px solid #e2e8f0', background: '#fff',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Header painel */}
            <div style={{ background: 'linear-gradient(135deg, #0A0F1E, #1a0a0f)', padding: '20px 20px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                    Cabeçalho OT
                  </p>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                    {selecionado.nome}
                  </p>
                </div>
                <button onClick={() => setSelecionado(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#fff', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Estado */}
              <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: selecionado.concluido ? 'rgba(22,163,74,0.2)' : 'rgba(192,0,26,0.2)', borderRadius: 99, padding: '4px 10px' }}>
                {selecionado.concluido ? <CheckCircle size={11} color="#4ade80" /> : <Clock size={11} color="#f87171" />}
                <span style={{ fontSize: 11, fontWeight: 700, color: selecionado.concluido ? '#4ade80' : '#f87171' }}>
                  {selecionado.concluido ? 'Concluído' : 'Pendente'}
                </span>
              </div>
            </div>

            {/* Campos OT */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                Dados para preencher na OT
              </p>

              {[
                { label: 'Cód. Ativo', valor: selecionado.cod_ativo, chave: 'cod' },
                { label: 'Nome / Designação', valor: selecionado.nome, chave: 'nome' },
                { label: 'Marca', valor: selecionado.marca || '—', chave: 'marca' },
                { label: 'Modelo', valor: selecionado.modelo || '—', chave: 'modelo' },
                { label: 'Nº de Série', valor: selecionado.numero_serie || '—', chave: 'serie' },
                { label: 'Cód. Localização', valor: selecionado.cod_localizacao || '—', chave: 'codloc' },
                { label: 'Localização', valor: selecionado.localizacao || '—', chave: 'loc' },
                { label: 'Setor', valor: selecionado.setor || '—', chave: 'setor' },
              ].map(campo => (
                <div
                  key={campo.chave}
                  onClick={() => campo.valor !== '—' && copiar(campo.valor, campo.chave)}
                  style={{
                    background: copiado === campo.chave ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${copiado === campo.chave ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: 8, padding: '10px 12px',
                    cursor: campo.valor !== '—' ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>{campo.label}</p>
                    <p style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, margin: 0, fontFamily: campo.chave === 'cod' || campo.chave === 'serie' ? 'monospace' : 'inherit' }}>{campo.valor}</p>
                  </div>
                  {campo.valor !== '—' && (
                    copiado === campo.chave
                      ? <CheckCircle size={14} color="#16a34a" />
                      : <Clipboard size={13} color="#cbd5e1" />
                  )}
                </div>
              ))}

              {/* Observações */}
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Observações</p>
                <textarea
                  value={obsTemp}
                  onChange={e => setObsTemp(e.target.value)}
                  placeholder="Notas sobre esta manutenção..."
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 12, resize: 'vertical', minHeight: 80, outline: 'none', color: '#0f172a', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {/* Botão concluir */}
              <button
                onClick={() => toggleConcluir(selecionado)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: selecionado.concluido ? '#f1f5f9' : '#C0001A',
                  color: selecionado.concluido ? '#64748b' : '#fff',
                  border: `1px solid ${selecionado.concluido ? '#e2e8f0' : '#C0001A'}`,
                  borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  marginTop: 4, transition: 'all 0.15s',
                }}
              >
                {selecionado.concluido
                  ? <><RotateCcw size={14} /> Marcar como pendente</>
                  : <><CheckCircle size={14} /> Marcar como concluído</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}