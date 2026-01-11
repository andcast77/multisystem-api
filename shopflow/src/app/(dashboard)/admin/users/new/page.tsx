'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useCreateUser } from '@/hooks/useUsers'
import { UserForm } from '@/components/features/users/UserForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import type { CreateUserInput, UpdateUserInput } from '@/lib/validations/user'

export default function NewUserPage() {
  const router = useRouter()
  const createUser = useCreateUser()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: CreateUserInput | UpdateUserInput) => {
    try {
      setError(null)
      // En la página de nuevo usuario, todos los campos son requeridos
      const createData = data as CreateUserInput
      await createUser.mutateAsync(createData)
      router.push('/admin/users')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el usuario')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Usuario</h1>
          <p className="text-muted-foreground">Agrega un nuevo usuario al sistema</p>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información del Usuario</CardTitle>
          <CardDescription>Completa los datos del usuario. Los campos marcados con * son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}
          <UserForm onSubmit={handleSubmit} isLoading={createUser.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}
