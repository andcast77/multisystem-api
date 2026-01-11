'use client'

import { useEffect } from 'react'
import { prefetchService } from '@/lib/services/prefetchService'
import { backgroundSyncService } from '@/lib/services/backgroundSyncService'

export function ServiceInitializer() {
  useEffect(() => {
    // Initialize prefetch service
    prefetchService.start()

    // Initialize background sync service
    backgroundSyncService.start()

    // Cleanup on unmount
    return () => {
      prefetchService.stop()
      backgroundSyncService.stop()
    }
  }, [])

  return null // This component doesn't render anything
}