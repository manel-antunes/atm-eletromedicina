const CACHE_NAME = 'atm-v2'
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

// ── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── FETCH (cache) ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ── PUSH ──────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.titulo ?? 'ATM Eletromedicina', {
      body: data.corpo ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'atm-alerta',
      renotify: true,
      data: { url: data.url ?? '/' },
      actions: [
        { action: 'ver', title: 'Ver detalhes' },
        { action: 'fechar', title: 'Fechar' },
      ],
    })
  )
})

// ── NOTIFICATION CLICK ────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'fechar') return
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const url = event.notification.data?.url ?? '/'
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})