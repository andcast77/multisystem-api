'use client'

import { useOffline } from '@/hooks/useOffline'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle2, XCircle, Loader2, Clock, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ConflictResolver } from './ConflictResolver'
import { syncService } from '@/lib/services/syncService'
import { useSyncNotificationStore } from '@/lib/stores/syncNotificationStore'
import type { Conflict } from '@/lib/services/conflictResolver'

export function SyncStatus() {
  const { isOnline, isSyncing, syncProgress, syncError, syncAll, lastSyncTime } = useOffline()
  const { items, pendingCount, failedCount, isLoading: queueLoading } = useOfflineQueue()
  const { setNotification } = useSyncNotificationStore()
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [syncResult, setSyncResult] = useState<any>(null)

  // Listen for sync results to get conflicts
  useEffect(() => {
    const handleSyncComplete = async () => {
      // Conflicts are stored in syncService, we need to get them from the last sync result
      // For now, we'll check periodically or after sync
    }

    if (!isSyncing && syncResult) {
      if (syncResult.conflicts && syncResult.conflicts.length > 0) {
        setConflicts(syncResult.conflicts)
      }
    }
  }, [isSyncing, syncResult])

  const handleSync = async () => {
    setIsManualSyncing(true)
    try {
      const result = await syncAll()
      setSyncResult(result)
      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  const handleConflictResolved = () => {
    // Refresh conflicts after resolution
    setConflicts((prev) => prev.filter((c) => {
      // Conflicts that were resolved should be removed
      // This is a simple implementation - in production, you'd track which were resolved
      return true
    }))
  }

  // Actualizar notificación centralizada cuando hay errores críticos de cola offline
  // Usar force=true para asegurar que estos errores críticos tengan prioridad
  useEffect(() => {
    if (failedCount > 0) {
      setNotification({
        type: 'error',
        message: `${failedCount} operación${failedCount > 1 ? 'es' : ''} fallida${failedCount > 1 ? 's' : ''} en la cola offline`,
        details: 'Algunas operaciones no pudieron completarse. Revisa la cola offline.',
        priority: 'high',
      }, true) // force=true para prioridad alta
    }
  }, [failedCount, setNotification])

  // Solo mostrar SyncStatus para conflictos que requieren resolución manual
  // ConnectionStatus maneja los errores generales y estados de sincronización
  // Solo mostrar si hay conflictos que requieren atención manual O errores de cola offline
  const hasCriticalIssues = (failedCount > 0) || (conflicts.length > 0)
  
  // No mostrar si solo hay errores de sincronización general (ConnectionStatus los maneja)
  if (!hasCriticalIssues) {
    return null
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Hace menos de un minuto'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    const diffDays = Math.floor(diffHours / 24)
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  }

  const getProgressLabel = () => {
    if (!syncProgress) return null

    const stageLabels: Record<string, string> = {
      products: 'Sincronizando productos...',
      categories: 'Sincronizando categorías...',
      customers: 'Sincronizando clientes...',
      suppliers: 'Sincronizando proveedores...',
      config: 'Sincronizando configuración...',
      complete: 'Sincronización completa',
    }

    return stageLabels[syncProgress.stage] || 'Sincronizando...'
  }

  // Solo mostrar ConflictResolver si hay conflictos
  // El resto de la UI solo se muestra si hay errores críticos
  return (
    <>
      {conflicts.length > 0 && (
        <ConflictResolver conflicts={conflicts} onResolved={handleConflictResolved} />
      )}
      {hasCriticalIssues && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-lg bg-white p-4 shadow-lg border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-red-900">
                  Error de Sincronización
                </h3>
                {isOnline && (
                  <Button
                    onClick={handleSync}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 border-red-300 text-red-700 hover:bg-red-100"
                    disabled={isManualSyncing}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reintentar
                  </Button>
                )}
              </div>
              {syncError && (
                <p className="text-xs text-red-700 mt-1">{syncError}</p>
              )}
              {failedCount > 0 && (
                <p className="text-xs text-red-700 mt-1">
                  {failedCount} operación{failedCount > 1 ? 'es' : ''} fallida{failedCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
