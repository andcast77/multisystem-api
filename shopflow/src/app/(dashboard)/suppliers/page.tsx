'use client'

import { SupplierList } from '@/components/features/suppliers/SupplierList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
        <p className="text-muted-foreground">Gestiona tus proveedores y su información de contacto</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>Busca y gestiona todos tus proveedores desde aquí</CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierList />
        </CardContent>
      </Card>
    </div>
  )
}
