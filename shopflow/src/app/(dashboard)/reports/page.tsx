'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, TrendingUp, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Visualiza y analiza los datos de tu negocio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reportes de Ventas
            </CardTitle>
            <CardDescription>
              Análisis detallado de ventas y transacciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports/sales">
              <Button className="w-full" variant="outline">
                Ver Reportes de Ventas
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Reportes de Inventario
            </CardTitle>
            <CardDescription>
              Estado del inventario y productos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports/inventory">
              <Button className="w-full" variant="outline">
                Ver Reportes de Inventario
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Dashboard Principal
            </CardTitle>
            <CardDescription>
              Vista general con estadísticas principales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full" variant="outline">
                Ir al Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
