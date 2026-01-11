'use client'

import { useEffect } from 'react'
import { validatePWAReadiness } from '@/lib/utils/pwaValidation'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      let updateCheckInterval: NodeJS.Timeout | null = null

      // Register service worker when component mounts
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async (registration) => {
          // Validate critical resources after registration
          const validateResources = async () => {
            try {
              const validation = await validatePWAReadiness()
              if (validation.isReady) {
                console.log('PWA is ready for offline use')
                window.dispatchEvent(new CustomEvent('pwa-ready', { detail: validation }))
              } else {
                console.warn('PWA not fully ready:', validation.missingResources)
                window.dispatchEvent(new CustomEvent('pwa-not-ready', { detail: validation }))
              }
            } catch (error) {
              console.error('Error validating PWA readiness:', error)
            }
          }
          
          // Validate after a short delay to allow cache to settle
          setTimeout(validateResources, 2000)

          // Check for updates periodically (every hour)
          updateCheckInterval = setInterval(() => {
            registration.update().catch((error) => {
              console.warn('Failed to check for service worker updates:', error)
            })
          }, 60 * 60 * 1000)

          // Handle service worker updates
          const handleUpdateFound = () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  // Check if there's a controller (meaning this is an update, not first install)
                  if (navigator.serviceWorker.controller) {
                    // New service worker available, dispatch event for UI component
                    console.log('New service worker available')
                    window.dispatchEvent(new CustomEvent('sw-update-available', {
                      detail: { registration }
                    }))
                  } else {
                    // First install, service worker is ready
                    console.log('Service Worker installed and ready')
                  }
                }
              })
            }
          }

          registration.addEventListener('updatefound', handleUpdateFound)

          // Check if there's already a waiting service worker
          if (registration.waiting) {
            window.dispatchEvent(new CustomEvent('sw-update-available', {
              detail: { registration }
            }))
          }

          // Aggressive warmup after service worker is ready
          // This ensures additional pages are cached even if not in STATIC_ASSETS
          const warmupPages = async () => {
            if (!navigator.onLine) return
            
            // Check for offline_token (used by offlineAuth service)
            const offlineToken = localStorage.getItem('offline_token')
            const additionalPages = [
              '/products/new',
              '/customers/new',
              '/inventory',
              '/inventory/adjustments',
              '/reports',
            ]

            // Warm up authenticated pages if user is logged in
            if (offlineToken) {
              console.log('Warming up additional pages for offline...')
              await Promise.allSettled(
                additionalPages.map((page) =>
                  fetch(page, { cache: 'default' }).catch((err) =>
                    console.warn(`Failed to warm up ${page}:`, err)
                  )
                )
              )
            }

            // Always warm up public pages
            const publicPages = ['/dashboard', '/pos']
            await Promise.allSettled(
              publicPages.map((page) =>
                fetch(page, { cache: 'default' }).catch((err) =>
                  console.warn(`Failed to warm up ${page}:`, err)
                )
              )
            )
          }

          // Warmup immediately if service worker is already active
          if (registration.active) {
            warmupPages()
            // Validate resources after warmup
            setTimeout(validateResources, 3000)
          } else {
            // Wait for service worker to be ready, then warmup
            const handleActivation = () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    setTimeout(() => {
                      warmupPages()
                      // Validate after warmup
                      setTimeout(validateResources, 2000)
                    }, 2000)
                  }
                })
              }
            }
            
            registration.addEventListener('updatefound', handleActivation)
            
            // Fallback: warmup after delay
            setTimeout(() => {
              warmupPages()
              setTimeout(validateResources, 2000)
            }, 5000)
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
          // Don't show error to user, just log it
        })

      // Cleanup interval on unmount
      return () => {
        if (updateCheckInterval) {
          clearInterval(updateCheckInterval)
        }
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          console.log('Sync completed:', event.data.results)
        }
        
        // Listen for precaching progress
        if (event.data && event.data.type === 'PRECACHE_PROGRESS') {
          console.log(`Precaching ${event.data.stage}: ${event.data.progress}/${event.data.total}`)
          // Dispatch custom event for UI components to listen
          window.dispatchEvent(new CustomEvent('precache-progress', {
            detail: event.data
          }))
        }
        
        // Listen for precaching completion
        if (event.data && event.data.type === 'PRECACHE_COMPLETE') {
          console.log('Precaching complete - app ready for offline use')
          window.dispatchEvent(new CustomEvent('precache-complete', {
            detail: event.data
          }))
          
          // Validate resources after precaching completes
          setTimeout(async () => {
            try {
              const validation = await validatePWAReadiness()
              if (validation.isReady) {
                window.dispatchEvent(new CustomEvent('pwa-ready', { detail: validation }))
              }
            } catch (error) {
              console.error('Error validating after precache:', error)
            }
          }, 1000)
        }
      })
    }
  }, [])

  return null
}

