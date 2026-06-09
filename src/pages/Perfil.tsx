import { useState } from 'react'
import { User, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

import { API_URL } from '../config'

function getToken() { return localStorage.getItem('atm_token') ?? '' }

export default function Perfil() {
  const nome = localStorage.getItem('atm_nome') ?? ''
  const username = localStorage.getItem('atm_username') ?? ''
  const role = localStorage.getItem('atm_role') ?? 'tecnico'

  const [passwordAtual, setPasswordAtual] = useState('')
  const [passwordNova, setPasswordNova] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  function validarPassword(pwd: string): string | null {
    if (pwd.length < 8)             return 'Mínimo 8 caracteres.'
    if (!/[A-Z]/.test(pwd))         return 'Pelo menos uma maiúscula.'
    if (!/[0-9]/.test(pwd))         return 'Pelo menos um número.'
    if (!/[^A-Za-z0-9]/.test(pwd))  return 'Pelo menos um caractere especial.'
    return null
  }

  async function handleAlterarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordNova !== passwordConfirm) {
      setMensagem({ tipo: 'erro', texto: 'As passwords novas não coincidem.' })
      return
    }
    const erroPass = validarPassword(passwordNova)
    if (erroPass) {
      setMensagem({ tipo: 'erro', texto: erroPass })
      return
    }
    setCarregando(true)
    setMensagem(null)
    try {
      const res = await fetch(`${API_URL}/api/perfil/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ passwordAtual, passwordNova }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao alterar password')
      setMensagem({ tipo: 'sucesso', texto: 'Password alterada com sucesso.' })
      setPasswordAtual('')
      setPasswordNova('')
      setPasswordConfirm('')
    } catch (err: unknown) {
      setMensagem({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Erro desconhecido' })
    } finally {
      setCarregando(false)
    }
  }

  const roleBadge: Record<string, { label: string; cor: string; bg: string }> = {
    admin:   { label: 'Administrador', cor: '#C0001A', bg: '#fef2f2' },
    tecnico: { label: 'Técnico',       cor: '#0369a1', bg: '#eff6ff' },
  }
  const badge = roleBadge[role] ?? roleBadge.tecnico

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cabeçalho */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#C0001A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={32} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{nome}</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '2px 0 8px' }}>@{username}</p>
          <span style={{ background: badge.bg, color: badge.cor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, letterSpacing: '0.05em' }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Alterar password */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Lock size={18} color="#C0001A" />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Alterar Password</p>
        </div>

        <form onSubmit={handleAlterarPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['passwordAtual', 'passwordNova', 'passwordConfirm'] as const).map((campo) => {
            const labels = { passwordAtual: 'Password atual', passwordNova: 'Nova password', passwordConfirm: 'Confirmar nova password' }
            const valores = { passwordAtual, passwordNova, passwordConfirm }
            const setters = {
              passwordAtual: setPasswordAtual,
              passwordNova: setPasswordNova,
              passwordConfirm: setPasswordConfirm,
            }
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
                    border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
                    outline: 'none', color: '#111827',
                  }}
                />
              </div>
            )
          })}

          {mensagem && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
              background: mensagem.tipo === 'sucesso' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${mensagem.tipo === 'sucesso' ? '#bbf7d0' : '#fecaca'}`,
              color: mensagem.tipo === 'sucesso' ? '#166534' : '#991b1b', fontSize: 13 }}>
              {mensagem.tipo === 'sucesso' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {mensagem.texto}
            </div>
          )}

          <button type="submit" disabled={carregando} style={{
            padding: '10px 20px', background: carregando ? '#9ca3af' : '#C0001A', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: carregando ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {carregando && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            Guardar password
          </button>
        </form>
      </div>
    </div>
  )
}
