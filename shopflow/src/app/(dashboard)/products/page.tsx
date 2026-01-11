'use client'

import { ProductList } from '@/components/features/products/ProductList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
        <p className="text-muted-foreground">
          Gestiona tu inventario de productos, precios y stock
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            Busca, filtra y gestiona todos tus productos desde aquí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductList />
        </CardContent>
      </Card>
    </div>
  )
}
