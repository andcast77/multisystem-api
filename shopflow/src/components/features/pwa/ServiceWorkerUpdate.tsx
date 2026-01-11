'use client'

import { useEffect, useRef } from 'react'

/**
 * ServiceWorkerUpdate - Actualiza automáticamente en segundo plano
 * No muestra notificaciones al usuario, aplica actualizaciones automáticamente
 */
export function ServiceWorkerUpdate() {
  const isUpdatingRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handleUpdateAvailable = async (event: CustomEvent<{ registration: ServiceWorkerRegistration }>) => {
      const registration = event.detail.registration
      
      if (registration.waiting && !isUpdatingRef.current) {
        isUpdatingRef.current = true
        
        // Registrar en consola en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log('[PWA] Actualización disponible - aplicando automáticamente...')
        }

        try {
          // Aplicar actualización automáticamente
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          
          // Esperar un momento para que el service worker se active
          await new Promise((resolve) => setTimeout(resolve, 500))
          
          // Recargar automáticamente en la próxima interacción del usuario
          // Esto evita interrumpir al usuario mientras trabaja
          const handleUserInteraction = () => {
            window.location.reload()
          }
          
          // Recargar en la próxima interacción (click, keypress, etc.)
          document.addEventListener('click', handleUserInteraction, { once: true })
          document.addEventListener('keydown', handleUserInteraction, { once: true })
          
          // O recargar después de 30 segundos si no hay interacción
          setTimeout(() => {
            if (!document.hasFocus()) {
              window.location.reload()
            }
          }, 30000)
        } catch (error) {
          isUpdatingRef.current = false
        }
      }
    }

    window.addEventListener('sw-update-available', handleUpdateAvailable as EventListener)

    // También verificar directamente si hay un service worker esperando
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting && !isUpdatingRef.current) {
        handleUpdateAvailable(new CustomEvent('sw-update-available', {
          detail: { registration: reg }
        }))
      }
    })

    // Escuchar cambios de controlador (service worker activado)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // El service worker ya se activó, recargar en la próxima interacción
      if (process.env.NODE_ENV === 'development') {
        console.log('[PWA] Service Worker actualizado - recargando en próxima interacción')
      }
    })

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable as EventListener)
    }
  }, [])

  // No renderizar nada - actualización completamente silenciosa
  return null
}
