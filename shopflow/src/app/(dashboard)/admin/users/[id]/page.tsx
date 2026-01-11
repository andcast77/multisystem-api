'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { UserForm } from '@/components/features/users/UserForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trash2, Mail, Shield } from 'lucide-react'
import type { UpdateUserInput } from '@/lib/validations/user'
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

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { data: user, isLoading, error } = useUser(id)
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default'
      case 'SUPERVISOR':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador'
      case 'SUPERVISOR':
        return 'Supervisor'
      case 'CASHIER':
        return 'Cajero'
      default:
        return role
    }
  }

  const handleSubmit = async (data: UpdateUserInput) => {
    try {
      setErrorMessage(null)
      // Remove password if empty (don't update it)
      if (!data.password || data.password === '') {
        const { password, ...dataWithoutPassword } = data
        await updateUser.mutateAsync({ id, data: dataWithoutPassword })
      } else {
        await updateUser.mutateAsync({ id, data })
      }
      router.push('/admin/users')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar el usuario')
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setErrorMessage(null)
      await deleteUser.mutateAsync(id)
      router.push('/admin/users')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al eliminar el usuario')
      setIsDeleting(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center p-8 text-gray-500">Cargando usuario...</div>
  if (error || !user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Usuario no encontrado</h1>
          <Link href="/admin/users"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
        </div>
        <Card><CardContent className="pt-6"><p className="text-red-500">{error instanceof Error ? error.message : 'No existe'}</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">Información y configuración del usuario</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción eliminará permanentemente el usuario <strong>{user.name}</strong>.</AlertDialogDescription>
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
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" />Información</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><div className="font-medium">Email</div><div className="text-gray-500">{user.email}</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4" />Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge>
              <div className="mt-2">
                <Badge variant={user.active ? 'default' : 'secondary'}>
                  {user.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Editar Usuario</CardTitle></CardHeader>
        <CardContent>
          {errorMessage && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>}
          <UserForm initialData={user} onSubmit={handleSubmit} isLoading={updateUser.isPending} isEdit={true} />
        </CardContent>
      </Card>
    </div>
  )
}
