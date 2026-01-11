'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import { CustomerForm } from '@/components/features/customers/CustomerForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trash2, Mail, MapPin, ShoppingBag, Gift } from 'lucide-react'
import type { UpdateCustomerInput } from '@/lib/validations/customer'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: customer, isLoading, error } = useCustomer(id)
  
  // Type assertion to include sales and _count that come from API
  const customerWithSales = customer as typeof customer & {
    sales?: Array<{
      id: string
      invoiceNumber: string | null
      total: number
      status: string
      createdAt: Date
    }>
    _count?: {
      sales: number
    }
  }
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const handleSubmit = async (data: UpdateCustomerInput) => {
    try {
      setErrorMessage(null)
      await updateCustomer.mutateAsync({ id, data })
      router.push('/customers')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar el cliente')
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setErrorMessage(null)
      await deleteCustomer.mutateAsync(id)
      router.push('/customers')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al eliminar el cliente')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Cargando cliente...</div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Cliente no encontrado</h1>
          <Link href="/customers">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Clientes
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">
              {error instanceof Error ? error.message : 'El cliente solicitado no existe'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground">Información y historial del cliente</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers">
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
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el cliente{' '}
                  <strong>{customer.name}</strong>.
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

      {/* Customer Info Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.email && (
              <div className="text-sm">
                <div className="font-medium">Email</div>
                <div className="text-gray-500">{customer.email}</div>
              </div>
            )}
            {customer.phone && (
              <div className="mt-2 text-sm">
                <div className="font-medium">Teléfono</div>
                <div className="text-gray-500">{customer.phone}</div>
              </div>
            )}
            {!customer.email && !customer.phone && (
              <div className="text-sm text-gray-400">Sin información de contacto</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.address || customer.city ? (
              <div className="text-sm">
                {customer.address && <div>{customer.address}</div>}
                {customer.city && (
                  <div className="text-gray-500">
                    {customer.city}
                    {customer.state && `, ${customer.state}`}
                    {customer.postalCode && ` ${customer.postalCode}`}
                  </div>
                )}
                {customer.country && (
                  <div className="text-gray-500">{customer.country}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400">Sin dirección registrada</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customerWithSales._count?.sales || 0}
            </div>
            <div className="text-xs text-gray-500">Total de compras</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Puntos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <div className="text-xs text-gray-500">Puntos de lealtad</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      {customerWithSales.sales && customerWithSales.sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimas Compras</CardTitle>
            <CardDescription>
              Historial reciente de compras del cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerWithSales.sales?.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.invoiceNumber || `#${sale.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>{formatDate(sale.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === 'COMPLETED'
                            ? 'default'
                            : sale.status === 'CANCELLED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {sale.status === 'COMPLETED'
                          ? 'Completada'
                          : sale.status === 'CANCELLED'
                            ? 'Cancelada'
                            : 'Pendiente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Cliente</CardTitle>
          <CardDescription>
            Modifica la información del cliente. El nombre es obligatorio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          )}
          <CustomerForm
            initialData={customer}
            onSubmit={handleSubmit}
            isLoading={updateCustomer.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
