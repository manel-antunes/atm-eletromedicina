import { useState, useEffect, useCallback } from 'react'
import { Users, ShieldCheck, Activity, Plus, Edit2, Trash2, Eye, EyeOff, Check, X, Loader2, RefreshCw, LogOut, Download, ChevronLeft, ChevronRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://atm-eletromedicina.onrender.com'

function getToken() { return localStorage.getItem('atm_token') ?? '' }
function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

interface User {
  id: number
  username: string
  nome: string
  role: 'admin' | 'tecnico'
  email: string | null
  ativo: boolean
  criado_em: string
  ultimo_login: string | null
}

function validarPassword(pwd: string): string | null {
  if (pwd.length < 8)             return 'Mínimo 8 caracteres.'
  if (!/[A-Z]/.test(pwd))         return 'Pelo menos uma maiúscula.'
  if (!/[0-9]/.test(pwd))         return 'Pelo menos um número.'
  if (!/[^A-Za-z0-9]/.test(pwd))  return 'Pelo menos um caractere especial.'
  return null
}

function ForcaPassword({ pwd }: { pwd: string }) {
  if (!pwd) return null
  const checks = [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)]
  const score = checks.filter(Boolean).length
  const cor = score <= 1 ? '#ef4444' : score === 2 ? '#f97316' : score === 3 ? '#eab308' : '#22c55e'
  const label = score <= 1 ? 'Fraca' : score === 2 ? 'Razoável' : score === 3 ? 'Boa' : 'Forte'
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? cor : '#e5e7eb', transition: 'background 0.2s' }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: cor, margin: 0 }}>{label}</p>
    </div>
  )
}

interface Sessao {
  id: number
  username: string
  nome: string
  device_info: string
  ip: string
  criado_em: string
  expira_em: string
}

interface AuditEntry {
  id: number
  username: string
  acao: string
  entidade: string | null
  entidade_id: string | null
  ip: string
  user_agent: string | null
  criado_em: string
}

interface AuditPaginado {
  total: number
  pagina: number
  porPagina: number
  registos: AuditEntry[]
}

type Tab = 'utilizadores' | 'sessoes' | 'audit'

const ROLE_BADGE: Record<string, { label: string; cor: string; bg: string }> = {
  admin:   { label: 'Admin',   cor: '#C0001A', bg: '#fef2f2' },
  tecnico: { label: 'Técnico', cor: '#0369a1', bg: '#eff6ff' },
}

