# Plan Fase 3: Sincronización Bidireccional Mejorada

## Objetivo

Mejorar la sincronización bidireccional para manejar conflictos, optimizar el proceso, y asegurar consistencia de datos entre cliente y servidor.

## Problemas Actuales Identificados

1. La sincronización actual es básica y no maneja conflictos bien
2. No hay resolución de conflictos cuando el servidor y cliente tienen versiones diferentes
3. La sincronización puede ser lenta con muchos datos
4. No hay indicadores claros de qué se está sincronizando

## Implementación

### 1. Mejorar Servicio de Sincronización

**Archivo:** `src/lib/services/syncService.ts`

**Mejoras:**
- Implementar resolución de conflictos (última escritura gana o merge manual)
- Sincronización incremental (solo cambios desde última sync)
- Sincronización en lotes para mejor rendimiento
- Manejo de errores mejorado con reintentos

### 2. Agregar Timestamps de Sincronización

**Archivo:** `src/lib/utils/indexedDB.ts`

**Cambios:**
- Agregar campos `lastSyncedAt` y `localModifiedAt` a los datos
- Detectar qué datos han cambiado localmente
- Detectar qué datos han cambiado en el servidor

### 3. Crear Sistema de Resolución de Conflictos

**Archivo:** `src/lib/services/conflictResolver.ts` (nuevo)

**Funcionalidad:**
- Detectar conflictos (mismo registro modificado en ambos lados)
- Estrategias de resolución:
  - Última escritura gana (default)
  - Merge automático (para campos no conflictivos)
  - Requerir resolución manual (para conflictos críticos)

### 4. Mejorar UI de Sincronización

**Archivo:** `src/components/features/pwa/SyncStatus.tsx`

**Mejoras:**
- Mostrar progreso detallado por tipo de dato
- Mostrar conflictos que requieren atención
- Permitir resolver conflictos manualmente
- Mostrar historial de sincronizaciones

### 5. Optimizar Sincronización Incremental

**Archivo:** `src/lib/services/syncService.ts`

**Cambios:**
- Solo sincronizar datos modificados desde última sync
- Usar timestamps para determinar qué sincronizar
- Sincronizar en orden de prioridad (ventas primero)

## Archivos a Crear/Modificar

### Nuevos archivos:
- `src/lib/services/conflictResolver.ts` - Resolución de conflictos
- `src/components/features/pwa/ConflictResolver.tsx` - UI para resolver conflictos

### Archivos a modificar:
- `src/lib/services/syncService.ts` - Mejorar sincronización
- `src/lib/utils/indexedDB.ts` - Agregar timestamps
- `src/components/features/pwa/SyncStatus.tsx` - Mejorar UI

## Criterios de Éxito

- La sincronización es rápida y eficiente
- Los conflictos se detectan y resuelven apropiadamente
- El usuario tiene control sobre la resolución de conflictos
- La sincronización es transparente y no interrumpe el trabajo
- Los datos están siempre consistentes después de sincronizar
