'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useCategory, useUpdateCategory } from '@/hooks/useCategories'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateCategorySchema, type UpdateCategoryInput } from '@/lib/validations/category'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function CategoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { data: category, isLoading } = useCategory(id)
  const updateCategory = useUpdateCategory()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateCategoryInput>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: category || {},
  })

  const onSubmit = async (data: UpdateCategoryInput) => {
    try {
      setError(null)
      await updateCategory.mutateAsync({ id, data })
      router.push('/categories')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la categoría')
    }
  }

  if (isLoading) return <div className="flex items-center justify-center p-8 text-gray-500">Cargando...</div>
  if (!category) return <div className="flex items-center justify-center p-8 text-red-500">Categoría no encontrada</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
          <p className="text-muted-foreground">Editar información de la categoría</p>
        </div>
        <Link href="/categories">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Editar Categoría</CardTitle>
          <CardDescription>Modifica la información de la categoría</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register('name')} defaultValue={category.name} className={errors.name ? 'border-red-500' : ''} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" {...register('description')} defaultValue={category.description || ''} rows={4} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
