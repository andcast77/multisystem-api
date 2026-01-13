# Plan: Configuración de Módulos y Variables de Entorno

## Objetivo

Crear un sistema centralizado de configuración de módulos para el hub que permita:
- Registrar módulos disponibles
- Gestionar URLs y configuraciones
- Detectar módulos activos desde rutas
- Expandir fácilmente con nuevos módulos

## Archivos a Crear/Modificar

### 1. `hub/src/lib/modules/config.ts` (nuevo)

Configuración centralizada de módulos:

```typescript
export interface ModuleConfig {
  id: string
  name: string
  route: string
  url: string
  enabled: boolean
  icon?: string
  color?: string
  description?: string
}

const MODULES: ModuleConfig[] = [
  {
    id: 'shopflow',
    name: 'ShopFlow',
    route: '/shopflow',
    url: process.env.NEXT_PUBLIC_SHOPFLOW_URL || 'http://localhost:3003',
    enabled: process.env.NEXT_PUBLIC_SHOPFLOW_ENABLED !== 'false',
    icon: '🛒',
    color: '#3B82F6',
    description: 'Punto de Venta y Gestión de Inventario',
  },
  {
    id: 'workify',
    name: 'Workify',
    route: '/workify',
    url: process.env.NEXT_PUBLIC_WORKIFY_URL || 'http://localhost:3004',
    enabled: process.env.NEXT_PUBLIC_WORKIFY_ENABLED !== 'false',
    icon: '👥',
    color: '#10B981',
    description: 'Recursos Humanos y Gestión de Empleados',
  },
]

export function getModuleConfig(moduleId: string): ModuleConfig | undefined {
  return MODULES.find(m => m.id === moduleId && m.enabled)
}

export function getModuleByRoute(route: string): ModuleConfig | undefined {
  return MODULES.find(m => m.enabled && route.startsWith(m.route))
}

export function getAllModules(): ModuleConfig[] {
  return MODULES.filter(m => m.enabled)
}

export function getModuleUrl(moduleId: string): string | undefined {
  return getModuleConfig(moduleId)?.url
}

export { MODULES as MODULES_CONFIG }
```

### 2. `hub/src/lib/modules/registry.ts` (nuevo)

Registro de módulos con tipos y utilidades:

```typescript
import { ModuleConfig, getAllModules, getModuleByRoute, getModuleConfig } from './config'

export type { ModuleConfig }

export interface ModuleRoute {
  path: string
  label: string
  icon?: string
  permissions?: string[]
}

export interface ModuleMetadata extends ModuleConfig {
  routes?: ModuleRoute[]
  version?: string
}

/**
 * Obtiene todos los módulos habilitados
 */
export function getEnabledModules(): ModuleConfig[] {
  return getAllModules()
}

/**
 * Obtiene configuración de módulo por ID
 */
export function getModule(moduleId: string): ModuleConfig | undefined {
  return getModuleConfig(moduleId)
}

/**
 * Detecta el módulo activo desde una ruta
 */
export function getActiveModule(pathname: string): ModuleConfig | undefined {
  return getModuleByRoute(pathname)
}

/**
 * Verifica si una ruta pertenece a un módulo
 */
export function isModuleRoute(pathname: string, moduleId: string): boolean {
  const module = getModule(moduleId)
  if (!module) return false
  return pathname.startsWith(module.route)
}

/**
 * Obtiene la ruta relativa del módulo (sin el prefijo)
 */
export function getModuleRelativePath(pathname: string, moduleId: string): string {
  const module = getModule(moduleId)
  if (!module) return pathname
  return pathname.replace(module.route, '') || '/'
}
```

### 3. `hub/.env.example` (nuevo)

Template de variables de entorno:

```env
# ==========================================
# URLs de Módulos
# ==========================================
# Desarrollo local (sin Docker)
NEXT_PUBLIC_SHOPFLOW_URL=http://localhost:3003
NEXT_PUBLIC_WORKIFY_URL=http://localhost:3004

# Desarrollo con Docker (usar nombres de contenedores)
# NEXT_PUBLIC_SHOPFLOW_URL=http://shopflow-frontend:3003
# NEXT_PUBLIC_WORKIFY_URL=http://workify-frontend:3004

# Habilitación de módulos
NEXT_PUBLIC_SHOPFLOW_ENABLED=true
NEXT_PUBLIC_WORKIFY_ENABLED=true

# ==========================================
# API
# ==========================================
NEXT_PUBLIC_API_URL=http://localhost:3000

# ==========================================
# Hub
# ==========================================
PORT=3005
NODE_ENV=development
```

### 4. Actualizar `hub/next.config.js`

Usar configuración de módulos:

```javascript
const { MODULES_CONFIG } = require('./src/lib/modules/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Solo en desarrollo, usar rewrites
    if (process.env.NODE_ENV === 'development') {
      return MODULES_CONFIG
        .filter(module => module.enabled)
        .map(module => ({
          source: `${module.route}/:path*`,
          destination: `${module.url}/:path*`,
        }))
    }
    return []
  },
}

module.exports = nextConfig
```

### 5. `hub/src/hooks/useActiveModule.ts` (nuevo)

Hook para detectar módulo activo:

```typescript
'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { getActiveModule } from '@/lib/modules/registry'

export function useActiveModule() {
  const pathname = usePathname()
  
  return useMemo(() => {
    return getActiveModule(pathname || '')
  }, [pathname])
}
```

### 6. Actualizar `docker-compose.yml`

Variables de entorno actualizadas:

```yaml
hub-frontend:
  environment:
    NEXT_PUBLIC_SHOPFLOW_URL: http://shopflow-frontend:3003
    NEXT_PUBLIC_WORKIFY_URL: http://workify-frontend:3004
    NEXT_PUBLIC_SHOPFLOW_ENABLED: "true"
    NEXT_PUBLIC_WORKIFY_ENABLED: "true"
    NEXT_PUBLIC_API_URL: http://api:3000
```

## Estructura de Archivos Resultante

```
hub/
├── src/
│   ├── lib/
│   │   └── modules/
│   │       ├── config.ts        # Configuración de módulos
│   │       └── registry.ts      # Registro y utilidades
│   └── hooks/
│       └── useActiveModule.ts   # Hook para módulo activo
├── .env.example                 # Template de variables
└── next.config.js               # Usa configuración de módulos
```

## Uso

### En componentes:

```typescript
import { getEnabledModules, getActiveModule } from '@/lib/modules/registry'

// Obtener todos los módulos
const modules = getEnabledModules()

// Detectar módulo activo
const activeModule = getActiveModule('/shopflow/dashboard')
```

### En hooks:

```typescript
'use client'
import { useActiveModule } from '@/hooks/useActiveModule'

export function MyComponent() {
  const activeModule = useActiveModule()
  // activeModule será el módulo actual o undefined
}
```

## Extensibilidad

Para agregar un nuevo módulo:

1. Agregar entrada en `MODULES` array en `config.ts`
2. Agregar variable de entorno en `.env.example`
3. El módulo estará disponible automáticamente

## Testing

1. Verificar que `getEnabledModules()` retorna módulos habilitados
2. Verificar que `getActiveModule('/shopflow/dashboard')` retorna shopflow
3. Verificar que módulos deshabilitados no aparecen
4. Verificar que las URLs se resuelven correctamente desde variables de entorno
