'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoyaltyConfig, useUpdateLoyaltyConfig } from '@/hooks/useLoyalty'
import { ArrowLeft, Gift, Save } from 'lucide-react'

export default function LoyaltyConfigPage() {
  const { data: config, isLoading } = useLoyaltyConfig()
  const updateConfig = useUpdateLoyaltyConfig()

  const [formData, setFormData] = useState({
    pointsPerDollar: config?.pointsPerDollar || 1.0,
    redemptionRate: config?.redemptionRate || 0.01,
    pointsExpireMonths: config?.pointsExpireMonths || undefined,
    minPurchaseForPoints: config?.minPurchaseForPoints || 0,
    maxPointsPerPurchase: config?.maxPointsPerPurchase || undefined,
  })

  const [isSaving, setIsSaving] = useState(false)

  // Update form when config loads
  if (config && !isLoading) {
    if (formData.pointsPerDollar !== config.pointsPerDollar) {
      setFormData({
        pointsPerDollar: config.pointsPerDollar,
        redemptionRate: config.redemptionRate,
        pointsExpireMonths: config.pointsExpireMonths,
        minPurchaseForPoints: config.minPurchaseForPoints,
        maxPointsPerPurchase: config.maxPointsPerPurchase,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateConfig.mutateAsync({
        pointsPerDollar: formData.pointsPerDollar,
        redemptionRate: formData.redemptionRate,
        pointsExpireMonths: formData.pointsExpireMonths,
        minPurchaseForPoints: formData.minPurchaseForPoints,
        maxPointsPerPurchase: formData.maxPointsPerPurchase,
      })
      alert('Configuración guardada exitosamente')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Configuración de Puntos de Lealtad</h1>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Configuración de Puntos de Lealtad</h1>
            <p className="text-muted-foreground">
              Configura las reglas para acumulación y canje de puntos
            </p>
          </div>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Acumulación de Puntos</CardTitle>
            <CardDescription>
              Configura cómo los clientes ganan puntos en sus compras
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pointsPerDollar">
                Puntos por Dólar Gastado
              </Label>
              <Input
                id="pointsPerDollar"
                type="number"
                step="0.1"
                min="0"
                value={formData.pointsPerDollar}
                onChange={(e) =>
                  setFormData({ ...formData, pointsPerDollar: parseFloat(e.target.value) || 0 })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ejemplo: 1.0 = 1 punto por cada $1 gastado
              </p>
            </div>

            <div>
              <Label htmlFor="minPurchaseForPoints">
                Compra Mínima para Ganar Puntos ($)
              </Label>
              <Input
                id="minPurchaseForPoints"
                type="number"
                step="0.01"
                min="0"
                value={formData.minPurchaseForPoints}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minPurchaseForPoints: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Las compras menores a este monto no ganan puntos
              </p>
            </div>

            <div>
              <Label htmlFor="maxPointsPerPurchase">
                Máximo de Puntos por Compra (Opcional)
              </Label>
              <Input
                id="maxPointsPerPurchase"
                type="number"
                step="1"
                min="1"
                value={formData.maxPointsPerPurchase || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxPointsPerPurchase: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="mt-1"
                placeholder="Sin límite"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deja vacío para no tener límite máximo
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canje de Puntos</CardTitle>
            <CardDescription>
              Configura el valor de los puntos al canjearlos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="redemptionRate">
                Valor de Canje por Punto ($)
              </Label>
              <Input
                id="redemptionRate"
                type="number"
                step="0.001"
                min="0"
                value={formData.redemptionRate}
                onChange={(e) =>
                  setFormData({ ...formData, redemptionRate: parseFloat(e.target.value) || 0 })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ejemplo: 0.01 = 100 puntos = $1 de descuento
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiración de Puntos</CardTitle>
            <CardDescription>
              Configura cuándo expiran los puntos (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pointsExpireMonths">
                Meses hasta Expiración (Opcional)
              </Label>
              <Input
                id="pointsExpireMonths"
                type="number"
                step="1"
                min="1"
                value={formData.pointsExpireMonths || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pointsExpireMonths: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="mt-1"
                placeholder="Nunca expiran"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deja vacío si los puntos nunca expiran
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </div>
  )
}

