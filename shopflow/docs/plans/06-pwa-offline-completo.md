---
name: PWA Offline Completo
overview: Implementar funcionalidad completa offline para que la aplicación pueda instalarse localmente y funcionar sin conexión a internet, incluyendo cache de assets, almacenamiento local de datos críticos, sincronización bidireccional y mejoras al service worker.
todos:
  - id: improve-service-worker
    content: Mejorar service worker (public/sw.js) con cache completo de assets y rutas
    status: completed
  - id: create-offline-storage
    content: Crear servicio de almacenamiento local (src/lib/services/offlineStorage.ts)
    status: completed
  - id: create-sync-service
    content: Crear servicio de sincronización (src/lib/services/syncService.ts)
    status: completed
  - id: create-indexeddb-utils
    content: Crear utilidades para IndexedDB (src/lib/utils/indexedDB.ts)
    status: completed
  - id: improve-offline-hook
    content: Mejorar hook useOffline con funcionalidades avanzadas
    status: completed
  - id: create-offline-data-hook
    content: Crear hook useOfflineData para acceder a datos offline
    status: completed
  - id: update-query-provider
    content: Configurar React Query para funcionar offline
    status: completed
  - id: update-data-hooks
    content: Actualizar hooks de datos para usar IndexedDB cuando offline
    status: completed
  - id: improve-auth-offline
    content: Mejorar manejo de autenticación offline
    status: completed
  - id: create-sync-status
    content: Crear componente SyncStatus para mostrar estado de sincronización
    status: completed
  - id: improve-offline-page
    content: Mejorar página offline con más información y controles
    status: completed
  - id: update-next-config
    content: Configurar next.config.ts para PWA completa
    status: completed
  - id: update-manifest
    content: Mejorar manifest.json con más iconos y configuración
    status: completed
  - id: test-offline-functionality
    content: Testing completo de funcionalidad offline - Guía creada en docs/testing/offline-testing-guide.md
    status: completed
---

# Plan: PWA Offline Completo - Instalación Local y Funcionamiento Sin Internet

## Contexto

La aplicación actualmente tiene una implementación básica de PWA con:
- Service Worker básico (`public/sw.js`)
- Cache de algunos assets estáticos
- Cola offline solo para ventas (POST requests)
- IndexedDB para almacenar requests offline
- Componentes PWA básicos (InstallPrompt, OfflineIndicator)

Sin embargo, falta funcionalidad completa para trabajar completamente offline:
- Cache completo de todas las páginas y assets
- Almacenamiento local de datos críticos (productos, categorías, clientes)
- Sincronización bidireccional completa
- Autenticación offline
- Cache de todas las rutas de la aplicación

## Objetivos

1. Cache completo de assets estáticos (JS, CSS, imágenes, fuentes)
2. Cache de todas las páginas de la aplicación
3. Almacenamiento local completo de datos críticos en IndexedDB
4. Sincronización bidireccional cuando vuelve la conexión
5. Autenticación offline funcional
6. Mejorar el service worker para Next.js 16
7. Optimizar estrategias de cache (Network-first, Cache-first, Stale-while-revalidate)

## Arquitectura

### Flujo de Datos Offline

```
Usuario sin conexión
    ↓
Service Worker intercepta requests
    ↓
¿Está en cache? → Sí → Servir desde cache
    ↓ No
¿Es datos críticos? → Sí → Servir desde IndexedDB
    ↓ No
¿Es POST/PUT/DELETE? → Sí → Guardar en cola offline
    ↓
Mostrar datos offline o mensaje apropiado
```

### Sincronización cuando vuelve conexión

```
Conexión restaurada
    ↓
Background Sync activado
    ↓
Sincronizar cola offline (ventas, actualizaciones)
    ↓
Actualizar cache con datos del servidor
    ↓
Actualizar IndexedDB con datos frescos
    ↓
Notificar al usuario
```

## Implementación

### 1. Mejorar Service Worker (`public/sw.js`)

**Cambios necesarios:**

- Expandir cache de assets estáticos para incluir todos los archivos Next.js
- Implementar cache de rutas dinámicas
- Mejorar estrategia de cache para diferentes tipos de recursos
- Agregar cache de imágenes y fuentes
- Implementar versionado de cache más robusto

**Estrategias de cache:**
- **Network-first con fallback a cache**: Para datos dinámicos (productos, ventas)
- **Cache-first**: Para assets estáticos (JS, CSS, imágenes)
- **Stale-while-revalidate**: Para datos que pueden estar desactualizados pero son útiles offline

### 2. Crear servicio de almacenamiento local (`src/lib/services/offlineStorage.ts`)

**Funcionalidades:**

- Abstracción sobre IndexedDB para almacenar datos críticos
- Métodos para guardar/recuperar productos, categorías, clientes, proveedores
- Sincronización con servidor cuando hay conexión
- Gestión de versiones de datos (timestamp de última actualización)
- Limpieza de datos antiguos

**Estructura de IndexedDB:**
- `products`: Almacenar productos completos
- `categories`: Categorías
- `customers`: Clientes
- `suppliers`: Proveedores
- `storeConfig`: Configuración de la tienda
- `offlineQueue`: Cola de operaciones pendientes
- `syncMetadata`: Metadatos de sincronización

### 3. Mejorar hook useOffline (`src/hooks/useOffline.ts`)

**Mejoras:**

