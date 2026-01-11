import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { ServiceWorkerRegistration } from '@/components/features/notifications/ServiceWorkerRegistration'
import { InstallPrompt } from '@/components/features/pwa/InstallPrompt'
import { PrecacheProgress } from '@/components/features/pwa/PrecacheProgress'
import { ServiceWorkerUpdate } from '@/components/features/pwa/ServiceWorkerUpdate'
import { InstallationStatus } from '@/components/features/pwa/InstallationStatus'
import { ConnectionStatus } from '@/components/features/pwa/ConnectionStatus'
import { SyncNotification } from '@/components/features/pwa/SyncNotification'
import { ServiceInitializer } from '@/components/providers/ServiceInitializer'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ShopFlow POS',
  description: 'Point of Sale system for managing products, sales, and inventory',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ShopFlow POS',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3B82F6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo/favicon/favicon-16x16.png" />
        <link rel="icon" type="image/x-icon" href="/logo/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ShopFlow POS" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegistration />
        <QueryProvider>
          <ServiceInitializer />
          <ConnectionStatus />
          <SyncNotification />
          {children}
          {/* Componentes de instalación - ejecutan silenciosamente en segundo plano */}
          <InstallPrompt />
          <PrecacheProgress />
          <ServiceWorkerUpdate />
          <InstallationStatus />
        </QueryProvider>
      </body>
    </html>
  )
}
