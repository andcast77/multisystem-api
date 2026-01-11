'use client'

import { CustomerList } from '@/components/features/customers/CustomerList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Gestiona tu base de datos de clientes y su información de contacto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Busca y gestiona todos tus clientes desde aquí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerList />
        </CardContent>
      </Card>
    </div>
  )
}
