import { API_URL } from '../config'
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''
function getToken() {
  return localStorage.getItem('token') ?? ''
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  }
}

export async function registarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    console.log('✅ Service Worker registado')
    return reg
  } catch (err) {
    console.error('❌ Erro ao registar SW:', err)
    return null
  }
}

export async function pedirPermissao(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const resultado = await Notification.requestPermission()
  return resultado === 'granted'
}

export function temPermissao(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0))).buffer
}

export async function subscreverPush(): Promise<boolean> {
  const reg = await registarServiceWorker()
  if (!reg) return false

  const permissao = await pedirPermissao()
  if (!permissao) return false

  try {
    const subscricao = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })

    const res = await fetch(`${API_URL}/api/push/subscrever`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(subscricao),
    })

    return res.ok
  } catch (err) {
    console.error('Erro ao subscrever push:', err)
    return false
  }
}

export async function cancelarPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}

export async function notificarAlertas(alertas: { vencidas: number; urgentes: number; emBreve: number }): Promise<void> {
  await fetch(`${API_URL}/api/push/notificar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(alertas),
  })
}