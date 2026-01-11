# Plan Fase 2: Funcionamiento Offline Completo - Operaciones CRUD

## Objetivo

Asegurar que todas las operaciones CRUD (Create, Read, Update, Delete) funcionen completamente offline, guardando cambios localmente y sincronizándolos cuando haya conexión.

## Problemas Actuales Identificados

1. Las mutaciones (create, update, delete) fallan cuando no hay conexión
2. No hay cola offline para todas las operaciones, solo para ventas
3. Los hooks de datos no manejan bien el modo offline para escritura
4. Falta feedback visual cuando las operaciones están en cola offline

## Implementación

### 1. Mejorar Cola Offline en Service Worker

**Archivo:** `public/sw.js`

**Cambios:**
- Expandir `OFFLINE_QUEUE_PATTERNS` para incluir todas las operaciones CRUD
- Mejorar manejo de errores en la cola
- Agregar priorización inteligente (ventas primero, luego productos, etc.)

### 2. Crear Servicio de Cola Offline Mejorado

**Archivo:** `src/lib/services/offlineQueue.ts` (nuevo)

**Funcionalidad:**
- Abstracción sobre IndexedDB para la cola offline
- Métodos para agregar, listar, y procesar items de la cola
- Priorización automática
- Reintentos con backoff exponencial

### 3. Mejorar Hooks de Mutación para Modo Offline

**Archivos a modificar:**
- `src/hooks/useProducts.ts`
- `src/hooks/useCustomers.ts`
- `src/hooks/useCategories.ts`
- `src/hooks/useSuppliers.ts`

**Cambios:**
- Detectar cuando está offline
- Guardar mutaciones en cola offline en lugar de fallar
- Actualizar IndexedDB inmediatamente para feedback instantáneo
- Sincronizar cuando vuelva la conexión

### 4. Crear Hook de Cola Offline

**Archivo:** `src/hooks/useOfflineQueue.ts` (nuevo)

**Funcionalidad:**
- Hook para acceder a la cola offline
- Mostrar items pendientes
- Permitir reintentar items fallidos
- Mostrar progreso de sincronización

### 5. Mejorar Componente de Estado de Sincronización

**Archivo:** `src/components/features/pwa/SyncStatus.tsx`

**Mejoras:**
- Mostrar items en cola offline
- Mostrar progreso de sincronización
- Permitir sincronización manual
- Mostrar errores de sincronización

## Archivos a Crear/Modificar

### Nuevos archivos:
- `src/lib/services/offlineQueue.ts` - Servicio de cola offline mejorado
- `src/hooks/useOfflineQueue.ts` - Hook para acceder a la cola offline

### Archivos a modificar:
- `public/sw.js` - Expandir cola offline
- `src/hooks/useProducts.ts` - Manejar mutaciones offline
- `src/hooks/useCustomers.ts` - Manejar mutaciones offline
- `src/hooks/useCategories.ts` - Manejar mutaciones offline
- `src/hooks/useSuppliers.ts` - Manejar mutaciones offline
- `src/components/features/pwa/SyncStatus.tsx` - Mejorar UI

## Criterios de Éxito

- Todas las operaciones CRUD funcionan offline
- Los cambios se guardan localmente inmediatamente
- Los cambios se sincronizan automáticamente cuando hay conexión
- El usuario ve feedback claro sobre el estado de las operaciones
- Los conflictos se manejan apropiadamente
