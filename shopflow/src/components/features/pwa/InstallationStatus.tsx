'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validatePWAReadiness, type PWAValidationResult } from '@/lib/utils/pwaValidation'

/**
 * InstallationStatus - Solo muestra errores críticos
 * Ejecuta validaciones en segundo plano sin mostrar UI durante instalación normal
 */
export function InstallationStatus() {
  const [validation, setValidation] = useState<PWAValidationResult | null>(null)
  const [criticalError, setCriticalError] = useState<string | null>(null)

  useEffect(() => {
    // Check PWA readiness on mount - solo en segundo plano
    const checkReadiness = async () => {
      try {
        const result = await validatePWAReadiness()
        setValidation(result)
        
        // Solo mostrar si hay un error crítico que impida el funcionamiento
        // (por ejemplo, Service Worker no disponible o IndexedDB no disponible)
        if (!result.serviceWorkerActive || !result.indexedDBAvailable) {
          setCriticalError('La aplicación requiere Service Worker e IndexedDB para funcionar offline')
        } else {
          setCriticalError(null)
        }

        // Registrar en consola en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
          if (result.isReady) {
            console.log('[PWA] Instalación completada - aplicación lista')
          } else {
            console.warn('[PWA] Instalación en progreso:', {
              serviceWorker: result.serviceWorkerActive,
              indexedDB: result.indexedDBAvailable,
              cache: result.cacheAvailable,
              missingResources: result.missingResources.length,
            })
          }
        }
      } catch (error) {
        console.error('Error validating PWA readiness:', error)
        // Solo mostrar error si es crítico
        if (error instanceof Error) {
          setCriticalError(error.message)
        }
      }
    }

    checkReadiness()

    // Listen for precaching completion
    const handlePrecacheComplete = () => {
      // Re-check after a short delay to allow cache to settle
      setTimeout(checkReadiness, 1000)
    }

    window.addEventListener('precache-complete', handlePrecacheComplete)

    // Periodically check (cada 10 segundos) durante instalación
    const interval = setInterval(() => {
      checkReadiness()
    }, 10000)

    return () => {
      window.removeEventListener('precache-complete', handlePrecacheComplete)
      clearInterval(interval)
    }
  }, [])

  // Solo mostrar si hay un error crítico
  if (!criticalError) {
    return null
  }

  return (
    <Card className="fixed top-4 left-4 z-50 max-w-md shadow-lg border border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>Error Crítico de Instalación</span>
        </CardTitle>
        <CardDescription className="text-xs text-red-700">
          {criticalError}
        </CardDescription>
      </CardHeader>
      {validation && (
        <CardContent className="space-y-2">
          <div className="space-y-1 text-xs text-red-700">
            <p>La aplicación requiere las siguientes funcionalidades para funcionar offline:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-2">
              <li>Service Worker: {validation.serviceWorkerActive ? '✓ Disponible' : '✗ No disponible'}</li>
              <li>IndexedDB: {validation.indexedDBAvailable ? '✓ Disponible' : '✗ No disponible'}</li>
              <li>Cache API: {validation.cacheAvailable ? '✓ Disponible' : '✗ No disponible'}</li>
            </ul>
            <p className="mt-2 text-xs">
              Por favor, actualiza tu navegador o habilita estas funcionalidades.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
