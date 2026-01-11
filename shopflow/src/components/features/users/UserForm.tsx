'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, type CreateUserInput, type UpdateUserInput } from '@/lib/validations/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserRole } from '@prisma/client'

interface UserFormProps {
  initialData?: Partial<CreateUserInput>
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>
  isLoading?: boolean
  isEdit?: boolean
}

export function UserForm({ initialData, onSubmit, isLoading, isEdit = false }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || UserRole.CASHIER,
      active: initialData?.active ?? true,
    },
  })

  const role = watch('role')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre Completo <span className="text-red-500">*</span></Label>
          <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
          <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">
            {isEdit ? 'Nueva Contraseña' : 'Contraseña'} {!isEdit && <span className="text-red-500">*</span>}
          </Label>
          <Input id="password" type="password" {...register('password')} className={errors.password ? 'border-red-500' : ''} />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          {isEdit && <p className="text-xs text-gray-500">Deja en blanco para mantener la contraseña actual</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
          <Select value={role} onValueChange={(value) => setValue('role', value as UserRole)}>
            <SelectTrigger id="role" className={errors.role ? 'border-red-500' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
              <SelectItem value={UserRole.SUPERVISOR}>Supervisor</SelectItem>
              <SelectItem value={UserRole.CASHIER}>Cajero</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="active" {...register('active')} className="h-4 w-4 rounded border-gray-300" />
        <Label htmlFor="active" className="font-normal">Usuario activo</Label>
      </div>
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : isEdit ? 'Actualizar Usuario' : 'Crear Usuario'}</Button>
      </div>
    </form>
  )
}
