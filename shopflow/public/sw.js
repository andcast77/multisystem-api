// Service Worker for ShopFlow POS
// Handles push notifications and offline functionality

const CACHE_VERSION = 'v3'
const CACHE_NAME = `shopflow-pos-${CACHE_VERSION}`
const DATA_CACHE_NAME = `shopflow-data-${CACHE_VERSION}`
const OFFLINE_QUEUE = 'offline-queue'

// Critical routes to cache on install - Expanded for immediate offline functionality
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/offline',
  '/manifest.json',
  // Páginas principales
  '/products',
  '/products/new',
  '/customers',
  '/customers/new',
  '/sales',
  '/categories',
  '/suppliers',
  '/settings',
  '/inventory',
  '/inventory/adjustments',
  '/pos',
  '/reports',
  // Iconos y recursos estáticos
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/logo/favicon/favicon-48x48.png',
]

// Critical Next.js assets that should be precached
// These are typically generated during build and should be discovered dynamically
const CRITICAL_NEXT_ASSETS = [
  // CSS files
  '/_next/static/css/',
  // Font files
  '/_next/static/media/',
]

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  '/api/products',
  '/api/categories',
  '/api/customers',
  '/api/suppliers',
  '/api/store-config',
  '/api/ticket-config',
]

// API endpoints that support offline queue - Expanded for all CRUD operations
const OFFLINE_QUEUE_PATTERNS = [
  '/api/sales',
  '/api/products',
  '/api/customers',
  '/api/categories',
  '/api/suppliers',
  '/api/inventory',
  // Add more patterns as needed
]

// Priority mapping for queue items
function getQueuePriority(url, method) {
  // Sales are always high priority
  if (url.includes('/api/sales')) {
    return 'high'
  }
  // DELETE operations are high priority
  if (method === 'DELETE') {
    return 'high'
  }
  // POST/PUT/PATCH are normal priority
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    return 'normal'
  }
  return 'low'
}

// Precaching API data function with retries and higher limits
async function precacheAPIData() {
  const cache = await caches.open(DATA_CACHE_NAME)
  const apiEndpoints = [
    '/api/products?limit=500', // Increased from 100 to 500
    '/api/categories',
    '/api/customers?limit=500', // Increased from 100 to 500
    '/api/suppliers',
    '/api/store-config',
    '/api/ticket-config',
  ]
  
  // Retry function for failed requests
  const fetchWithRetry = async (url, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response.clone())
          return { success: true, url }
        }
        // If not ok but not a network error, don't retry
        if (i === maxRetries - 1) {
          console.warn(`Failed to precache ${url}: ${response.status} ${response.statusText}`)
          return { success: false, url, error: `HTTP ${response.status}` }
        }
      } catch (err) {
        if (i === maxRetries - 1) {
          console.warn(`Failed to precache ${url} after ${maxRetries} retries:`, err)
          return { success: false, url, error: err.message }
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
    return { success: false, url, error: 'Max retries exceeded' }
  }
  
  const results = await Promise.allSettled(
    apiEndpoints.map((url) => fetchWithRetry(url))
  )
  
  // Notify clients about precaching progress
  const successCount = results.filter((r) => 
    r.status === 'fulfilled' && r.value?.success === true
  ).length
  
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PRECACHE_PROGRESS',
        stage: 'api',
        progress: successCount,
        total: apiEndpoints.length,
      })
    })
  })
  
  return results
}

// Precaching Next.js static assets
async function precacheNextAssets() {
  const cache = await caches.open(CACHE_NAME)
  const results = []
  
  // Try to discover and cache Next.js assets from the current page
  // This is a best-effort approach since Next.js generates dynamic chunk names
  try {
    // Cache common Next.js asset patterns
    const commonAssets = [
      // These will be matched by the fetch handler, but we try to precache if available
    ]
    
    // Try to get assets from the main document
    const clients = await self.clients.matchAll({ type: 'window' })
    for (const client of clients) {
      try {
        // Request the client to send us its asset list
        client.postMessage({ type: 'GET_ASSETS' })
      } catch (err) {
        // Failed to request assets from client
      }
    }
    
    // Cache any assets we can discover
    const assetResults = await Promise.allSettled(
      commonAssets.map((url) =>
        cache.add(url).catch((err) => {
          console.warn(`Failed to precache asset ${url}:`, err)
          return Promise.resolve()
        })
      )
    )
    
    results.push(...assetResults)
  } catch (error) {
    console.warn('Error in precacheNextAssets:', error)
  }
  
  return results
}

