import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { Send, MessageSquare, Wifi, WifiOff } from 'lucide-react'

import { API_URL } from '../config'

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
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
        {nome.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

function OnlineDot() {
  return (
    <div style={{
      width: 9, height: 9, borderRadius: '50%',
      background: '#22c55e',
      border: '2px solid #fff',
      position: 'absolute', bottom: -1, right: -1,
      boxShadow: '0 0 0 1px rgba(34,197,94,0.3)',
    }} />
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const meuId = parseInt(localStorage.getItem('atm_user_id') ?? '0')

  useEffect(() => {
    const token = localStorage.getItem('atm_token')
    if (!token) return

    const s = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    s.on('connect', () => { setLigado(true); setErroLigacao(false) })
    s.on('disconnect', () => setLigado(false))
    s.on('connect_error', () => setErroLigacao(true))
    s.on('historico', (hist: Mensagem[]) => setMensagens(hist))
    s.on('mensagem', (msg: Mensagem) => setMensagens(prev => [...prev, msg]))
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
    // reset textarea height
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
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

  const grupos: { dia: string; msgs: Mensagem[] }[] = []
  for (const msg of mensagens) {
    const dia = formatarDia(msg.criado_em)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.dia === dia) ultimo.msgs.push(msg)
    else grupos.push({ dia, msgs: [msg] })
  }

  const onlineUnicos = online.reduce<UtilizadorOnline[]>((acc, u) => {
    if (!acc.find(x => x.userId === u.userId)) acc.push(u)
    return acc
  }, [])

  const podeEnviar = !!texto.trim() && ligado

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 16, minHeight: 0 }}>

      {/* Painel principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', gap: 10, background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={17} color="#C0001A" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Canal Geral</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              {ligado
                ? <><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} /><span style={{ fontSize: 11, color: '#6b7280' }}>Ligado · {onlineUnicos.length} online</span></>
                : erroLigacao
                  ? <><WifiOff size={11} color="#ef4444" /><span style={{ fontSize: 11, color: '#ef4444' }}>Sem ligação</span></>
                  : <><Wifi size={11} color="#9ca3af" /><span style={{ fontSize: 11, color: '#9ca3af' }}>A ligar...</span></>
              }
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2, background: '#fafafa' }}>
          {mensagens.length === 0 && ligado && (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 60 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <MessageSquare size={22} color="#d1d5db" />
              </div>
              <p style={{ margin: 0, fontWeight: 600, color: '#6b7280' }}>Nenhuma mensagem ainda</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Começa a conversa!</p>
            </div>
          )}

          {grupos.map(({ dia, msgs }) => (
            <div key={dia}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
                <div style={{ flex: 1, height: 1, background: '#ebebeb' }} />
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '3px 10px', background: '#fff', border: '1px solid #ebebeb', borderRadius: 99 }}>{dia}</span>
                <div style={{ flex: 1, height: 1, background: '#ebebeb' }} />
              </div>

              {msgs.map((msg, i) => {
                const minha = msg.user_id === meuId
                const anteriorMesmoUser = i > 0 && msgs[i - 1].user_id === msg.user_id
                const proximaMesmoUser = i < msgs.length - 1 && msgs[i + 1].user_id === msg.user_id
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
                    <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: minha ? 'flex-end' : 'flex-start' }}>
                      {!anteriorMesmoUser && !minha && (
                        <p style={{ fontSize: 11, fontWeight: 700, color: ROLE_COR[msg.role] ?? '#6b7280', margin: '0 0 4px 2px' }}>
                          {msg.nome}
                        </p>
                      )}
                      <div style={{
                        padding: '9px 13px',
                        borderRadius: minha
                          ? anteriorMesmoUser && proximaMesmoUser ? '14px 4px 4px 14px'
                            : anteriorMesmoUser ? '14px 4px 14px 14px'
                            : proximaMesmoUser ? '14px 14px 4px 14px'
                            : '14px 14px 4px 14px'
                          : anteriorMesmoUser && proximaMesmoUser ? '4px 14px 14px 4px'
                            : anteriorMesmoUser ? '4px 14px 14px 14px'
                            : proximaMesmoUser ? '14px 14px 4px 4px'
                            : '14px 14px 14px 4px',
                        background: minha
                          ? 'linear-gradient(135deg, #C0001A 0%, #8b0013 100%)'
                          : '#fff',
                        color: minha ? '#fff' : '#111827',
                        fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                        boxShadow: minha
                          ? '0 2px 8px rgba(192,0,26,0.25)'
                          : '0 1px 3px rgba(0,0,0,0.08)',
                        border: minha ? 'none' : '1px solid #efefef',
                      }}>
                        {msg.texto}
                      </div>
                      {!proximaMesmoUser && (
                        <p style={{ fontSize: 10, color: '#b0b7c3', margin: '3px 4px 0' }}>{formatarHora(msg.criado_em)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Indicador de "a escrever..." */}
          {typing.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '0 4px' }}>
              <div style={{ background: '#fff', border: '1px solid #efefef', borderRadius: '14px 14px 14px 4px', padding: '8px 12px', display: 'flex', gap: 4, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#c4c9d4',
                    animation: `chatBounce 1.2s ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                {typing.join(', ')} {typing.length === 1 ? 'está a escrever' : 'estão a escrever'}
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fff' }}>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => handleTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreve uma mensagem… (Enter para enviar)"
            rows={1}
            style={{
              flex: 1, padding: '10px 14px',
              border: '1.5px solid #e5e7eb', borderRadius: 10,
              fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit',
              color: '#111827', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              background: '#fafafa', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#C0001A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,0,26,0.08)'; e.currentTarget.style.background = '#fff' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fafafa' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={enviar}
            disabled={!podeEnviar}
            style={{
              width: 42, height: 42, borderRadius: 11, border: 'none', flexShrink: 0,
              background: podeEnviar ? 'linear-gradient(135deg, #C0001A 0%, #8b0013 100%)' : '#f3f4f6',
              color: podeEnviar ? '#fff' : '#9ca3af',
              cursor: podeEnviar ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: podeEnviar ? '0 2px 8px rgba(192,0,26,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (podeEnviar) (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Painel online */}
      <div style={{ width: 196, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, alignSelf: 'flex-start' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
            Online &nbsp;<span style={{ background: '#dcfce7', color: '#166534', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{onlineUnicos.length}</span>
          </p>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {onlineUnicos.length === 0 && (
            <p style={{ fontSize: 12, color: '#d1d5db', margin: 0 }}>Ninguém online</p>
          )}
          {onlineUnicos.map(u => (
            <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar nome={u.nome} role={u.role} size={30} />
                <OnlineDot />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: u.userId === meuId ? '#C0001A' : '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.nome}{u.userId === meuId ? ' (eu)' : ''}
                </p>
                <p style={{ fontSize: 10, color: ROLE_COR[u.role] ?? '#9ca3af', margin: 0, fontWeight: 500 }}>{u.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
