'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { HardDrive, Loader2 } from 'lucide-react'

export function CreateBackupButton() {
  const [isCreating, setIsCreating] = useState(false)
  const queryClient = useQueryClient()

  const handleCreate = async () => {
    if (!confirm('¿Deseas crear un respaldo de la base de datos ahora?')) return

    try {
      setIsCreating(true)
      const response = await fetch('/api/admin/backup/create', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create backup')
      }
      await queryClient.invalidateQueries({ queryKey: ['backups'] })
      alert('Respaldo creado exitosamente')
    } catch (err) {
      alert('Error al crear respaldo: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={isCreating}>
      {isCreating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creando...
        </>
      ) : (
        <>
          <HardDrive className="mr-2 h-4 w-4" />
          Crear Respaldo
        </>
      )}
    </Button>
  )
}
