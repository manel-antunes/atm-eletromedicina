import { useState } from 'react'
import { Lock, CheckCircle, AlertCircle, Loader2, Pencil } from 'lucide-react'

import { API_URL } from '../config'

function getToken() { return localStorage.getItem('atm_token') ?? '' }

interface MsgState { tipo: 'sucesso' | 'erro'; texto: string }

export default function Perfil() {
  const [nome, setNomeState] = useState(localStorage.getItem('atm_nome') ?? '')
  const username = localStorage.getItem('atm_username') ?? ''
  const role = localStorage.getItem('atm_role') ?? 'tecnico'

  // ── Alterar nome ──────────────────────────────────────────
  const [nomeInput, setNomeInput] = useState(nome)
  const [carregandoNome, setCarregandoNome] = useState(false)
  const [msgNome, setMsgNome] = useState<MsgState | null>(null)

  async function handleAlterarNome(e: React.FormEvent) {
    e.preventDefault()
    if (nomeInput.trim() === nome) { setMsgNome({ tipo: 'erro', texto: 'O nome não foi alterado.' }); return }
    setCarregandoNome(true)
    setMsgNome(null)
    try {
      const res = await fetch(`${API_URL}/api/perfil/nome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ nome: nomeInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao alterar nome')
      const novoNome = data.nome as string
      setNomeState(novoNome)
      localStorage.setItem('atm_nome', novoNome)
      setMsgNome({ tipo: 'sucesso', texto: 'Nome atualizado com sucesso.' })
    } catch (err: unknown) {
      setMsgNome({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Erro desconhecido' })
    } finally {
      setCarregandoNome(false)
    }
  }

  // ── Alterar password ──────────────────────────────────────
  const [passwordAtual, setPasswordAtual] = useState('')
  const [passwordNova, setPasswordNova] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [carregandoPass, setCarregandoPass] = useState(false)
  const [msgPass, setMsgPass] = useState<MsgState | null>(null)

  function validarPassword(pwd: string): string | null {
    if (pwd.length < 8)             return 'Mínimo 8 caracteres.'
    if (!/[A-Z]/.test(pwd))         return 'Pelo menos uma maiúscula.'
    if (!/[0-9]/.test(pwd))         return 'Pelo menos um número.'
    if (!/[^A-Za-z0-9]/.test(pwd))  return 'Pelo menos um caractere especial.'
    return null
  }

  async function handleAlterarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordNova !== passwordConfirm) { setMsgPass({ tipo: 'erro', texto: 'As passwords novas não coincidem.' }); return }
    const erroPass = validarPassword(passwordNova)
    if (erroPass) { setMsgPass({ tipo: 'erro', texto: erroPass }); return }
    setCarregandoPass(true)
    setMsgPass(null)
    try {
      const res = await fetch(`${API_URL}/api/perfil/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ passwordAtual, passwordNova }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao alterar password')
      setMsgPass({ tipo: 'sucesso', texto: 'Password alterada com sucesso.' })
      setPasswordAtual(''); setPasswordNova(''); setPasswordConfirm('')
    } catch (err: unknown) {
      setMsgPass({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Erro desconhecido' })
    } finally {
      setCarregandoPass(false)
    }
  }

  const roleBadge: Record<string, { label: string; cor: string; bg: string }> = {
    admin:   { label: 'Administrador', cor: '#C0001A', bg: '#fef2f2' },
    tecnico: { label: 'Técnico',       cor: '#0369a1', bg: '#eff6ff' },
  }
  const badge = roleBadge[role] ?? roleBadge.tecnico

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Cabeçalho */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #C0001A, #8b0013)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(192,0,26,0.25)' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{nome.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{nome}</p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 8px' }}>@{username}</p>
          <span style={{ background: badge.bg, color: badge.cor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Alterar nome */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Pencil size={17} color="#C0001A" />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Alterar Nome</p>
        </div>

        <form onSubmit={handleAlterarNome} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nome completo
            </label>
            <input
              type="text"
              value={nomeInput}
              onChange={e => setNomeInput(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14,
                outline: 'none', color: '#111827', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#C0001A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,0,26,0.08)' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {msgNome && <Feedback msg={msgNome} />}

          <button type="submit" disabled={carregandoNome || nomeInput.trim().length < 2} style={{
            padding: '10px 20px', background: carregandoNome ? '#9ca3af' : '#C0001A', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: carregandoNome ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            alignSelf: 'flex-start',
          }}>
            {carregandoNome && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            Guardar nome
          </button>
        </form>
      </div>

      {/* Alterar password */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Lock size={17} color="#C0001A" />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Alterar Password</p>
        </div>

        <form onSubmit={handleAlterarPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['passwordAtual', 'passwordNova', 'passwordConfirm'] as const).map((campo) => {
            const labels = { passwordAtual: 'Password atual', passwordNova: 'Nova password', passwordConfirm: 'Confirmar nova password' }
            const valores = { passwordAtual, passwordNova, passwordConfirm }
            const setters = { passwordAtual: setPasswordAtual, passwordNova: setPasswordNova, passwordConfirm: setPasswordConfirm }
            return (
              <div key={campo}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  {labels[campo]}
                </label>
                <input
                  type="password"
                  value={valores[campo]}
                  onChange={e => setters[campo](e.target.value)}
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                    border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14,
                    outline: 'none', color: '#111827', transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#C0001A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,0,26,0.08)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            )
          })}

          {msgPass && <Feedback msg={msgPass} />}

          <button type="submit" disabled={carregandoPass} style={{
            padding: '10px 20px', background: carregandoPass ? '#9ca3af' : '#C0001A', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: carregandoPass ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            alignSelf: 'flex-start',
          }}>
            {carregandoPass && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            Guardar password
          </button>
        </form>
      </div>
    </div>
  )
}

function Feedback({ msg }: { msg: { tipo: 'sucesso' | 'erro'; texto: string } }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
      background: msg.tipo === 'sucesso' ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${msg.tipo === 'sucesso' ? '#bbf7d0' : '#fecaca'}`,
      color: msg.tipo === 'sucesso' ? '#166534' : '#991b1b', fontSize: 13,
    }}>
      {msg.tipo === 'sucesso' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {msg.texto}
    </div>
  )
}
