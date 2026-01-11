'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useCreateCustomer } from '@/hooks/useCustomers'
import { CustomerForm } from '@/components/features/customers/CustomerForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import type { CreateCustomerInput, UpdateCustomerInput } from '@/lib/validations/customer'

export default function NewCustomerPage() {
  const router = useRouter()
  const createCustomer = useCreateCustomer()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: CreateCustomerInput | UpdateCustomerInput) => {
    try {
      setError(null)
      // En la página de nuevo cliente, todos los campos requeridos deben estar presentes
      const createData = data as CreateCustomerInput
      await createCustomer.mutateAsync(createData)
      router.push('/customers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el cliente')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-muted-foreground">
            Agrega un nuevo cliente a tu base de datos
          </p>
        </div>
        <Link href="/customers">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>
            Completa los datos del cliente. El nombre es obligatorio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <CustomerForm onSubmit={handleSubmit} isLoading={createCustomer.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}
