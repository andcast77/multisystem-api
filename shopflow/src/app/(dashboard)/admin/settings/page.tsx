'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStoreConfig'
import { StoreConfigForm } from '@/components/features/store-config/StoreConfigForm'
import { LanguageSelector } from '@/components/features/settings/LanguageSelector'
import { PrinterSelector } from '@/components/features/settings/PrinterSelector'
import { TicketConfigForm } from '@/components/features/settings/TicketConfigForm'
import { useTicketConfig, useUpdateTicketConfig } from '@/hooks/useTicketConfig'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Settings, CheckCircle2 } from 'lucide-react'
import type { UpdateStoreConfigInput } from '@/lib/validations/storeConfig'

export default function SettingsPage() {
  const { data: storeConfig, isLoading, error } = useStoreConfig()
  const updateStoreConfig = useUpdateStoreConfig()
  const { data: ticketConfig, isLoading: isLoadingTicket } = useTicketConfig()
  const updateTicketConfig = useUpdateTicketConfig()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (data: UpdateStoreConfigInput) => {
    try {
      setErrorMessage(null)
      setSuccessMessage(null)
      await updateStoreConfig.mutateAsync(data)
      setSuccessMessage('Configuración guardada exitosamente')
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar la configuración')
    }
  }

  const handleTicketSubmit = async (data: Parameters<typeof updateTicketConfig.mutateAsync>[0]) => {
    try {
      setErrorMessage(null)
      setSuccessMessage(null)
      await updateTicketConfig.mutateAsync(data)
      setSuccessMessage('Configuración de tickets guardada exitosamente')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar la configuración de tickets')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Cargando configuración...</div>
      </div>
    )
  }

  if (error || !storeConfig) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">
              {error instanceof Error ? error.message : 'Error al cargar la configuración'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configuración de la Tienda
          </h1>
          <p className="text-muted-foreground">
            Gestiona la información y parámetros de tu tienda
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      {successMessage && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de Usuario</CardTitle>
          <CardDescription>
            Configura tus preferencias personales. Estos cambios solo afectan tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <LanguageSelector />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros de Configuración</CardTitle>
          <CardDescription>
            Modifica la información de tu tienda y los parámetros del sistema. Los cambios se aplicarán inmediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoreConfigForm
            initialData={storeConfig}
            onSubmit={handleSubmit}
            isLoading={updateStoreConfig.isPending}
          />
        </CardContent>
      </Card>

      {!isLoadingTicket && ticketConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Impresión</CardTitle>
            <CardDescription>
              Gestiona las impresoras y personaliza el formato y contenido de los comprobantes de venta (tickets térmicos o hojas).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Impresoras</h3>
                <PrinterSelector />
              </div>
              <div className="border-t pt-8">
                <TicketConfigForm
                  initialData={ticketConfig}
                  onSubmit={handleTicketSubmit}
                  isLoading={updateTicketConfig.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
