'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useCreateProduct } from '@/hooks/useProducts'
import { ProductForm } from '@/components/features/products/ProductForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import type { CreateProductInput, UpdateProductInput } from '@/lib/validations/product'

export default function NewProductPage() {
  const router = useRouter()
  const createProduct = useCreateProduct()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: CreateProductInput | UpdateProductInput) => {
    try {
      setError(null)
      // En la página de nuevo producto, todos los campos requeridos deben estar presentes
      const createData = data as CreateProductInput
      await createProduct.mutateAsync(createData)
      router.push('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el producto')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
          <p className="text-muted-foreground">
            Agrega un nuevo producto a tu inventario
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Producto</CardTitle>
          <CardDescription>
            Completa los datos del producto. Los campos marcados con * son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <ProductForm onSubmit={handleSubmit} isLoading={createProduct.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}
