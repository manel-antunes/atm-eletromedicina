import { API_URL } from '../config'

const CHAVES_AUTH = ['atm_token', 'atm_refresh_token', 'atm_nome', 'atm_username', 'atm_role', 'atm_user_id']

let a_refrescar: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  // Evitar múltiplos refreshes simultâneos
  if (a_refrescar) return a_refrescar

  a_refrescar = (async () => {
    const rt = localStorage.getItem('atm_refresh_token')
    if (!rt) return null

    try {
      const res = await fetch(`${API_URL}/api/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })

      if (!res.ok) {
        CHAVES_AUTH.forEach(k => localStorage.removeItem(k))
        window.dispatchEvent(new Event('atm:logout'))
        return null
      }

      const data = await res.json()
      localStorage.setItem('atm_token', data.token)
      localStorage.setItem('atm_refresh_token', data.refreshToken)
      return data.token as string
    } catch {
      return null
    } finally {
      a_refrescar = null
    }
  })()

  return a_refrescar
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const comToken = (token: string): RequestInit => ({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  const token = localStorage.getItem('atm_token') ?? ''
  const res = await fetch(url, comToken(token))

  if (res.status !== 401) return res

  const novoToken = await tryRefresh()
  if (!novoToken) return res

  return fetch(url, comToken(novoToken))
}
