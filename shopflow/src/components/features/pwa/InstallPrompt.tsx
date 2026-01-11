'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // NO mostrar automáticamente - solo guardar el prompt para uso manual
      // El usuario puede solicitar instalación desde configuración si lo desea
      setShowPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // Permitir mostrar el prompt si el usuario lo solicita explícitamente
  // Esto se puede hacer desde un menú de configuración o similar
  useEffect(() => {
    const handleShowInstallPrompt = () => {
      if (deferredPrompt) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('show-install-prompt', handleShowInstallPrompt as EventListener)
    return () => {
      window.removeEventListener('show-install-prompt', handleShowInstallPrompt as EventListener)
    }
  }, [deferredPrompt])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for this session
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Check if user already dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setShowPrompt(false)
      }
    }
  }, [])

  // Ocultar completamente por defecto - instalación silenciosa
  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-white p-4 shadow-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Instalar ShopFlow POS
          </h3>
          <p className="mt-2 text-sm text-gray-700">
            Instala la aplicación para:
          </p>
          <ul className="mt-2 text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>Usar sin conexión inmediatamente</li>
            <li>Acceso rápido desde el escritorio</li>
            <li>Notificaciones push</li>
            <li>Mejor rendimiento</li>
          </ul>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={handleInstall} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
          <Download className="mr-2 h-4 w-4" />
          Instalar Ahora
        </Button>
        <Button onClick={handleDismiss} size="sm" variant="outline">
          Después
        </Button>
      </div>
    </div>
  )
}

