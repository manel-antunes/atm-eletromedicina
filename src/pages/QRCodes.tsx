import { useState, useEffect } from 'react'
import { Search, Printer, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import type { Equipamento } from '../data/equipamentos'

interface Props {
  equipamentos: Equipamento[]
}

import { API_URL } from '../config'
const BASE_URL = window.location.origin

function getToken() { return localStorage.getItem('atm_token') ?? '' }
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
}

interface EqItem {
  sap: string
  descricao: string
  localizacao: string
  tipo: 'calibracao' | 'preventiva'
}

const LIMITE = 8

export default function QRCodes({ equipamentos }: Props) {
  const [pesquisa, setPesquisa] = useState('')
  const [eqsPreventivas, setEqsPreventivas] = useState<EqItem[]>([])
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const todosEqs: EqItem[] = [
    ...equipamentos.map(eq => ({
      sap: eq.numeroSAP,
      descricao: eq.descricao,
      localizacao: eq.localizacao,
      tipo: 'calibracao' as const,
    })),
    ...eqsPreventivas,
  ]

  const filtrados = todosEqs.filter(eq =>
    !pesquisa ||
    eq.descricao.toLowerCase().includes(pesquisa.toLowerCase()) ||
    eq.sap.toLowerCase().includes(pesquisa.toLowerCase()) ||
    (eq.localizacao?.toLowerCase().includes(pesquisa.toLowerCase()) ?? false)
  )

  const porTipo = {
    calibracao: filtrados.filter(e => e.tipo === 'calibracao'),
    preventiva: filtrados.filter(e => e.tipo === 'preventiva'),
  }

  useEffect(() => {
    const mes = new Date().getMonth() + 1
    const ano = new Date().getFullYear()
    fetch(`${API_URL}/api/preventivas/${mes}/${ano}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const unicos = new Map<string, EqItem>()
          data.forEach((eq: any) => {
            if (!unicos.has(eq.cod_ativo) && !equipamentos.find(e => e.numeroSAP === eq.cod_ativo)) {
              unicos.set(eq.cod_ativo, {
                sap: eq.cod_ativo,
                descricao: eq.nome,
                localizacao: eq.localizacao,
                tipo: 'preventiva',
              })
            }
          })
          setEqsPreventivas(Array.from(unicos.values()))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const gerar = async () => {
      const novos: Record<string, string> = {}
      for (const eq of filtrados) {
        if (!qrUrls[eq.sap]) {
          try {
            const url = `${BASE_URL}/eq/${eq.sap}`
            novos[eq.sap] = await QRCode.toDataURL(url, {
              width: 200, margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' },
            })
          } catch { }
        }
      }
      if (Object.keys(novos).length > 0) setQrUrls(prev => ({ ...prev, ...novos }))
    }
    gerar()
  }, [filtrados.length, pesquisa])

  function toggleSelecionado(sap: string) {
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(sap)) novo.delete(sap)
      else novo.add(sap)
      return novo
    })
  }

  function toggleExpandido(label: string) {
    setExpandidos(prev => {
      const novo = new Set(prev)
      if (novo.has(label)) novo.delete(label)
      else novo.add(label)
      return novo
    })
  }

  function selecionarTodos() {
    if (selecionados.size === filtrados.length) setSelecionados(new Set())
    else setSelecionados(new Set(filtrados.map(e => e.sap)))
  }

  function imprimir() {
    const paraImprimir = filtrados.filter(eq => selecionados.has(eq.sap))
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes — ATM Eletromedicina</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Noto Sans'; background: #fff; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; }
          .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; break-inside: avoid; }
          .card img { width: 120px; height: 120px; }
          .card .descricao { font-size: 10px; font-weight: 700; color: #0f172a; margin-top: 6px; line-height: 1.3; }
          .card .sap { font-size: 9px; color: #94a3b8; font-family: 'Noto Sans'; margin-top: 2px; }
          .card .loc { font-size: 9px; color: #64748b; margin-top: 2px; }
          .card .tipo { font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-top: 4px; }
          .tipo-calibracao { background: #fef2f2; color: #dc2626; }
          .tipo-preventiva { background: #eff6ff; color: #3b82f6; }
          @media print { @page { margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="grid">
          ${paraImprimir.map(eq => `
            <div class="card">
              <img src="${qrUrls[eq.sap] || ''}" />
              <p class="descricao">${eq.descricao}</p>
              <p class="sap">${eq.sap}</p>
              <p class="loc">${eq.localizacao || '—'}</p>
              <span class="tipo tipo-${eq.tipo}">${eq.tipo === 'calibracao' ? 'Calibração' : 'Preventiva'}</span>
            </div>
          `).join('')}
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  function renderGrelha(eqs: EqItem[], label: string) {
    if (eqs.length === 0) return null
    const expandido = expandidos.has(label)
    const visiveis = expandido ? eqs : eqs.slice(0, LIMITE)

    return (
      <div key={label} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{eqs.length} equipamentos</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {visiveis.map(eq => {
            const sel = selecionados.has(eq.sap)
            return (
              <div
                key={eq.sap}
                onClick={() => toggleSelecionado(eq.sap)}
                style={{
                  background: '#fff',
                  border: `2px solid ${sel ? '#C0001A' : '#e2e8f0'}`,
                  borderRadius: 14, padding: '14px 12px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.15s',
                  boxShadow: sel ? '0 0 0 3px rgba(192,0,26,0.1)' : 'none',
                }}
              >
                {qrUrls[eq.sap] ? (
                  <img src={qrUrls[eq.sap]} alt={eq.sap} style={{ width: 110, height: 110, borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 110, height: 110, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <QrCode size={32} color="#cbd5e1" />
                  </div>
                )}
                <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: '8px 0 2px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                  {eq.descricao}
                </p>
                <p style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Noto Sans', margin: '0 0 4px' }}>{eq.sap}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: eq.tipo === 'calibracao' ? '#fef2f2' : '#eff6ff', color: eq.tipo === 'calibracao' ? '#dc2626' : '#3b82f6' }}>
                  {eq.tipo === 'calibracao' ? 'Calibração' : 'Preventiva'}
                </span>
                {sel && <div style={{ marginTop: 6, fontSize: 10, color: '#C0001A', fontWeight: 700 }}>✓ Selecionado</div>}
              </div>
            )
          })}
        </div>
        {eqs.length > LIMITE && (
          <button
            onClick={() => toggleExpandido(label)}
            style={{ marginTop: 12, width: '100%', border: '1px solid #e2e8f0', background: '#fff', borderRadius: 10, padding: '8px 0', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
          >
            {expandido ? 'Mostrar menos' : `Ver mais ${eqs.length - LIMITE} equipamentos`}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1a0a0f 100%)', padding: '16px 24px', borderBottom: '1px solid rgba(192,0,26,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>QR Codes</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>
              {todosEqs.length} equipamentos · {selecionados.size} selecionados
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={selecionarTodos}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              {selecionados.size === filtrados.length ? 'Desselecionar' : 'Selecionar todos'}
            </button>
            <button
              onClick={imprimir}
              disabled={selecionados.size === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: selecionados.size > 0 ? '#C0001A' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: selecionados.size > 0 ? 'pointer' : 'not-allowed', opacity: selecionados.size > 0 ? 1 : 0.4 }}
            >
              <Printer size={13} />
              {selecionados.size > 0 ? `Imprimir (${selecionados.size})` : 'Imprimir'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '8px 24px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            placeholder="Pesquisar equipamento, SAP, localização..."
            style={{ width: '100%', paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', color: '#0f172a', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12 }}>A carregar equipamentos...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <QrCode size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 12 }}>Nenhum equipamento encontrado</p>
          </div>
        ) : (
          <>
            {renderGrelha(porTipo.calibracao, 'Calibração')}
            {renderGrelha(porTipo.preventiva, 'Preventiva')}
          </>
        )}
      </div>
    </div>
  )
}