// Install event - aggressive precaching for immediate offline functionality
self.addEventListener('install', (event) => {
  console.log('Service Worker installing - starting aggressive precaching...')
  
  event.waitUntil(
    Promise.allSettled([
      // Precache HTML pages (critical - must succeed)
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Precaching HTML pages...')
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache ${url}:`, err)
              return Promise.resolve()
            })
          )
        ).then((results) => {
          const successCount = results.filter((r) => r.status === 'fulfilled').length
          console.log(`Precached ${successCount}/${STATIC_ASSETS.length} pages`)
          
          // Notify clients
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'PRECACHE_PROGRESS',
                stage: 'pages',
                progress: successCount,
                total: STATIC_ASSETS.length,
              })
            })
          })
          
          // Validate critical resources are cached
          const criticalPages = ['/', '/dashboard', '/login', '/offline']
          const criticalCached = criticalPages.every((url) => {
            return results.some((r, i) => 
              r.status === 'fulfilled' && STATIC_ASSETS[i] === url
            )
          })
          
          if (!criticalCached) {
            console.warn('Some critical pages failed to cache, but continuing...')
          }
          
          return { successCount, total: STATIC_ASSETS.length, criticalCached }
        })
      }),
      // Precache Next.js assets (non-critical - can fail)
      precacheNextAssets().then(() => {
        console.log('Next.js assets precaching completed')
      }).catch((err) => {
        console.warn('Next.js assets precaching failed (non-critical):', err)
        return Promise.resolve()
      }),
      // Precache API data (non-critical - can fail, app works with empty data)
      precacheAPIData().then(() => {
        console.log('API data precaching completed')
      }).catch((err) => {
        console.warn('API data precaching failed (non-critical):', err)
        return Promise.resolve()
      }),
    ]).then((results) => {
      const pagesResult = results[0]
      const pagesSuccess = pagesResult.status === 'fulfilled' && 
        pagesResult.value?.criticalCached !== false
      
      console.log('Service Worker installation complete - app ready for offline use')
      console.log(`Pages cached: ${pagesResult.status === 'fulfilled' ? pagesResult.value?.successCount : 0}/${STATIC_ASSETS.length}`)
      
      // Notify clients that precaching is complete
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PRECACHE_COMPLETE',
            pagesCached: pagesResult.status === 'fulfilled' ? pagesResult.value?.successCount : 0,
            totalPages: STATIC_ASSETS.length,
            ready: pagesSuccess,
          })
        })
      })
    })
  )
  
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Handle non-GET requests (POST, PUT, DELETE, PATCH)
  if (request.method !== 'GET') {
    const shouldQueue = OFFLINE_QUEUE_PATTERNS.some((pattern) =>
      url.pathname.startsWith(pattern)
    )
    if (shouldQueue) {
      event.respondWith(handleOfflineRequest(request))
      return
    }
    // For other non-GET requests, try network first
    return
  }

  // Use intelligent strategy selection for all GET requests
  event.respondWith(selectCacheStrategy(request))
})

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.allSettled(
          event.data.urls.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache ${url}:`, err)
              return Promise.resolve()
            })
          )
        )
      })
    )
  }
  
  // Handle asset discovery from client
  if (event.data && event.data.type === 'ASSETS_LIST') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.allSettled(
          event.data.assets.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache discovered asset ${url}:`, err)
              return Promise.resolve()
            })
          )
        )
      })
    )
  }
})

// Network-first strategy: Try network, fallback to cache
async function networkFirstStrategy(request) {
  const cache = await caches.open(DATA_CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    // If it's an HTML request and we're offline, return offline page
    if (request.headers.get('accept')?.includes('text/html')) {
      return cache.match('/offline') || new Response('Offline', { status: 503 })
    }
    throw error
  }
}

// Cache-first strategy: Try cache, fallback to network
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  try {
    const response = await fetch(request)
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    // Return cached version even if stale, or error
    return cachedResponse || new Response('Network error', { status: 503 })
  }
}

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  // Always try to update in background (don't wait)
  const fetchPromise = fetch(request.clone())
    .then(async (response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone()
        try {
          await cache.put(request, responseToCache)
        } catch (error) {
          console.warn('Failed to cache response:', error)
        }
      }
      return response
    })
    .catch((error) => {
      console.warn('Background fetch failed:', error)
    })

  // Return cached version immediately if available
  if (cachedResponse) {
    // Don't wait for fetch, return cache immediately
    fetchPromise.catch(() => {}) // Suppress unhandled promise rejection
    return cachedResponse
  }

  // If no cache, wait for network
  try {
    const response = await fetchPromise
    if (response && response.ok) {
      return response
    }
    // If response failed, try offline page
    const offlinePage = await cache.match('/offline')
    return offlinePage || new Response('Offline', { status: 503 })
  } catch (error) {
    // Return offline page if available
    const offlinePage = await cache.match('/offline')
    return offlinePage || new Response('Offline', { status: 503 })
  }
}

// Network-first with intelligent fallback
async function intelligentNetworkFirstStrategy(request) {
  const url = new URL(request.url)
  const cache = await caches.open(CACHE_NAME)

  try {
    // Try network first
    const response = await fetch(request)

    if (response.status === 200) {
      // Cache successful responses
      cache.put(request, response.clone())

      // For API responses, also update data cache
      if (url.pathname.startsWith('/api/')) {
        const dataCache = await caches.open(DATA_CACHE_NAME)
        dataCache.put(request, response.clone())
      }
    }

    return response
  } catch (error) {
    // Network failed, try caches
    let cachedResponse = await cache.match(request)

    // For API requests, also try data cache
    if (!cachedResponse && url.pathname.startsWith('/api/')) {
      const dataCache = await caches.open(DATA_CACHE_NAME)
      cachedResponse = await dataCache.match(request)
    }

    if (cachedResponse) {
      return cachedResponse
    }

    // If it's an HTML request and we're offline, return offline page
    if (request.headers.get('accept')?.includes('text/html')) {
      return cache.match('/offline') || new Response('Offline', { status: 503 })
    }

    throw error
  }
}

// Strategy selector based on request type and context
async function selectCacheStrategy(request) {
  const url = new URL(request.url)

  // Static assets: Cache-first (they change rarely)
  if (STATIC_ASSETS.some(pattern => url.pathname.includes(pattern)) ||
      CRITICAL_NEXT_ASSETS.some(pattern => url.pathname.includes(pattern))) {
    return cacheFirstStrategy(request)
  }

  // API requests: Network-first with intelligent fallback
  if (url.pathname.startsWith('/api/')) {
    return intelligentNetworkFirstStrategy(request)
  }

  // HTML pages: Stale-while-revalidate for better UX
  if (request.headers.get('accept')?.includes('text/html')) {
    return staleWhileRevalidateStrategy(request)
  }

  // Images and media: Cache-first
  if (request.destination === 'image' || request.destination === 'media' ||
      url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|mp4|webm)$/)) {
    return cacheFirstStrategy(request)
  }

  // Fonts: Cache-first
  if (request.destination === 'font' || url.pathname.includes('font')) {
    return cacheFirstStrategy(request)
  }

  // Default: Network-first
  return intelligentNetworkFirstStrategy(request)
}

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  // Fetch fresh version in background (don't wait for it)
  const fetchPromise = fetch(request.clone())
    .then((response) => {
      // Only cache successful responses
      if (response && response.status === 200 && response.type === 'basic') {
        // Clone response before caching
        const responseToCache = response.clone()
        cache.put(request, responseToCache).catch((err) => {
          console.warn('Failed to cache response:', err)
        })
      }
      return response
    })
    .catch((error) => {
      // Ignore fetch errors - we'll use cache if available
      console.warn('Fetch failed, using cache if available:', error)
    })

  // Return cached version immediately if available
  if (cachedResponse) {
    // Don't wait for fetch, return cache immediately
    fetchPromise.catch(() => {}) // Suppress unhandled promise rejection
    return cachedResponse
  }

  // If no cache, wait for network
  try {
    const response = await fetchPromise
    if (response && response.ok) {
      return response
    }
    // If response failed, try offline page
    const offlinePage = await cache.match('/offline')
    return offlinePage || new Response('Offline', { status: 503 })
  } catch (error) {
    // Return offline page if available
    const offlinePage = await cache.match('/offline')
    return offlinePage || new Response('Offline', { status: 503 })
  }
}

// Handle offline requests (POST, PUT, DELETE, PATCH) - queue for sync
async function handleOfflineRequest(request) {
  try {
    // Try to send request first
    const response = await fetch(request.clone())
    return response
  } catch (error) {
    // If offline, queue the request with improved priority
    let requestData
    try {
      const clonedRequest = request.clone()
      const text = await clonedRequest.text()
      if (text) {
        requestData = JSON.parse(text)
      } else {
        requestData = {}
      }
    } catch (e) {
      // If request has no body or can't parse, create empty object
      requestData = {}
    }

    const url = new URL(request.url)
    const priority = getQueuePriority(url.pathname, request.method)
    const entityType = url.pathname.match(/\/api\/(\w+)/)?.[1]
    const entityId = url.pathname.match(/\/api\/\w+\/([^\/\?]+)/)?.[1]

    const queueItem = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: requestData,
      timestamp: Date.now(),
      priority: priority,
      entityType: entityType,
      entityId: entityId,
    }

    await queueOfflineRequest(queueItem)

    // Notify clients that request was queued
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'REQUEST_QUEUED',
          item: queueItem,
        })
      })
    })

    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        message: 'Request queued for sync when online',
        timestamp: queueItem.timestamp,
        priority: priority,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Queue offline request in IndexedDB with improved structure
async function queueOfflineRequest(queueItem) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE, 2)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['requests'], 'readwrite')
      const store = transaction.objectStore('requests')

      const item = {
        ...queueItem,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        retries: 0,
        status: 'pending',
        priority: queueItem.priority || (queueItem.url.includes('/api/sales') ? 'high' : 'normal'),
      }

      store.add(item)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('priority', 'priority', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('entityType', 'entityType', { unique: false })
      }
    }
  })
}

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  
  const title = data.title || 'ShopFlow POS'
  const options = {
    body: data.message || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.id || 'notification',
    data: data,
    requireInteraction: data.priority === 'URGENT' || data.priority === 'HIGH',
    actions: data.actionUrl ? [
      {
        action: 'open',
        title: 'View',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ] : [],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    const data = event.notification.data
    const urlToOpen = data?.actionUrl || '/dashboard'

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
    )
  }
})

// Background sync event (for offline operations)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync notifications when back online
      fetch('/api/notifications/sync')
        .then((response) => response.json())
        .catch((error) => {
          console.error('Failed to sync notifications:', error)
        })
    )
  }
  
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue())
  }
})

// Sync offline queue when back online
async function syncOfflineQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE, 2)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['requests'], 'readonly')
      const store = transaction.objectStore('requests')
      
      // Get items sorted by priority (high first) and timestamp
      const index = store.index('priority')
      const getAllRequest = index.getAll()

      getAllRequest.onsuccess = async () => {
        let items = getAllRequest.result
        
        // Filter only pending items
        const pendingItems = items.filter((item) => !item.status || item.status === 'pending')
        
        // Sort: high priority first, then by timestamp
        const priorityOrder = { high: 0, normal: 1, low: 2 }
        pendingItems.sort((a, b) => {
          const priorityDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
          if (priorityDiff !== 0) return priorityDiff
          return a.timestamp - b.timestamp
        })

        const results = {
          success: 0,
          failed: 0,
          errors: [],
        }

        for (const item of pendingItems) {
          try {
            // Update status to processing
            const updateProcessingTransaction = db.transaction(['requests'], 'readwrite')
            const processingStore = updateProcessingTransaction.objectStore('requests')
            item.status = 'processing'
            processingStore.put(item)
            await new Promise((resolve) => {
              updateProcessingTransaction.oncomplete = () => resolve(true)
            })

            const fetchOptions = {
              method: item.method || 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...item.headers,
              },
            }

            if (item.body && Object.keys(item.body).length > 0) {
              fetchOptions.body = JSON.stringify(item.body)
            }

            const response = await fetch(item.url, fetchOptions)

            if (response.ok) {
              // Remove synced item
              const deleteTransaction = db.transaction(['requests'], 'readwrite')
              deleteTransaction.objectStore('requests').delete(item.id)
              results.success++
            } else {
              // Increment retries
              item.retries = (item.retries || 0) + 1
              item.status = 'pending'
              if (item.retries >= 3) {
                // Mark as failed after 3 retries
                item.status = 'failed'
                const updateTransaction = db.transaction(['requests'], 'readwrite')
                updateTransaction.objectStore('requests').put(item)
                results.failed++
                results.errors.push({
                  url: item.url,
                  error: `Failed after ${item.retries} retries: ${response.status} ${response.statusText}`,
                })
              } else {
                // Update retry count and reset to pending
                const updateTransaction = db.transaction(['requests'], 'readwrite')
                updateTransaction.objectStore('requests').put(item)
              }
            }
          } catch (error) {
            // Increment retries on network error
            item.retries = (item.retries || 0) + 1
            item.status = 'pending'
            if (item.retries >= 3) {
              // Mark as failed after 3 retries
              item.status = 'failed'
              const updateTransaction = db.transaction(['requests'], 'readwrite')
              updateTransaction.objectStore('requests').put(item)
              results.failed++
              results.errors.push({
                url: item.url,
                error: error.message,
              })
            } else {
              // Update retry count
              const updateTransaction = db.transaction(['requests'], 'readwrite')
              updateTransaction.objectStore('requests').put(item)
            }
          }
        }

        // Notify clients about sync results
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              results,
            })
          })
        })

        resolve(results)
      }
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('priority', 'priority', { unique: false })
      }
    }
  })
}