- Detectar estado de sincronización
- Exponer métodos para forzar sincronización
- Mostrar progreso de sincronización
- Manejar errores de sincronización
- Detectar conflictos de datos

### 4. Crear servicio de sincronización (`src/lib/services/syncService.ts`)

**Funcionalidades:**

- Sincronizar datos locales con servidor
- Manejar conflictos (última escritura gana o merge manual)
- Sincronizar cola offline completa
- Actualizar cache después de sincronización
- Notificar al usuario sobre estado de sincronización

### 5. Mejorar manejo de autenticación offline

**Cambios:**

- Guardar token JWT en localStorage (ya existe en cookies, pero necesitamos acceso offline)
- Validar token localmente cuando no hay conexión
- Permitir acceso a funcionalidades básicas con token válido
- Mostrar advertencia si el token está próximo a expirar

### 6. Actualizar componentes para usar datos offline

**Componentes a modificar:**

- `ProductList`: Usar datos de IndexedDB cuando offline
- `CustomerList`: Usar datos de IndexedDB cuando offline
- `CategoryList`: Usar datos de IndexedDB cuando offline
- Hooks de datos (`useProducts`, `useCustomers`, etc.): Implementar fallback a IndexedDB

### 7. Mejorar cola offline (`public/sw.js`)

**Mejoras:**

- Soporte para más tipos de operaciones (PUT, DELETE, PATCH)
- Mejor manejo de errores
- Reintentos automáticos con backoff exponencial
- Priorización de operaciones críticas (ventas primero)

### 8. Configurar Next.js para PWA (`next.config.ts`)

**Cambios:**

- Agregar headers para PWA
- Configurar output: 'standalone' si es necesario
- Asegurar que el service worker se sirva correctamente
- Configurar cache headers apropiados

### 9. Actualizar manifest.json (`public/manifest.json`)

**Mejoras:**

- Agregar más iconos de diferentes tamaños
- Configurar display: 'standalone' correctamente
- Agregar screenshots para mejor experiencia de instalación
- Configurar theme_color y background_color apropiados

### 10. Crear página de estado offline mejorada (`src/app/offline/page.tsx`)

**Mejoras:**

- Mostrar qué datos están disponibles offline
- Mostrar estado de sincronización
- Permitir forzar sincronización manual
- Mostrar historial de operaciones pendientes

## Archivos a Crear/Modificar

### Nuevos archivos:
- `src/lib/services/offlineStorage.ts` - Servicio de almacenamiento local
- `src/lib/services/syncService.ts` - Servicio de sincronización
- `src/lib/utils/indexedDB.ts` - Utilidades para IndexedDB
- `src/hooks/useOfflineData.ts` - Hook para acceder a datos offline
- `src/components/features/pwa/SyncStatus.tsx` - Componente de estado de sincronización

### Archivos a modificar:
- `public/sw.js` - Mejorar service worker completo
- `src/hooks/useOffline.ts` - Mejorar funcionalidad
- `next.config.ts` - Configurar para PWA
- `public/manifest.json` - Mejorar configuración
- `src/app/offline/page.tsx` - Mejorar página offline
- `src/providers/query-provider.tsx` - Configurar React Query para offline
- Hooks de datos existentes - Agregar fallback a IndexedDB

## Consideraciones Técnicas

### Limitaciones de IndexedDB:
- Tamaño máximo variable por navegador (generalmente varios GB)
- Necesita manejo de versiones de esquema
- Operaciones asíncronas pueden ser complejas

### Estrategia de Cache:
- Usar versionado de cache para invalidar cuando hay actualizaciones
- Implementar limpieza automática de cache antiguo
- Balancear entre espacio de almacenamiento y datos disponibles

### Sincronización:
- Implementar resolución de conflictos (última escritura gana)
- Manejar casos donde el servidor rechaza datos offline
- Notificar al usuario sobre conflictos que requieren atención manual

### Seguridad:
- No almacenar información sensible en IndexedDB sin encriptar
- Validar datos antes de sincronizar
- Manejar tokens de autenticación de forma segura

## Testing

**Guía completa de testing disponible en:** [`docs/testing/offline-testing-guide.md`](../testing/offline-testing-guide.md)

### Escenarios a probar:
1. Instalación de PWA en dispositivo móvil
2. Funcionamiento completo sin conexión
3. Creación de ventas offline y sincronización
4. Actualización de productos offline
5. Sincronización cuando vuelve conexión
6. Manejo de conflictos de datos
7. Limpieza de cache cuando hay actualizaciones
8. Funcionamiento en diferentes navegadores

**Nota importante:** Para probar funcionalidad offline completa, es necesario usar un build de producción (`pnpm build` + `pnpm start`). El modo desarrollo (`pnpm dev`) siempre requiere el servidor corriendo.

## Fases de Implementación

### Fase 1: Mejoras al Service Worker
- Expandir cache de assets
- Implementar estrategias de cache mejoradas
- Mejorar cola offline

### Fase 2: Almacenamiento Local
- Crear servicio de IndexedDB
- Implementar almacenamiento de datos críticos
- Crear hooks para acceder a datos offline

### Fase 3: Sincronización
- Implementar servicio de sincronización
- Mejorar manejo de conflictos
- Agregar UI de estado de sincronización

### Fase 4: Integración y Testing
- Integrar con componentes existentes
- Testing completo
- Optimizaciones y mejoras
