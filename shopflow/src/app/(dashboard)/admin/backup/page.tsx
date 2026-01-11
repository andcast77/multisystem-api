'use client'

import Link from 'next/link'
import { BackupList } from '@/components/features/backup/BackupList'
import { CreateBackupButton } from '@/components/features/backup/CreateBackupButton'
import { RestoreBackupDialog } from '@/components/features/backup/RestoreBackupDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, HardDrive } from 'lucide-react'

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Copias de Seguridad</h1>
          <p className="text-muted-foreground">
            Gestiona los respaldos de la base de datos y exportaciones de datos
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <CreateBackupButton />
          <RestoreBackupDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Respaldo de Base de Datos</CardTitle>
          <CardDescription>
            Crea respaldos completos de la base de datos PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-4">
            <HardDrive className="h-5 w-5 text-blue-600" />
            <div className="text-sm text-blue-800">
              Los respaldos se guardan en formato SQL comprimido y pueden restaurarse en cualquier momento.
            </div>
          </div>
          <CreateBackupButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respaldos Disponibles</CardTitle>
          <CardDescription>
            Lista de todos los respaldos creados. Puedes descargarlos o restaurarlos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupList />
        </CardContent>
      </Card>
    </div>
  )
}
