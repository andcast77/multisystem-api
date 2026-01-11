'use client'

/**
 * ConnectionStatus - Componente que actualiza el store de notificaciones
 * Ya no renderiza su propia UI, solo actualiza el estado centralizado
 */
import { useOffline } from '@/hooks/useOffline'
import { useSyncNotificationStore } from '@/lib/stores/syncNotificationStore'
import { useEffect, useState } from 'react'

export function ConnectionStatus() {
  const { isOffline, isSyncing, syncProgress, syncError, lastSyncTime } = useOffline()
  const { setNotification, clearNotification } = useSyncNotificationStore()
  const [prevIsSyncing, setPrevIsSyncing] = useState(false)
  const [prevSyncTime, setPrevSyncTime] = useState<number | null>(null)

  // Detectar cambios en el estado de sincronización y actualizar notificación centralizada
  useEffect(() => {
    // Si está sincronizando
    if (isSyncing) {
      setNotification({
        type: 'syncing',
        progress: syncProgress || undefined,
        message: syncProgress 
          ? `${Math.round((syncProgress.progress / syncProgress.total) * 100)}% - ${getStageLabel(syncProgress.stage)}`
          : 'Sincronizando...',
      })
      setPrevIsSyncing(true)
      return
    }

    // Si estaba sincronizando y ahora no, la sincronización terminó
    if (prevIsSyncing && !isSyncing) {
      if (syncError) {
        // Mostrar error
        setNotification({
          type: 'error',
          message: syncError,
          details: 'Los datos locales se mantienen seguros. Puedes intentar sincronizar nuevamente.',
        })
        // Auto-ocultar después de 5 segundos
        setTimeout(() => clearNotification(), 5000)
      } else if (lastSyncTime && lastSyncTime !== prevSyncTime) {
        // Mostrar éxito solo si realmente hubo una sincronización nueva
        setNotification({
          type: 'success',
          message: 'Sincronización completa',
          details: 'Los datos se han sincronizado correctamente',
          timestamp: lastSyncTime,
        })
        // Auto-ocultar después de 3 segundos
        setTimeout(() => clearNotification(), 3000)
      }
      setPrevIsSyncing(false)
    }

    // Si está offline
    if (isOffline && !isSyncing) {
      setNotification({
        type: 'offline',
        message: 'Modo offline',
        details: 'Trabajando sin conexión',
      })
    } else if (!isOffline && !isSyncing && !syncError) {
      // Limpiar notificación offline cuando vuelve la conexión
      // Usar getState() para leer sin suscribirse y evitar bucles
      const currentNotification = useSyncNotificationStore.getState().notification
      if (currentNotification?.type === 'offline' && currentNotification?.priority !== 'high') {
        clearNotification()
      }
    }

    if (lastSyncTime !== prevSyncTime) {
      setPrevSyncTime(lastSyncTime)
    }
  }, [isOffline, isSyncing, syncProgress, syncError, lastSyncTime, prevIsSyncing, prevSyncTime, setNotification, clearNotification])

  // Este componente ya no renderiza nada, solo actualiza el store
  return null
}

function getStageLabel(stage: string): string {
  const stageLabels: Record<string, string> = {
    products: 'Sincronizando productos...',
    categories: 'Sincronizando categorías...',
    customers: 'Sincronizando clientes...',
    suppliers: 'Sincronizando proveedores...',
    config: 'Sincronizando configuración...',
    complete: 'Sincronización completa',
  }
  return stageLabels[stage] || 'Sincronizando...'
}
