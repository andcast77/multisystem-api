'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCustomers } from '@/hooks/useCustomers'
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
import { Plus, Search, User, Mail, Phone } from 'lucide-react'
import type { Customer } from '@prisma/client'

interface CustomerListProps {
  onCustomerClick?: (customer: Customer) => void
}

export function CustomerList({ onCustomerClick }: CustomerListProps) {
  const [search, setSearch] = useState('')

  const query = {
    search: search || undefined,
  }

  const { data: customers, isLoading, error } = useCustomers(query)

  // Type assertion to include _count that comes from API
  const customersWithCount = (customers || []).map(customer => customer as typeof customer & {
    _count?: {
      sales: number
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Cargando clientes...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error al cargar clientes: {String(error)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/customers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Customers Table */}
      {customersWithCount && customersWithCount.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Compras</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersWithCount.map((customer) => (
                <TableRow
                  key={customer.id}
                  className={onCustomerClick ? 'cursor-pointer' : ''}
                  onClick={() => onCustomerClick?.(customer)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {customer.email}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {customer.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.city ? (
                      <span>{customer.city}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer._count?.sales !== undefined ? (
                      <span>{customer._count.sales}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <User className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No hay clientes</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? 'No se encontraron clientes que coincidan con tu búsqueda.'
              : 'Comienza agregando tu primer cliente.'}
          </p>
          {!search && (
            <Link href="/customers/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
