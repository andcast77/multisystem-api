'use client'

import Link from 'next/link'
import { LowStockAlert } from '@/components/features/inventory/LowStockAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export default function LowStockPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            Productos con Stock Bajo
          </h1>
          <p className="text-muted-foreground">
            Productos que requieren reposición inmediata
          </p>
        </div>
        <Link href="/inventory">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            Estos productos han alcanzado su nivel mínimo de stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LowStockAlert />
        </CardContent>
      </Card>
    </div>
  )
}
