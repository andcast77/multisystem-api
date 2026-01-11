'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download, Trash2, HardDrive } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Backup {
  id: string
  filename: string
  createdAt: Date
  size: number
  type: 'database' | 'data_export'
  format: 'sql' | 'json' | 'csv'
}

async function fetchBackups(): Promise<Backup[]> {
  const response = await fetch('/api/admin/backup/list')
  if (!response.ok) {
    throw new Error('Failed to fetch backups')
  }
  const data = await response.json()
  return data.backups || []
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function BackupList() {
  const { data: backups, isLoading, error, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: fetchBackups,
  })

  const handleDownload = (filename: string) => {
    window.open(`/api/admin/backup/download/${filename}`, '_blank')
  }

  const handleDelete = async (filename: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este respaldo?')) return
    try {
      const response = await fetch(`/api/admin/backup/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      if (!response.ok) throw new Error('Failed to delete backup')
      refetch()
    } catch (err) {
      alert('Error al eliminar el respaldo: ' + String(err))
    }
  }

  if (isLoading) return <div className="flex items-center justify-center p-8 text-gray-500">Cargando respaldos...</div>
  if (error) return <div className="flex items-center justify-center p-8 text-red-500">Error: {String(error)}</div>

  if (!backups || backups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <HardDrive className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">No hay respaldos</h3>
        <p className="mt-2 text-sm text-gray-500">Aún no se han creado respaldos del sistema.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Archivo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Tamaño</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {backups.map((backup) => (
            <TableRow key={backup.id}>
              <TableCell className="font-medium">{backup.filename}</TableCell>
              <TableCell>
                <span className="text-sm">{backup.type === 'database' ? 'Base de Datos' : 'Exportación'}</span>
              </TableCell>
              <TableCell>
                {format(new Date(backup.createdAt), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}
              </TableCell>
              <TableCell>{formatFileSize(backup.size)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(backup.filename)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(backup.filename)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
