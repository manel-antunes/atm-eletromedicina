import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { subscreverPush, cancelarPush, temPermissao } from '../services/pushService'

export default function NotificacoesPush() {
  const [ativo, setAtivo] = useState(false)
  const [loading, setLoading] = useState(false)   

  useEffect(() => {
    setAtivo(temPermissao())
  }, [])

  async function toggle() {
    setLoading(true)
    if (ativo) {
      await cancelarPush()
      setAtivo(false)
    } else {
      const ok = await subscreverPush()
      setAtivo(ok)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={ativo ? 'Desativar notificações' : 'Ativar notificações push'}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: ativo ? 'rgba(192,0,26,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${ativo ? 'rgba(192,0,26,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
        color: ativo ? '#f87171' : 'rgba(255,255,255,0.4)',
        fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
        width: '100%',
      }}
    >
      {ativo ? <Bell size={13} /> : <BellOff size={13} />}
      {loading ? 'A processar...' : ativo ? 'Notificações ativas' : 'Ativar notificações'}
    </button>
  )
}