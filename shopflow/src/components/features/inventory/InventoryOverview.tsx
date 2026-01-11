'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'

export function InventoryOverview() {
  const { data: productsData } = useProducts({ page: 1, limit: 1000 })
  const { data: lowStockData } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: async () => {
      const response = await fetch('/api/products/low-stock')
      if (!response.ok) throw new Error('Failed to fetch low stock')
      return response.json()
    },
  })

  const products = productsData?.products || []
  const lowStockProducts = lowStockData || []
  const totalProducts = products.length
  const activeProducts = products.filter((p: any) => p.active).length
  const totalStock = products.reduce((sum: number, p: any) => sum + p.stock, 0)
  const totalValue = products.reduce((sum: number, p: any) => sum + (p.stock * p.price), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            {activeProducts} activos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Unidades en inventario
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground">
            Valor del inventario
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {lowStockProducts.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Requieren atención
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
