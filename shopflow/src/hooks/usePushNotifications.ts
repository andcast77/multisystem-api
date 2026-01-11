'use client'

import { useEffect, useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Hook to manage push notification subscriptions
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null)

  // Get VAPID public key
  useEffect(() => {
    fetch('/api/push/vapid-public-key')
      .then((res) => res.json())
      .then((data) => {
        if (data.publicKey) {
          setVapidPublicKey(data.publicKey)
        }
      })
      .catch((error) => {
        console.error('Failed to get VAPID public key:', error)
      })
  }, [])

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isSupported) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }, [isSupported])

  // Subscribe to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!isSupported || !vapidPublicKey) {
        throw new Error('Push notifications not supported or VAPID key not available')
      }

      const registration = await registerServiceWorker()
      if (!registration) {
        throw new Error('Service Worker registration failed')
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })

      const subscriptionData: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      // Update permission state
      setPermission(Notification.permission)
    },
  })

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!isSupported) {
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        const response = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to remove subscription')
        }
      }

      setPermission(Notification.permission)
    },
  })

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false
    }

    if (permission === 'granted') {
      return true
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [isSupported, permission])

  // Subscribe with permission request
  const subscribe = useCallback(async (): Promise<void> => {
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      throw new Error('Notification permission denied')
    }

    await subscribeMutation.mutateAsync()
  }, [requestPermission, subscribeMutation])

  return {
    isSupported,
    permission,
    isSubscribed: permission === 'granted',
    subscribe,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isLoading: subscribeMutation.isPending || unsubscribeMutation.isPending,
    error: subscribeMutation.error || unsubscribeMutation.error,
  }
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

