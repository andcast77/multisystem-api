'use client'

import { useState } from 'react'
import { StatsCards } from '@/components/features/reports/StatsCards'
import { DailySalesChart } from '@/components/features/reports/DailySalesChart'
import { TopProductsTable } from '@/components/features/reports/TopProductsTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInventoryStats } from '@/hooks/useReports'
import { formatCurrency } from '@/lib/utils/format'
import { Package, AlertTriangle, XCircle } from 'lucide-react'

export default function DashboardPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const { data: inventoryStats } = useInventoryStats()

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant={period === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('today')}
          >
            Hoy
          </Button>
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('week')}
          >
            Semana
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            Mes
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards period={period} />

      {/* Charts and Tables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <DailySalesChart days={period === 'today' ? 7 : period === 'week' ? 30 : 90} />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryStats ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Productos</span>
                  </div>
                  <span className="font-semibold">
                    {inventoryStats.totalProducts}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Stock Bajo</span>
                  </div>
                  <span className="font-semibold text-yellow-600">
                    {inventoryStats.lowStockProducts}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Sin Stock</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    {inventoryStats.outOfStockProducts}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Valor Total (Costo)
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(inventoryStats.totalValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Valor Total (Venta)
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(inventoryStats.totalRetailValue)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Cargando...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <TopProductsTable />
    </div>
  )
}
