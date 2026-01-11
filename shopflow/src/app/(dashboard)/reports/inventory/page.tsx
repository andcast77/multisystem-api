'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package } from 'lucide-react'

export default function InventoryReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Inventario</h1>
          <p className="text-muted-foreground">
            Estado del inventario y productos
          </p>
        </div>
        <Link href="/reports">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes Disponibles</CardTitle>
          <CardDescription>
            Los reportes de inventario están disponibles en la sección de inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-12 text-gray-500">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Los reportes de inventario se muestran en la página de inventario.</p>
              <p className="mt-2">Puedes acceder a estadísticas detalladas desde allí.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
