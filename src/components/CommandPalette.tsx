import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, ClipboardCheck, Package, ArrowLeftRight, FileText, Brain, FolderOpen, Phone, Map, Calendar, QrCode, Stethoscope, Search, X } from 'lucide-react'

const ITENS = [
  { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard, desc: 'Visão geral e KPIs' },
  { id: 'calibracoes', label: 'Calibrações',     icon: ClipboardCheck,  desc: 'Gestão de calibrações' },
  { id: 'inventario',  label: 'Inventário',      icon: Package,         desc: 'Lista de equipamentos' },
  { id: 'cedencias',   label: 'Cedências',       icon: ArrowLeftRight,  desc: 'Empréstimos de equipamentos' },
  { id: 'relatorios',  label: 'Relatórios',      icon: FileText,        desc: 'Exportar e enviar relatórios' },
  { id: 'ia',          label: 'Análise IA',      icon: Brain,           desc: 'Descrições técnicas automáticas' },
  { id: 'calendario',  label: 'Calendário',      icon: Calendar,        desc: 'Plano anual HPRT' },
  { id: 'documentos',  label: 'Documentos',      icon: FolderOpen,      desc: 'Certificados e ficheiros' },
  { id: 'contactos',   label: 'Contactos',       icon: Phone,           desc: 'Fornecedores e marcas' },
  { id: 'mapa',        label: 'Mapa',            icon: Map,             desc: 'Localização dos equipamentos' },
  { id: 'qrcodes',     label: 'QR Codes',        icon: QrCode,          desc: 'Gerar e imprimir QR codes' },
  { id: 'preventivas', label: 'Preventivas',     icon: Stethoscope,     desc: 'Plano de manutenções preventivas' },
]

interface Props {
  aberto: boolean
  onFechar: () => void
  onNavegar: (pagina: string) => void
}

export default function CommandPalette({ aberto, onFechar, onNavegar }: Props) {
  const [pesquisa, setPesquisa] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtrados = ITENS.filter(item =>
    pesquisa === '' ||
    item.label.toLowerCase().includes(pesquisa.toLowerCase()) ||
    item.desc.toLowerCase().includes(pesquisa.toLowerCase())
  )

  useEffect(() => {
    if (aberto) {
      setPesquisa('')
      setSelecionado(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  useEffect(() => { setSelecionado(0) }, [pesquisa])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelecionado(s => Math.min(s + 1, filtrados.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelecionado(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && filtrados[selecionado]) { onNavegar(filtrados[selecionado].id); onFechar() }
    if (e.key === 'Escape') onFechar()
  }

  if (!aberto) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div style={{ background: '#fff', width: '100%', maxWidth: 560, boxShadow: '0 40px 100px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'palette-in 0.15s ease-out' }}>
        <style>{`
          @keyframes palette-in {
            from { opacity: 0; transform: scale(0.97) translateY(-8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <Search size={16} color="#94a3b8" />
          <input
            ref={inputRef}
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Navegar para..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: '#0f172a', background: 'transparent' }}
          />
          {pesquisa && (
            <button onClick={() => setPesquisa('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={14} />
            </button>
          )}
          <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>ESC</kbd>
        </div>

        {/* Resultados */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 8px' }}>
          {filtrados.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>Nenhum resultado</p>
          ) : (
            filtrados.map((item, idx) => {
              const Icon = item.icon
              const ativo = idx === selecionado
              return (
                <div
                  key={item.id}
                  onClick={() => { onNavegar(item.id); onFechar() }}
                  onMouseEnter={() => setSelecionado(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', cursor: 'pointer',
                    background: ativo ? '#f8fafc' : 'transparent',
                    border: ativo ? '1px solid #e2e8f0' : '1px solid transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ width: 36, height: 36, background: ativo ? '#C0001A' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                    <Icon size={16} color={ativo ? '#fff' : '#64748b'} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{item.desc}</p>
                  </div>
                  {ativo && (
                    <kbd style={{ marginLeft: 'auto', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>↵</kbd>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16 }}>
          {[['↑↓', 'navegar'], ['↵', 'selecionar'], ['ESC', 'fechar']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{key}</kbd>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}