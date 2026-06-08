import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Send, MessageSquare, Circle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://atm-eletromedicina.onrender.com'

interface Mensagem {
  id: number
  user_id: number
  username: string
  nome: string
  role: string
  texto: string
  criado_em: string
}

interface UtilizadorOnline {
  socketId: string
  userId: number
  username: string
  nome: string
  role: string
}

interface TypingInfo {
  userId: number
  nome: string
  estado: boolean
}

const ROLE_COR: Record<string, string> = {
  admin:   '#C0001A',
  tecnico: '#0369a1',
}

function formatarHora(d: string) {
  return new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function formatarDia(d: string) {
  const data = new Date(d)
  const hoje = new Date()
  if (data.toDateString() === hoje.toDateString()) return 'Hoje'
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
  if (data.toDateString() === ontem.toDateString()) return 'Ontem'
  return data.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })
}

function Avatar({ nome, role, size = 32 }: { nome: string; role: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: ROLE_COR[role] ?? '#6b7280',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.4, fontWeight: 700, color: '#fff' }}>
        {nome.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export default function Chat() {
  const socketRef = useRef<Socket | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [online, setOnline] = useState<UtilizadorOnline[]>([])
  const [texto, setTexto] = useState('')
  const [typing, setTyping] = useState<string[]>([])
  const [ligado, setLigado] = useState(false)
  const [erroLigacao, setErroLigacao] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const meuId = parseInt(localStorage.getItem('atm_user_id') ?? '0')

  useEffect(() => {
    const token = localStorage.getItem('atm_token')
    if (!token) return

    const s = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    s.on('connect', () => { setLigado(true); setErroLigacao(false) })
    s.on('disconnect', () => setLigado(false))
    s.on('connect_error', () => setErroLigacao(true))

    s.on('historico', (hist: Mensagem[]) => setMensagens(hist))

    s.on('mensagem', (msg: Mensagem) => {
      setMensagens(prev => [...prev, msg])
    })

    s.on('online', (lista: UtilizadorOnline[]) => setOnline(lista))

    s.on('typing', ({ userId, nome, estado }: TypingInfo) => {
      if (userId === meuId) return
      setTyping(prev =>
        estado ? [...prev.filter(n => n !== nome), nome] : prev.filter(n => n !== nome)
      )
    })

    socketRef.current = s
    return () => { s.disconnect(); socketRef.current = null }
  }, [meuId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, typing])

  const enviar = useCallback(() => {
    const socket = socketRef.current
    if (!texto.trim() || !socket) return
    socket.emit('mensagem', texto.trim())
    socket.emit('typing', false)
    setTexto('')
    if (typingTimer.current) clearTimeout(typingTimer.current)
  }, [texto])

  function handleTexto(val: string) {
    setTexto(val)
    const socket = socketRef.current
    if (!socket) return
    socket.emit('typing', true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socket.emit('typing', false), 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  // Agrupa mensagens por dia
  const grupos: { dia: string; msgs: Mensagem[] }[] = []
  for (const msg of mensagens) {
    const dia = formatarDia(msg.criado_em)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.dia === dia) ultimo.msgs.push(msg)
    else grupos.push({ dia, msgs: [msg] })
  }

  // Utilizadores online únicos (pode haver vários sockets do mesmo user)
  const onlineUnicos = online.reduce<UtilizadorOnline[]>((acc, u) => {
    if (!acc.find(x => x.userId === u.userId)) acc.push(u)
    return acc
  }, [])

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 16, minHeight: 0 }}>

      {/* Painel principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
          <MessageSquare size={18} color="#C0001A" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Canal Geral</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
              {ligado
                ? <><Circle size={7} fill="#22c55e" color="#22c55e" style={{ verticalAlign: 'middle', marginRight: 4 }} />Ligado · {onlineUnicos.length} online</>
                : erroLigacao ? '⚠️ Sem ligação ao servidor' : 'A ligar...'}
            </p>
          </div>
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mensagens.length === 0 && ligado && (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 40 }}>
              <MessageSquare size={32} color="#e5e7eb" style={{ display: 'block', margin: '0 auto 8px' }} />
              Nenhuma mensagem ainda. Começa a conversa!
            </div>
          )}

          {grupos.map(({ dia, msgs }) => (
            <div key={dia}>
              {/* Separador de dia */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px' }}>
                <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '2px 10px', background: '#f9fafb', borderRadius: 99 }}>{dia}</span>
                <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
              </div>

              {msgs.map((msg, i) => {
                const minha = msg.user_id === meuId
                const anteriorMesmoUser = i > 0 && msgs[i - 1].user_id === msg.user_id
                return (
                  <div key={msg.id} style={{
                    display: 'flex', gap: 10, marginTop: anteriorMesmoUser ? 2 : 10,
                    flexDirection: minha ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                  }}>
                    {!minha && (
                      anteriorMesmoUser
                        ? <div style={{ width: 32, flexShrink: 0 }} />
                        : <Avatar nome={msg.nome} role={msg.role} />
                    )}
                    <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: minha ? 'flex-end' : 'flex-start' }}>
                      {!anteriorMesmoUser && !minha && (
                        <p style={{ fontSize: 11, fontWeight: 700, color: ROLE_COR[msg.role] ?? '#6b7280', margin: '0 0 3px 2px' }}>
                          {msg.nome}
                        </p>
                      )}
                      <div style={{
                        padding: '8px 12px', borderRadius: minha ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: minha ? '#C0001A' : '#f3f4f6',
                        color: minha ? '#fff' : '#111827',
                        fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      }}>
                        {msg.texto}
                      </div>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 4px 0' }}>{formatarHora(msg.criado_em)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Indicador de "a escrever..." */}
          {typing.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '0 4px' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#9ca3af',
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                {typing.join(', ')} {typing.length === 1 ? 'está a escrever...' : 'estão a escrever...'}
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={texto}
            onChange={e => handleTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreve uma mensagem... (Enter para enviar)"
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10,
              fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit',
              color: '#111827', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={enviar}
            disabled={!texto.trim() || !ligado}
            style={{
              width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0,
              background: texto.trim() && ligado ? '#C0001A' : '#e5e7eb',
              color: texto.trim() && ligado ? '#fff' : '#9ca3af',
              cursor: texto.trim() && ligado ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Painel online */}
      <div style={{ width: 200, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, alignSelf: 'flex-start' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
          Online ({onlineUnicos.length})
        </p>
        {onlineUnicos.length === 0 && (
          <p style={{ fontSize: 13, color: '#d1d5db', margin: 0 }}>Ninguém online</p>
        )}
        {onlineUnicos.map(u => (
          <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Avatar nome={u.nome} role={u.role} size={28} />
              <Circle size={8} fill="#22c55e" color="#fff" style={{ position: 'absolute', bottom: 0, right: 0 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: u.userId === meuId ? '#C0001A' : '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.nome}{u.userId === meuId ? ' (eu)' : ''}
              </p>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{u.role}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
