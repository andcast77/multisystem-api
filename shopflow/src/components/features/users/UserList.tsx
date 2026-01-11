'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUsers } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, User as UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@prisma/client'

export function UserList() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const query = {
    search: search || undefined,
    role: roleFilter !== 'all' ? (roleFilter as UserRole) : undefined,
    page,
    limit: 20,
  }

  const { data, isLoading, error } = useUsers(query)

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'default'
      case 'SUPERVISOR':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: UserRole) => {
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

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 text-gray-500">Cargando usuarios...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center p-8 text-red-500">Error: {String(error)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar usuarios..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              <SelectItem value="CASHIER">Cajero</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link href="/admin/users/new">
          <Button><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Button>
        </Link>
      </div>

      {data && data.users.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'secondary'}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {((page - 1) * query.limit) + 1} - {Math.min(page * query.limit, data.pagination.total)} de {data.pagination.total}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages}>Siguiente</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <UserIcon className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No hay usuarios</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? 'No se encontraron usuarios.' : 'Comienza agregando tu primer usuario.'}
          </p>
          {!search && (
            <Link href="/admin/users/new" className="mt-4">
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
