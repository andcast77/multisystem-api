'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useCreateSupplier } from '@/hooks/useSuppliers'
import { SupplierForm } from '@/components/features/suppliers/SupplierForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import type { CreateSupplierInput, UpdateSupplierInput } from '@/lib/validations/supplier'

export default function NewSupplierPage() {
  const router = useRouter()
  const createSupplier = useCreateSupplier()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: CreateSupplierInput | UpdateSupplierInput) => {
    try {
      setError(null)
      // En la página de nuevo proveedor, todos los campos requeridos deben estar presentes
      const createData = data as CreateSupplierInput
      await createSupplier.mutateAsync(createData)
      router.push('/suppliers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el proveedor')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Proveedor</h1>
          <p className="text-muted-foreground">Agrega un nuevo proveedor a tu base de datos</p>
        </div>
        <Link href="/suppliers">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información del Proveedor</CardTitle>
          <CardDescription>Completa los datos del proveedor. El nombre es obligatorio.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}
          <SupplierForm onSubmit={handleSubmit} isLoading={createSupplier.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}
