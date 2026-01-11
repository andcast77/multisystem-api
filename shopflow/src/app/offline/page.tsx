'use client'

import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, Package, Users, FolderTree, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOffline } from '@/hooks/useOffline'
import { offlineStorage } from '@/lib/services/offlineStorage'
import { SyncStatus } from '@/components/features/pwa/SyncStatus'

interface OfflineDataStatus {
  products: number
  categories: number
  customers: number
  suppliers: number
  storeConfig: boolean
  ticketConfig: boolean
}

export default function OfflinePage() {
  const { isOnline, isSyncing, syncAll, syncProgress, syncError } = useOffline()
  const [dataStatus, setDataStatus] = useState<OfflineDataStatus>({
    products: 0,
    categories: 0,
    customers: 0,
    suppliers: 0,
    storeConfig: false,
    ticketConfig: false,
  })

  useEffect(() => {
    const loadDataStatus = async () => {
      try {
        const [products, categories, customers, suppliers, storeConfig, ticketConfig] =
          await Promise.all([
            offlineStorage.getProducts(),
            offlineStorage.getCategories(),
            offlineStorage.getCustomers(),
            offlineStorage.getSuppliers(),
            offlineStorage.getStoreConfig(),
            offlineStorage.getTicketConfig(),
          ])

        setDataStatus({
          products: products.length,
          categories: categories.length,
          customers: customers.length,
          suppliers: suppliers.length,
          storeConfig: !!storeConfig,
          ticketConfig: !!ticketConfig,
        })
      } catch (error) {
        console.error('Error loading offline data status:', error)
      }
    }

    loadDataStatus()
  }, [])

  const handleSync = async () => {
    try {
      const result = await syncAll()
      // Reload data status after sync
      const [products, categories, customers, suppliers, storeConfig, ticketConfig] =
        await Promise.all([
          offlineStorage.getProducts(),
          offlineStorage.getCategories(),
          offlineStorage.getCustomers(),
          offlineStorage.getSuppliers(),
          offlineStorage.getStoreConfig(),
          offlineStorage.getTicketConfig(),
        ])

      setDataStatus({
        products: products.length,
        categories: categories.length,
        customers: customers.length,
        suppliers: suppliers.length,
        storeConfig: !!storeConfig,
        ticketConfig: !!ticketConfig,
      })

      if (isOnline && result.success) {
        // Small delay before reload to show success message
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const totalItems = dataStatus.products + dataStatus.categories + dataStatus.customers + dataStatus.suppliers

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <WifiOff className="mx-auto h-16 w-16 text-gray-400" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {isOnline ? 'Modo Offline' : 'Sin Conexión a Internet'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isOnline
              ? 'Estás trabajando en modo offline. Los datos se sincronizarán cuando vuelvas a tener conexión.'
              : 'No hay conexión a internet. Algunas funcionalidades pueden estar limitadas.'}
          </p>
        </div>

        {/* Data Status Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStatus.products}</div>
              <p className="text-xs text-gray-500 mt-1">disponibles offline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Categorías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStatus.categories}</div>
              <p className="text-xs text-gray-500 mt-1">disponibles offline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStatus.customers}</div>
              <p className="text-xs text-gray-500 mt-1">disponibles offline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Proveedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataStatus.suppliers}</div>
              <p className="text-xs text-gray-500 mt-1">disponibles offline</p>
            </CardContent>
          </Card>
        </div>

        {/* Sync Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Sincronización</CardTitle>
            <CardDescription>
              {isOnline
                ? 'Sincroniza los datos con el servidor cuando tengas conexión'
                : 'Los datos se sincronizarán automáticamente cuando vuelvas a tener conexión'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSyncing && syncProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {syncProgress.stage === 'products' && 'Sincronizando productos...'}
                    {syncProgress.stage === 'categories' && 'Sincronizando categorías...'}
                    {syncProgress.stage === 'customers' && 'Sincronizando clientes...'}
                    {syncProgress.stage === 'suppliers' && 'Sincronizando proveedores...'}
                    {syncProgress.stage === 'config' && 'Sincronizando configuración...'}
                    {syncProgress.stage === 'complete' && 'Sincronización completa'}
                  </span>
                  <span className="text-gray-500">
                    {syncProgress.progress} / {syncProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(syncProgress.progress / syncProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {syncError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{syncError}</p>
              </div>
            )}

            {totalItems > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  Tienes <strong>{totalItems} elementos</strong> disponibles para trabajar offline.
                </p>
              </div>
            )}

            {isOnline && (
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full"
                variant="default"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
              </Button>
            )}

            {!isOnline && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <WifiOff className="h-4 w-4" />
                <span>Esperando conexión a internet...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => (window.location.href = '/dashboard')}
            variant="outline"
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>

      {/* Sync Status Component */}
      {isOnline && <SyncStatus />}
    </div>
  )
}

