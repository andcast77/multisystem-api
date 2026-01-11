'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts'
import { ProductForm } from '@/components/features/products/ProductForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trash2, Package, AlertTriangle } from 'lucide-react'
import type { UpdateProductInput } from '@/lib/validations/product'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: product, isLoading, error } = useProduct(id)
  
  // Type assertion to include category that comes from API
  const productWithCategory = product as typeof product & {
    category?: {
      id: string
      name: string
    }
  }
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  const handleSubmit = async (data: UpdateProductInput) => {
    try {
      setErrorMessage(null)
      await updateProduct.mutateAsync({ id, data })
      router.push('/products')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar el producto')
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setErrorMessage(null)
      await deleteProduct.mutateAsync(id)
      router.push('/products')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al eliminar el producto')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Cargando producto...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Producto no encontrado</h1>
          <Link href="/products">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Productos
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">
              {error instanceof Error ? error.message : 'El producto solicitado no existe'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLowStock = product.stock <= product.minStock

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground">Gestiona la información del producto</p>
        </div>
        <div className="flex gap-2">
          <Link href="/products">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el producto{' '}
                  <strong>{product.name}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Product Info Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-2xl font-bold">{product.stock}</div>
                <div className="text-xs text-gray-500">
                  Mínimo: {product.minStock}
                </div>
              </div>
              {isLowStock && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            {isLowStock && (
              <Badge variant="outline" className="mt-2 text-yellow-600">
                Stock Bajo
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Precio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(product.price)}</div>
            <div className="text-xs text-gray-500">
              Costo: {formatCurrency(product.cost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={product.active ? 'default' : 'secondary'}>
              {product.active ? 'Activo' : 'Inactivo'}
            </Badge>
            {productWithCategory.category && (
              <div className="mt-2">
                <Badge variant="outline">{productWithCategory.category.name}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Producto</CardTitle>
          <CardDescription>
            Modifica la información del producto. Los campos marcados con * son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          )}
          <ProductForm
            initialData={product}
            onSubmit={handleSubmit}
            isLoading={updateProduct.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
