'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - longer for offline support
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: (failureCount, error: any) => {
              // Don't retry if offline
              if (!navigator.onLine) {
                return false
              }
              // Retry up to 2 times for network errors
              if (failureCount < 2) {
                return true
              }
              return false
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false, // Don't refetch on window focus for better offline experience
            refetchOnReconnect: true, // Refetch when connection is restored
            refetchOnMount: true, // Refetch on mount to get fresh data when online
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Don't retry mutations if offline - they'll be queued
              if (!navigator.onLine) {
                return false
              }
              return failureCount < 1
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
