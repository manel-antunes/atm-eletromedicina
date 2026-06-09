import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { subscreverPush, cancelarPush, temPermissao } from '../services/pushService'

interface Props {
  compacto?: boolean
}

export default function NotificacoesPush({ compacto = false }: Props) {
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

  const textoBotao = loading ? 'A processar...' : ativo ? 'Notificacoes ativas' : 'Ativar notificacoes'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={ativo ? 'Desativar notificacoes' : 'Ativar notificacoes push'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compacto ? 0 : 8,
        background: ativo ? 'rgba(192,0,26,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${ativo ? 'rgba(192,0,26,0.4)' : 'rgba(255,255,255,0.1)'}`,
        padding: compacto ? '8px' : '7px 12px',
        cursor: 'pointer',
        color: ativo ? '#f87171' : 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: 600,
        transition: 'all 0.2s',
        width: '100%',
      }}
    >
      {ativo ? <Bell size={13} /> : <BellOff size={13} />}
      {!compacto && textoBotao}
    </button>
  )
}
