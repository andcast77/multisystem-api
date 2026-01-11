/**
 * PWA Validation Utilities
 * Functions to validate that PWA resources are available and ready for offline use
 */

export interface PWAValidationResult {
  isReady: boolean
  serviceWorkerActive: boolean
  criticalPagesCached: boolean
  indexedDBAvailable: boolean
  cacheAvailable: boolean
  missingResources: string[]
  warnings: string[]
}

/**
 * Validate that critical PWA resources are available
 */
export async function validatePWAReadiness(): Promise<PWAValidationResult> {
  const result: PWAValidationResult = {
    isReady: false,
    serviceWorkerActive: false,
    criticalPagesCached: false,
    indexedDBAvailable: false,
    cacheAvailable: false,
    missingResources: [],
    warnings: [],
  }

  // Check Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      result.serviceWorkerActive = !!registration.active
      if (!result.serviceWorkerActive) {
        result.missingResources.push('Service Worker not active')
      }
    } catch (error) {
      result.missingResources.push('Service Worker not registered')
    }
  } else {
    result.missingResources.push('Service Worker not supported')
  }

  // Check Cache API
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      result.cacheAvailable = cacheNames.length > 0
      if (!result.cacheAvailable) {
        result.warnings.push('No caches found')
      }

      // Check critical pages are cached
      if (result.cacheAvailable) {
        const criticalPages = ['/', '/dashboard', '/login', '/offline']
        const cache = await caches.open('shopflow-pos-v3')
        
        const cacheChecks = await Promise.all(
          criticalPages.map(async (url) => {
            const response = await cache.match(url)
            return { url, cached: !!response }
          })
        )

        const allCached = cacheChecks.every((check) => check.cached)
        result.criticalPagesCached = allCached

        if (!allCached) {
          const missing = cacheChecks
            .filter((check) => !check.cached)
            .map((check) => check.url)
          result.missingResources.push(...missing)
        }
      }
    } catch (error) {
      result.missingResources.push('Cache API error')
      result.warnings.push(`Cache check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } else {
    result.missingResources.push('Cache API not supported')
  }

  // Check IndexedDB
  if ('indexedDB' in window) {
    try {
      // Try to open a test database
      const testDB = indexedDB.open('test-db', 1)
      await new Promise((resolve, reject) => {
        testDB.onsuccess = () => {
          testDB.result.close()
          indexedDB.deleteDatabase('test-db')
          resolve(true)
        }
        testDB.onerror = () => reject(testDB.error)
        testDB.onblocked = () => resolve(true) // Still available, just blocked
      })
      result.indexedDBAvailable = true
    } catch (error) {
      result.missingResources.push('IndexedDB not available')
      result.warnings.push(`IndexedDB check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } else {
    result.missingResources.push('IndexedDB not supported')
  }

  // Determine overall readiness
  // App is ready if service worker is active and critical pages are cached
  // IndexedDB and cache availability are nice-to-have but not critical for basic functionality
  result.isReady = result.serviceWorkerActive && result.criticalPagesCached

  return result
}

/**
 * Check if a specific resource is cached
 */
export async function isResourceCached(url: string, cacheName?: string): Promise<boolean> {
  if (!('caches' in window)) {
    return false
  }

  try {
    if (cacheName) {
      const cache = await caches.open(cacheName)
      const response = await cache.match(url)
      return !!response
    } else {
      // Check all caches
      const cacheNames = await caches.keys()
      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const response = await cache.match(url)
        if (response) {
          return true
        }
      }
      return false
    }
  } catch (error) {
    console.warn(`Error checking cache for ${url}:`, error)
    return false
  }
}

/**
 * Get list of cached resources
 */
export async function getCachedResources(cacheName?: string): Promise<string[]> {
  if (!('caches' in window)) {
    return []
  }

  try {
    const resources: string[] = []
    const cacheNames = cacheName ? [cacheName] : await caches.keys()

    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      resources.push(...keys.map((request) => request.url))
    }

    return resources
  } catch (error) {
    console.warn('Error getting cached resources:', error)
    return []
  }
}

/**
 * Validate that the app can function offline
 */
export async function canFunctionOffline(): Promise<boolean> {
  const validation = await validatePWAReadiness()
  return validation.isReady
}
