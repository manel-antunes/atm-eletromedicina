import { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import logoAtm from '../assets/logo-atm.png'
import { API_URL } from '../config'
import { parseData } from '../utils/dateUtils'

function getEstado(dataCalibracao: string) {
  const proxima = parseData(dataCalibracao)
  if (!proxima) return { label: 'Sem data', cor: '#64748b', bg: '#f1f5f9', icon: 'none' }
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return { label: 'Vencida', cor: '#dc2626', bg: '#fef2f2', icon: 'vencida', dias: Math.abs(diff) }
  if (diff <= 30) return { label: 'Urgente', cor: '#ea580c', bg: '#fff7ed', icon: 'urgente', dias: diff }
  if (diff <= 60) return { label: 'Em breve', cor: '#d97706', bg: '#fffbeb', icon: 'embreve', dias: diff }
  return { label: 'Em dia', cor: '#16a34a', bg: '#f0fdf4', icon: 'emdia', dias: diff }
}

export default function FichaPublica() {
  const [dados, setDados] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const path = window.location.pathname
    const sap = path.split('/eq/')[1]
    if (!sap) { setErro('Equipamento não encontrado'); setLoading(false); return }
    fetch(`${API_URL}/api/pub/equipamento/${sap}`)
      .then(r => r.json())
      .then(d => { if (d.erro) setErro(d.erro); else setDados(d) })
      .catch(() => setErro('Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #C0001A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (erro) return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <AlertTriangle size={40} color="#C0001A" style={{ opacity: 0.5 }} />
      <p style={{ color: '#64748b', fontSize: 14 }}>{erro}</p>
    </div>
  )

  const estado = dados?.tipo === 'calibracao' ? getEstado(dados.dataCalibracao) : null
  const proxima = dados?.dataCalibracao ? parseData(dados.dataCalibracao) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0A0F1E, #1a0a0f)', padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <img src={logoAtm} alt="ATM" style={{ height: 28, filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
            <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Eletromedicina</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.2 }}>{dados.descricao}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace' }}>{dados.numeroSAP}</span>
            {dados.tipo === 'calibracao' && (
              <span style={{ background: 'rgba(192,0,26,0.3)', color: '#f87171', fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>Calibração</span>
            )}
            {dados.tipo === 'preventiva' && (
              <span style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>Preventiva</span>
            )}
          </div>
        </div>

        {/* Estado calibração */}
        {estado && (
          <div style={{ background: estado.bg, borderBottom: `3px solid ${estado.cor}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {estado.icon === 'emdia' && <CheckCircle size={20} color={estado.cor} />}
            {estado.icon === 'vencida' && <AlertTriangle size={20} color={estado.cor} />}
            {(estado.icon === 'urgente' || estado.icon === 'embreve') && <Clock size={20} color={estado.cor} />}
            <div>
              <p style={{ color: estado.cor, fontSize: 14, fontWeight: 800, margin: 0 }}>Calibração {estado.label}</p>
              <p style={{ color: estado.cor, fontSize: 11, margin: '2px 0 0', opacity: 0.8 }}>
                {estado.icon === 'vencida'
                  ? `Venceu há ${estado.dias} dias`
                  : estado.dias !== undefined
                    ? `${estado.dias} dias para o vencimento`
                    : ''}
              </p>
            </div>
            {proxima && (
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p style={{ color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>Próxima</p>
                <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, margin: 0 }}>{proxima.toLocaleDateString('pt-PT')}</p>
              </div>
            )}
          </div>
        )}

        {/* Detalhes */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Marca', valor: dados.marca, icon: null },
            { label: 'Modelo', valor: dados.modelo, icon: null },
            { label: 'Nº Série', valor: dados.numeroSerie, mono: true },
            { label: 'Localização', valor: dados.localizacao },
            dados.responsavel && { label: 'Responsável', valor: dados.responsavel },
            dados.periodicidade && { label: 'Periodicidade', valor: dados.periodicidade },
            dados.setor && { label: 'Setor', valor: dados.setor },
          ].filter(Boolean).map((item: any) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.label}</span>
              <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 600, fontFamily: item.mono ? 'monospace' : 'inherit', textAlign: 'right', maxWidth: '60%' }}>{item.valor || '—'}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 20px', textAlign: 'center' }}>
          <p style={{ color: '#cbd5e1', fontSize: 10, margin: 0 }}>ATM Manutenção Total · Eletromedicina · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  )
}