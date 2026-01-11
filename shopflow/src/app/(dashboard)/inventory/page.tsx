'use client'

import { InventoryOverview } from '@/components/features/inventory/InventoryOverview'
import { LowStockAlert } from '@/components/features/inventory/LowStockAlert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Settings } from 'lucide-react'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">
            Vista general y gestión de tu inventario
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/adjustments">
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              Ajustes
            </Button>
          </Link>
          <Link href="/inventory/low-stock">
            <Button variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Stock Bajo
            </Button>
          </Link>
        </div>
      </div>

      <InventoryOverview />

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Stock Bajo</CardTitle>
          <CardDescription>
            Productos que requieren atención inmediata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LowStockAlert />
        </CardContent>
      </Card>
    </div>
  )
}
