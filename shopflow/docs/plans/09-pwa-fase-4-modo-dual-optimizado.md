# Plan Fase 4: Modo Dual Online/Offline Optimizado

## Objetivo

Optimizar el funcionamiento en ambos modos (online y offline) para que la transición sea transparente y el rendimiento sea óptimo en ambos casos.

## Problemas Actuales Identificados

1. La transición entre online/offline puede causar errores
2. No hay prefetching inteligente cuando está online
3. El cache puede volverse obsoleto sin indicación
4. No hay estrategia clara de cuándo usar cache vs red

## Implementación

### 1. Mejorar Detección de Estado Online/Offline

**Archivo:** `src/hooks/useOffline.ts`

**Mejoras:**
- Detección más robusta (no solo `navigator.onLine`)
- Verificar conectividad real con ping al servidor
- Manejar casos edge (conexión lenta, intermitente)
- Eventos personalizados para cambios de estado

### 2. Implementar Prefetching Inteligente

**Archivo:** `src/lib/services/prefetchService.ts` (nuevo)

**Funcionalidad:**
- Prefetching de datos cuando está online y hay tiempo
- Prefetching de páginas que el usuario probablemente visitará
- Prefetching basado en comportamiento del usuario
- No interferir con operaciones críticas

### 3. Mejorar Estrategias de Cache

**Archivo:** `public/sw.js`

**Cambios:**
- Cache más inteligente basado en tipo de dato
- Invalidación automática de cache obsoleto
- Stale-while-revalidate para mejor UX
- Cache de respuestas parciales para datos grandes

### 4. Crear Sistema de Priorización de Sincronización

**Archivo:** `src/lib/services/syncService.ts`

**Mejoras:**
- Priorizar sincronización de datos críticos
- Sincronización en background cuando está online
- Pausar sincronización durante operaciones críticas
- Reanudar automáticamente cuando es seguro

### 5. Optimizar Rendimiento Offline

**Archivo:** Múltiples archivos

**Cambios:**
- Lazy loading de componentes pesados
- Virtualización de listas grandes
- Debouncing de búsquedas offline
- Compresión de datos en IndexedDB

## Archivos a Crear/Modificar

### Nuevos archivos:
- `src/lib/services/prefetchService.ts` - Servicio de prefetching
- `src/lib/utils/cacheStrategy.ts` - Utilidades de estrategia de cache

### Archivos a modificar:
- `src/hooks/useOffline.ts` - Mejorar detección
- `public/sw.js` - Mejorar estrategias de cache
- `src/lib/services/syncService.ts` - Priorización

## Criterios de Éxito

- La transición online/offline es transparente
- El rendimiento es óptimo en ambos modos
- Los datos están siempre actualizados cuando es posible
- El usuario no nota diferencia entre modos
- El cache se mantiene eficiente y actualizado
