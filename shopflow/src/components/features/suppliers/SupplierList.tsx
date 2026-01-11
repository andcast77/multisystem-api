'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSuppliers } from '@/hooks/useSuppliers'
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
import { Plus, Search, Truck, Mail, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function SupplierList() {
  const [search, setSearch] = useState('')
  const { data: suppliers, isLoading, error } = useSuppliers()

  const filteredSuppliers = suppliers?.filter((s) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) : true
  )

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 text-gray-500">Cargando proveedores...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center p-8 text-red-500">Error: {String(error)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar proveedores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </Link>
      </div>

      {filteredSuppliers && filteredSuppliers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      {supplier.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {supplier.phone}
                        </div>
                      )}
                      {!supplier.email && !supplier.phone && (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.city ? (
                      <span className="text-sm">{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.active ? 'default' : 'secondary'}>
                      {supplier.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/suppliers/${supplier.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Truck className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No hay proveedores</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? 'No se encontraron proveedores.' : 'Comienza agregando tu primer proveedor.'}
          </p>
          {!search && (
            <Link href="/suppliers/new" className="mt-4">
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
