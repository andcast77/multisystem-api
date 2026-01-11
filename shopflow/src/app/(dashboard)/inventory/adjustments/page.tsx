'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProducts } from '@/hooks/useProducts'
import { useAdjustInventory } from '@/hooks/useInventory'
import { InventoryAdjustmentForm } from '@/components/features/inventory/InventoryAdjustmentForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import type { AdjustInventoryInput } from '@/lib/validations/inventory'

export default function InventoryAdjustmentsPage() {
  const router = useRouter()
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const { data: productsData } = useProducts({ page: 1, limit: 1000 })
  const adjustInventory = useAdjustInventory()
  const [error, setError] = useState<string | null>(null)

  const products = productsData?.products || []
  const selectedProduct = products.find((p: any) => p.id === selectedProductId)

  const handleSubmit = async (data: AdjustInventoryInput) => {
    if (!selectedProductId) {
      setError('Por favor selecciona un producto')
      return
    }

    try {
      setError(null)
      await adjustInventory.mutateAsync({
        productId: selectedProductId,
        quantity: data.quantity,
        type: data.type,
      })
      router.push('/inventory')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ajustar el inventario')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ajustes de Inventario</h1>
          <p className="text-muted-foreground">
            Ajusta el stock de productos manualmente
          </p>
        </div>
        <Link href="/inventory">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Producto</CardTitle>
          <CardDescription>
            Elige el producto al que deseas ajustar el inventario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="product">Producto</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: any) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - SKU: {product.sku} (Stock: {product.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <>
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  {error}
                </div>
              )}
              <InventoryAdjustmentForm
                productId={selectedProduct.id}
                currentStock={selectedProduct.stock}
                onSubmit={handleSubmit}
                isLoading={adjustInventory.isPending}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
