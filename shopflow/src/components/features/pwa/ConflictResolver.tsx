'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Conflict } from '@/lib/services/conflictResolver'
import { syncService } from '@/lib/services/syncService'

interface ConflictResolverProps {
  conflicts: Conflict[]
  onResolved: () => void
}

export function ConflictResolver({ conflicts, onResolved }: ConflictResolverProps) {
  const [resolving, setResolving] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Set<string>>(new Set())

  if (conflicts.length === 0) {
    return null
  }

  const handleResolve = async (conflict: Conflict, resolution: 'local' | 'server' | 'merge') => {
    setResolving(conflict.id)
    try {
      await syncService.resolveConflict(conflict, resolution)
      setResolved((prev) => new Set([...prev, conflict.id]))
      onResolved()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setResolving(null)
    }
  }

  const getEntityName = (conflict: Conflict): string => {
    if (conflict.type === 'product') {
      return (conflict.local as { name?: string }).name || conflict.id
    }
    if (conflict.type === 'category') {
      return (conflict.local as { name?: string }).name || conflict.id
    }
    if (conflict.type === 'customer') {
      return (conflict.local as { name?: string }).name || conflict.id
    }
    if (conflict.type === 'supplier') {
      return (conflict.local as { name?: string }).name || conflict.id
    }
    return conflict.id
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const pendingConflicts = conflicts.filter((c) => !resolved.has(c.id))

  if (pendingConflicts.length === 0) {
    return (
      <Card className="fixed top-4 right-4 z-50 max-w-md shadow-lg border border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span>Todos los conflictos resueltos</span>
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="fixed top-4 right-4 z-50 max-w-md shadow-lg border border-yellow-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <span>Conflictos de sincronización</span>
          <Badge variant="destructive" className="ml-auto">
            {pendingConflicts.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Se detectaron conflictos entre datos locales y del servidor. Elige cómo resolverlos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {pendingConflicts.map((conflict) => {
          const isResolving = resolving === conflict.id
          const entityName = getEntityName(conflict)

          return (
            <div
              key={conflict.id}
              className="p-3 border border-gray-200 rounded-lg bg-white space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {entityName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {conflict.type}
                  </p>
                </div>
                {resolved.has(conflict.id) && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-blue-800 mb-1">Local</p>
                  <p className="text-blue-600">
                    Modificado: {formatDate(conflict.localModifiedAt)}
                  </p>
                </div>
                <div className="p-2 bg-purple-50 rounded border border-purple-200">
                  <p className="font-medium text-purple-800 mb-1">Servidor</p>
                  <p className="text-purple-600">
                    Modificado: {formatDate(conflict.serverModifiedAt)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(conflict, 'local')}
                  disabled={isResolving || resolved.has(conflict.id)}
                  className="flex-1 text-xs"
                >
                  Usar Local
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(conflict, 'server')}
                  disabled={isResolving || resolved.has(conflict.id)}
                  className="flex-1 text-xs"
                >
                  Usar Servidor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(conflict, 'merge')}
                  disabled={isResolving || resolved.has(conflict.id)}
                  className="flex-1 text-xs"
                >
                  Combinar
                </Button>
              </div>

              {isResolving && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Resolviendo...</span>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
