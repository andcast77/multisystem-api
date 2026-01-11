'use client'

import Link from 'next/link'
import { useLowStockProducts } from '@/hooks/useInventory'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function LowStockAlert() {
  const { data: products, isLoading, error } = useLowStockProducts()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Cargando productos con stock bajo...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error al cargar productos: {String(error)}</div>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <Package className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">No hay productos con stock bajo</h3>
        <p className="mt-2 text-sm text-gray-500">
          Todos los productos tienen suficiente inventario.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">
          Productos con Stock Bajo ({products.length})
        </h3>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Stock Actual</TableHead>
              <TableHead>Stock Mínimo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-gray-500">{product.sku}</TableCell>
                <TableCell>
                  {product.category ? (
                    <Badge variant="outline">{product.category.name}</Badge>
                  ) : (
                    <span className="text-gray-400">Sin categoría</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-red-600">{product.stock}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600">{product.minStock}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/products/${product.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver Producto
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
