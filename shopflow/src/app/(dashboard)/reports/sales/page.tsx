'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp } from 'lucide-react'

export default function SalesReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Ventas</h1>
          <p className="text-muted-foreground">
            Análisis detallado de ventas y transacciones
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
            Los reportes de ventas están disponibles en el dashboard principal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-12 text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Los reportes de ventas se muestran en el dashboard principal.</p>
              <p className="mt-2">Puedes acceder a estadísticas detalladas desde allí.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
