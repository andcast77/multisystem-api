'use client'

/**
 * OfflineIndicator - Oculto para evitar duplicación con ConnectionStatus
 * El ConnectionStatus en el layout raíz ya maneja la notificación offline de forma discreta
 * La sincronización ahora ocurre automáticamente en segundo plano
 */
export function OfflineIndicator() {
  // Ocultar completamente - ConnectionStatus maneja la notificación offline
  return null
}

