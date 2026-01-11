'use client'

import { useEffect } from 'react'

interface PrecacheProgressData {
  stage: 'pages' | 'api'
  progress: number
  total: number
}

/**
 * PrecacheProgress - Ejecuta silenciosamente en segundo plano
 * No muestra UI al usuario, solo registra en consola para debugging
 */
export function PrecacheProgress() {
  useEffect(() => {
    const handleProgress = (event: CustomEvent<PrecacheProgressData>) => {
      // Solo registrar en consola en modo desarrollo
      if (process.env.NODE_ENV === 'development') {
        const { stage, progress, total } = event.detail
        const percentage = Math.round((progress / total) * 100)
        console.log(`[PWA] Precache ${stage}: ${progress}/${total} (${percentage}%)`)
      }
    }

    const handleComplete = () => {
      // Solo registrar en consola en modo desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('[PWA] Precache completado - aplicación lista para uso offline')
      }
    }

    window.addEventListener('precache-progress', handleProgress as EventListener)
    window.addEventListener('precache-complete', handleComplete)

    return () => {
      window.removeEventListener('precache-progress', handleProgress as EventListener)
      window.removeEventListener('precache-complete', handleComplete)
    }
  }, [])

  // No renderizar nada - ejecución completamente silenciosa
  return null
}
