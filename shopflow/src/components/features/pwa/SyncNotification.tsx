'use client'

/**
 * SyncNotification - Componente que SOLO RENDERIZA la notificación del store
 * NO actualiza el store, solo muestra lo que ConnectionStatus y SyncStatus establecen
 */
import { useEffect, useState } from 'react'
import { useSyncNotificationStore } from '@/lib/stores/syncNotificationStore'
import { WifiOff, Info, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export function SyncNotification() {
  const { notification } = useSyncNotificationStore()
  const [isMounted, setIsMounted] = useState(false)

  // Evitar problemas de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted || !notification) {
    return null
  }

  const getNotificationConfig = () => {
    switch (notification.type) {
      case 'error':
        return {
          bg: 'bg-red-500 hover:bg-red-600',
          icon: <XCircle className="h-4 w-4 flex-shrink-0" />,
          title: 'Error de sincronización',
          message: notification.message || 'Error desconocido',
        }
      case 'success':
        return {
          bg: 'bg-green-500 hover:bg-green-600',
          icon: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />,
          title: 'Sincronización completa',
          message: notification.message || 'Los datos se han sincronizado correctamente',
        }
      case 'syncing':
        return {
          bg: 'bg-blue-500 hover:bg-blue-600',
          icon: <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />,
          title: 'Sincronizando',
          message: notification.message || 'Sincronizando...',
        }
      case 'offline':
        return {
          bg: 'bg-yellow-500 hover:bg-yellow-600',
          icon: <WifiOff className="h-4 w-4 flex-shrink-0" />,
          title: 'Modo offline',
          message: notification.message || 'Trabajando sin conexión',
        }
      default:
        return null
    }
  }

  const config = getNotificationConfig()
  if (!config) return null

  const percentage = notification.progress
    ? Math.round((notification.progress.progress / notification.progress.total) * 100)
    : 0

  return (
    <div className="fixed bottom-4 right-4 z-[60] group">
      {/* Notificación discreta */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer transition-colors ${config.bg} text-white`}>
        {config.icon}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium">
            {config.title}
          </span>
          <span className="text-xs opacity-90">
            {config.message}
          </span>
        </div>
        <Info className="h-3 w-3 flex-shrink-0 opacity-75" />
      </div>

      {/* Tooltip que aparece en hover */}
      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[70]">
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-sm">
            {notification.type === 'error'
              ? 'Error de Sincronización'
              : notification.type === 'success'
              ? 'Sincronización Exitosa'
              : notification.type === 'syncing'
              ? 'Sincronización en Progreso'
              : 'Modo Offline Activo'}
          </div>

          {notification.type === 'error' ? (
            <div className="space-y-2">
              <div className="text-red-300 leading-relaxed flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{notification.message || 'Ocurrió un error durante la sincronización'}</span>
              </div>
              {notification.details && (
                <div className="text-gray-400 text-xs pt-1 border-t border-gray-700">
                  {notification.details}
                </div>
              )}
            </div>
          ) : notification.type === 'success' ? (
            <div className="space-y-2">
              <div className="text-green-300 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{notification.details || 'Todos los datos se han sincronizado correctamente con el servidor.'}</span>
              </div>
              {notification.timestamp && (
                <div className="text-gray-400 text-xs">
                  Última sincronización: {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : notification.type === 'syncing' && notification.progress ? (
            <div className="space-y-2">
              <div className="text-gray-300 leading-relaxed">
                {getStageLabel(notification.progress.stage)}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-gray-400 text-xs">
                {notification.progress.progress} de {notification.progress.total} elementos
              </div>
            </div>
          ) : (
            <div className="text-gray-300 leading-relaxed">
              {notification.details || 'Estás trabajando sin conexión a internet. Todos los cambios se guardarán localmente y se sincronizarán automáticamente cuando se restaure la conexión.'}
            </div>
          )}

          {notification.type !== 'error' && notification.type !== 'success' && (
            <div className="pt-1 border-t border-gray-700 text-gray-400 text-xs">
              {notification.type === 'syncing'
                ? 'La sincronización se completará automáticamente.'
                : 'La sincronización ocurrirá en segundo plano sin interrumpir tu trabajo.'}
            </div>
          )}
        </div>
        {/* Flecha del tooltip */}
        <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
    </div>
  )
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
