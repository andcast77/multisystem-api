'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers'
import { SupplierForm } from '@/components/features/suppliers/SupplierForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Trash2, Mail, MapPin } from 'lucide-react'
import type { UpdateSupplierInput } from '@/lib/validations/supplier'
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

export default function SupplierDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { data: supplier, isLoading, error } = useSupplier(id)
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSubmit = async (data: UpdateSupplierInput) => {
    try {
      setErrorMessage(null)
      await updateSupplier.mutateAsync({ id, data })
      router.push('/suppliers')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar el proveedor')
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setErrorMessage(null)
      await deleteSupplier.mutateAsync(id)
      router.push('/suppliers')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al eliminar el proveedor')
      setIsDeleting(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center p-8 text-gray-500">Cargando proveedor...</div>
  if (error || !supplier) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Proveedor no encontrado</h1>
          <Link href="/suppliers"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
        </div>
        <Card><CardContent className="pt-6"><p className="text-red-500">{error instanceof Error ? error.message : 'No existe'}</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
          <p className="text-muted-foreground">Información del proveedor</p>
        </div>
        <div className="flex gap-2">
          <Link href="/suppliers"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción eliminará permanentemente el proveedor <strong>{supplier.name}</strong>.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" />Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            {supplier.email && <div className="text-sm"><div className="font-medium">Email</div><div className="text-gray-500">{supplier.email}</div></div>}
            {supplier.phone && <div className="mt-2 text-sm"><div className="font-medium">Teléfono</div><div className="text-gray-500">{supplier.phone}</div></div>}
            {!supplier.email && !supplier.phone && <div className="text-sm text-gray-400">Sin información de contacto</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" />Dirección</CardTitle>
          </CardHeader>
          <CardContent>
            {supplier.address || supplier.city ? (
              <div className="text-sm">
                {supplier.address && <div>{supplier.address}</div>}
                {supplier.city && <div className="text-gray-500">{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</div>}
              </div>
            ) : <div className="text-sm text-gray-400">Sin dirección registrada</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Editar Proveedor</CardTitle></CardHeader>
        <CardContent>
          {errorMessage && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>}
          <SupplierForm initialData={supplier} onSubmit={handleSubmit} isLoading={updateSupplier.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}