function Badge({ role }: { role: string }) {
  const b = ROLE_BADGE[role] ?? ROLE_BADGE.tecnico
  return (
    <span style={{ background: b.bg, color: b.cor, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>
      {b.label}
    </span>
  )
}

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Administracao() {
  const [tab, setTab] = useState<Tab>('utilizadores')
  const [users, setUsers] = useState<User[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [audit, setAudit] = useState<AuditPaginado>({ total: 0, pagina: 1, porPagina: 50, registos: [] })
  const [auditFiltroUser, setAuditFiltroUser] = useState('')
  const [auditFiltroAcao, setAuditFiltroAcao] = useState('')
  const [auditFiltroDe, setAuditFiltroDe] = useState('')
  const [auditFiltroAte, setAuditFiltroAte] = useState('')
  const [auditPagina, setAuditPagina] = useState(1)
  const [carregando, setCarregando] = useState(false)

  // form novo utilizador
  const [modalAberto, setModalAberto] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'tecnico'>('tecnico')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [mostrarPass, setMostrarPass] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const carregarUsers = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers: getHeaders() })
      setUsers(await res.json())
    } finally { setCarregando(false) }
  }, [])

  const carregarSessoes = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`${API_URL}/api/sessoes`, { headers: getHeaders() })
      setSessoes(await res.json())
    } finally { setCarregando(false) }
  }, [])

  const carregarAudit = useCallback(async (pagina = 1) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ pagina: String(pagina), porPagina: '50' })
      if (auditFiltroUser) params.set('username', auditFiltroUser)
      if (auditFiltroAcao) params.set('acao', auditFiltroAcao)
      if (auditFiltroDe)   params.set('de', auditFiltroDe)
      if (auditFiltroAte)  params.set('ate', auditFiltroAte)
      const res = await fetch(`${API_URL}/api/audit?${params}`, { headers: getHeaders() })
      setAudit(await res.json())
      setAuditPagina(pagina)
    } finally { setCarregando(false) }
  }, [auditFiltroUser, auditFiltroAcao, auditFiltroDe, auditFiltroAte])

  function exportarCSV() {
    const params = new URLSearchParams({ formato: 'csv', porPagina: '200' })
    if (auditFiltroUser) params.set('username', auditFiltroUser)
    if (auditFiltroAcao) params.set('acao', auditFiltroAcao)
    if (auditFiltroDe)   params.set('de', auditFiltroDe)
    if (auditFiltroAte)  params.set('ate', auditFiltroAte)
    const url = `${API_URL}/api/audit?${params}`
    fetch(url, { headers: getHeaders() })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'audit_log.csv'
        a.click()
      })
  }

  useEffect(() => {
    if (tab === 'utilizadores') carregarUsers()
    else if (tab === 'sessoes') carregarSessoes()
    else carregarAudit(1)
  }, [tab])

  function abrirNovoUser() {
    setEditUser(null)
    setFormNome(''); setFormUsername(''); setFormRole('tecnico'); setFormEmail(''); setFormPassword(''); setErroForm('')
    setModalAberto(true)
  }

  function abrirEditUser(u: User) {
    setEditUser(u)
    setFormNome(u.nome); setFormUsername(u.username); setFormRole(u.role); setFormEmail(u.email ?? ''); setFormPassword(''); setErroForm('')
    setModalAberto(true)
  }

  async function guardarUser() {
    if (!formNome || !formUsername) { setErroForm('Nome e username são obrigatórios.'); return }
    if (!editUser && !formPassword) { setErroForm('Password obrigatória para novo utilizador.'); return }
    if (formPassword) {
      const erroPass = validarPassword(formPassword)
      if (erroPass) { setErroForm(erroPass); return }
    }
    setSalvando(true); setErroForm('')
    try {
      if (editUser) {
        const body: Record<string, string | boolean> = { nome: formNome, role: formRole, email: formEmail }
        if (formPassword) body.password = formPassword
        const res = await fetch(`${API_URL}/api/users/${editUser.id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) })
        if (!res.ok) throw new Error((await res.json()).erro)
      } else {
        const res = await fetch(`${API_URL}/api/users`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ username: formUsername, password: formPassword, nome: formNome, role: formRole, email: formEmail }) })
        if (!res.ok) throw new Error((await res.json()).erro)
      }
      setModalAberto(false)
      carregarUsers()
    } catch (err: unknown) {
      setErroForm(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally { setSalvando(false) }
  }

  async function toggleAtivo(u: User) {
    await fetch(`${API_URL}/api/users/${u.id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ ativo: !u.ativo }) })
    carregarUsers()
  }

  async function revogarSessao(id: number) {
    await fetch(`${API_URL}/api/sessoes/${id}`, { method: 'DELETE', headers: getHeaders() })
    carregarSessoes()
  }

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'utilizadores', label: 'Utilizadores', icon: Users },
    { id: 'sessoes',      label: 'Sessões Ativas', icon: LogOut },
    { id: 'audit',        label: 'Audit Log', icon: Activity },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, background: '#fff', padding: 6, borderRadius: 12, border: '1px solid #e5e7eb', width: 'fit-content' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const ativo = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: ativo ? '#C0001A' : 'transparent',
              color: ativo ? '#fff' : '#6b7280',
              transition: 'all 0.15s',
            }}>
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {/* Header da tabela */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="#C0001A" />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
              {tab === 'utilizadores' ? `Utilizadores (${users.length})` : tab === 'sessoes' ? `Sessões Ativas (${sessoes.length})` : `Audit Log (${audit.total} entradas)`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {tab === 'audit' && (<>
              <input value={auditFiltroUser} onChange={e => setAuditFiltroUser(e.target.value)} placeholder="Utilizador..." style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, width: 120 }} />
              <input value={auditFiltroAcao} onChange={e => setAuditFiltroAcao(e.target.value)} placeholder="Ação..." style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, width: 130 }} />
              <input type="date" value={auditFiltroDe} onChange={e => setAuditFiltroDe(e.target.value)} style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12 }} />
              <input type="date" value={auditFiltroAte} onChange={e => setAuditFiltroAte(e.target.value)} style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12 }} />
              <button onClick={() => carregarAudit(1)} style={{ padding: '6px 12px', background: '#C0001A', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Filtrar</button>
              <button onClick={exportarCSV} title="Exportar CSV" style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#374151' }}>
                <Download size={13} /> CSV
              </button>
            </>)}
            <button onClick={() => { if (tab === 'utilizadores') carregarUsers(); else if (tab === 'sessoes') carregarSessoes(); else carregarAudit(auditPagina) }}
              style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
              <RefreshCw size={14} style={carregando ? { animation: 'spin 1s linear infinite' } : {}} />
              Atualizar
            </button>
            {tab === 'utilizadores' && (
              <button onClick={abrirNovoUser} style={{ padding: '6px 14px', background: '#C0001A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                <Plus size={14} /> Novo Utilizador
              </button>
            )}
          </div>
        </div>

        {/* Tabela utilizadores */}
        {tab === 'utilizadores' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Nome', 'Username', 'Role', 'Estado', 'Último Login', 'Ações'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{u.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>@{u.username}</td>
                    <td style={{ padding: '12px 16px' }}><Badge role={u.role} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: u.ativo ? '#f0fdf4' : '#f9fafb', color: u.ativo ? '#166534' : '#9ca3af', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{formatarData(u.ultimo_login)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => abrirEditUser(u)} title="Editar" style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => toggleAtivo(u)} title={u.ativo ? 'Desativar' : 'Ativar'} style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: u.ativo ? '#dc2626' : '#16a34a' }}>
                          {u.ativo ? <X size={13} /> : <Check size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabela sessões */}
        {tab === 'sessoes' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Utilizador', 'Dispositivo', 'IP', 'Iniciada em', 'Expira em', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessoes.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{s.nome}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>@{s.username}</p>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', maxWidth: 220 }}>
                      <span title={s.device_info} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.device_info || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{s.ip || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{formatarData(s.criado_em)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{formatarData(s.expira_em)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => revogarSessao(s.id)} title="Revogar sessão"
                        style={{ padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Trash2 size={12} /> Revogar
                      </button>
                    </td>
                  </tr>
                ))}
                {sessoes.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Sem sessões ativas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit log */}
        {tab === 'audit' && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Data', 'Utilizador', 'Ação', 'Entidade', 'IP', 'Dispositivo'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.registos.map(a => (
                    <tr key={a.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatarData(a.criado_em)}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#374151', fontWeight: 600 }}>{a.username}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: a.acao.includes('FALHOU') ? '#fef2f2' : '#f3f4f6', color: a.acao.includes('FALHOU') ? '#dc2626' : '#374151', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>
                          {a.acao}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#9ca3af' }}>
                        {a.entidade ? `${a.entidade}${a.entidade_id ? ` #${a.entidade_id}` : ''}` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{a.ip || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#9ca3af', maxWidth: 200 }}>
                        <span title={a.user_agent ?? ''} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.user_agent || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {audit.registos.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Sem registos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {audit.total > audit.porPagina && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  {((auditPagina - 1) * audit.porPagina) + 1}–{Math.min(auditPagina * audit.porPagina, audit.total)} de {audit.total}
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => carregarAudit(auditPagina - 1)} disabled={auditPagina === 1}
                    style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#fff', cursor: auditPagina === 1 ? 'not-allowed' : 'pointer', color: auditPagina === 1 ? '#d1d5db' : '#374151', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => carregarAudit(auditPagina + 1)} disabled={auditPagina * audit.porPagina >= audit.total}
                    style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#fff', cursor: auditPagina * audit.porPagina >= audit.total ? 'not-allowed' : 'pointer', color: auditPagina * audit.porPagina >= audit.total ? '#d1d5db' : '#374151', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal criar/editar utilizador */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                {editUser ? 'Editar Utilizador' : 'Novo Utilizador'}
              </p>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nome completo', value: formNome, setter: setFormNome, disabled: false },
                { label: 'Username', value: formUsername, setter: setFormUsername, disabled: !!editUser },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <input value={f.value} onChange={e => f.setter(e.target.value)} disabled={f.disabled}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: f.disabled ? '#f9fafb' : '#fff', color: '#111827' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email (opcional)</label>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111827' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Role</label>
                <select value={formRole} onChange={e => setFormRole(e.target.value as 'admin' | 'tecnico')}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#111827' }}>
                  <option value="tecnico">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  {editUser ? 'Nova password (deixar vazio para manter)' : 'Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={mostrarPass ? 'text' : 'password'} value={formPassword} onChange={e => setFormPassword(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 36px 9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111827' }} />
                  <button type="button" onClick={() => setMostrarPass(!mostrarPass)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                    {mostrarPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <ForcaPassword pwd={formPassword} />
              </div>

              {erroForm && (
                <p style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 8, margin: 0 }}>{erroForm}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button onClick={guardarUser} disabled={salvando} style={{ flex: 1, padding: '10px', background: salvando ? '#9ca3af' : '#C0001A', color: '#fff', border: 'none', borderRadius: 8, cursor: salvando ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {salvando && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
