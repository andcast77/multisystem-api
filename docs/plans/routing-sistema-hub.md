# Plan: Sistema de Routing y Detección de Módulos

## Objetivo

Implementar un sistema de routing unificado en el hub que permita:
- Detectar el módulo activo desde la URL
- Navegar entre módulos manteniendo contexto
- Mostrar navegación contextual por módulo
- Manejar rutas del hub vs rutas de módulos

## Archivos a Crear/Modificar

### 1. `hub/src/components/layout/HubLayout.tsx` (nuevo)

Layout principal del hub que detecta módulos:

```typescript
'use client'

import { usePathname } from 'next/navigation'
import { getActiveModule, getEnabledModules } from '@/lib/modules/registry'
import { HubSidebar } from './HubSidebar'
import { HubHeader } from './HubHeader'

export function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeModule = getActiveModule(pathname || '')
  const modules = getEnabledModules()

  return (
    <div className="flex h-screen bg-gray-50">
      <HubSidebar 
        modules={modules} 
        activeModule={activeModule}
        currentPath={pathname || ''}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <HubHeader activeModule={activeModule} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 2. `hub/src/components/layout/HubSidebar.tsx` (nuevo)

Sidebar con navegación de módulos:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ModuleConfig } from '@/lib/modules/registry'

interface HubSidebarProps {
  modules: ModuleConfig[]
  activeModule?: ModuleConfig
  currentPath: string
}

export function HubSidebar({ modules, activeModule, currentPath }: HubSidebarProps) {
  const pathname = usePathname()

  const isActive = (module: ModuleConfig) => {
    return activeModule?.id === module.id
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">MultiSystem</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {/* Link al hub principal */}
        <Link
          href="/"
          className={`block px-4 py-2 rounded-lg transition-colors ${
            !activeModule
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>🏠</span>
            <span>Inicio</span>
          </span>
        </Link>

        {/* Módulos */}
        {modules.map((module) => (
          <Link
            key={module.id}
            href={module.route}
            className={`block px-4 py-2 rounded-lg transition-colors ${
              isActive(module)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{module.icon || '📦'}</span>
              <span>{module.name}</span>
            </span>
          </Link>
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div className="p-4 border-t border-gray-800 text-sm text-gray-400">
        <p>v1.0.0</p>
      </div>
    </aside>
  )
}
```

### 3. `hub/src/components/layout/HubHeader.tsx` (nuevo)

Header que muestra información del módulo activo:

```typescript
'use client'

import { ModuleConfig } from '@/lib/modules/registry'

interface HubHeaderProps {
  activeModule?: ModuleConfig
}

export function HubHeader({ activeModule }: HubHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          {activeModule ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeModule.icon}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {activeModule.name}
                </h2>
                {activeModule.description && (
                  <p className="text-sm text-gray-500">
                    {activeModule.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-semibold text-gray-900">
              MultiSystem Hub
            </h2>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Aquí irían acciones del usuario, notificaciones, etc. */}
        </div>
      </div>
    </header>
  )
}
```

### 4. `hub/src/hooks/useActiveModule.ts` (actualizar)

Hook mejorado con más utilidades:

```typescript
'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { 
  getActiveModule, 
  getModuleRelativePath,
  isModuleRoute,
  type ModuleConfig 
} from '@/lib/modules/registry'

export function useActiveModule() {
  const pathname = usePathname()
  
  const activeModule = useMemo(() => {
    return getActiveModule(pathname || '')
  }, [pathname])

  const relativePath = useMemo(() => {
    if (!activeModule) return pathname || ''
    return getModuleRelativePath(pathname || '', activeModule.id)
  }, [pathname, activeModule])

  const isModule = useMemo(() => {
    if (!pathname || !activeModule) return false
    return isModuleRoute(pathname, activeModule.id)
  }, [pathname, activeModule])

  return {
    activeModule,
    relativePath,
    isModule,
    pathname: pathname || '',
  }
}
```

### 5. Actualizar `hub/src/app/layout.tsx`

Integrar HubLayout:

```typescript
import type { Metadata } from 'next'
import './globals.css'
import { HubLayout } from '@/components/layout/HubLayout'

export const metadata: Metadata = {
  title: 'MultiSystem Hub',
  description: 'Plataforma unificada para gestión empresarial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <HubLayout>{children}</HubLayout>
      </body>
    </html>
  )
}
```

### 6. Actualizar rutas de módulos

Las rutas catch-all (`hub/src/app/(modules)/shopflow/[...paths]/page.tsx`) pueden simplificarse o eliminarse si se usa Nginx en producción, ya que Nginx manejará el proxy directamente.

Para desarrollo con rewrites, estas páginas pueden mostrar un loading state o redireccionar.

### 7. `hub/src/app/(modules)/layout.tsx` (nuevo)

Layout específico para rutas de módulos (opcional):

```typescript
export default function ModulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Este layout puede aplicar estilos específicos para módulos
  // o manejar lógica especial
  return <>{children}</>
}
```

## Flujo de Navegación

```
Usuario accede a /shopflow/dashboard
  ↓
HubLayout detecta módulo activo (shopflow)
  ↓
HubSidebar resalta "ShopFlow" como activo
  ↓
HubHeader muestra información de ShopFlow
  ↓
Nginx/rewrite proxy a shopflow-frontend/dashboard
  ↓
Si usuario navega a /workify/employees
  ↓
HubLayout actualiza módulo activo (workify)
  ↓
HubSidebar resalta "Workify"
  ↓
HubHeader muestra información de Workify
```

## Consideraciones

### 1. Rutas del Hub vs Rutas de Módulos

- Rutas del Hub (ej: `/`, `/about`): Se renderizan directamente en el hub
- Rutas de Módulos (ej: `/shopflow/*`, `/workify/*`): Se proxy a los frontends

### 2. Detección de Módulo Activo

La detección se hace comparando el pathname con las rutas configuradas de módulos.

### 3. Navegación

Los links en el sidebar usan `next/link` para navegación del lado del cliente.

### 4. Estado Compartido

Si los módulos necesitan compartir estado (ej: usuario autenticado), se puede usar:
- Cookies/headers compartidos
- Context API en el hub
- Estado en URL (query params)

## Testing

1. Verificar que `/` muestra el hub sin módulo activo
2. Verificar que `/shopflow/*` detecta shopflow como activo
3. Verificar que `/workify/*` detecta workify como activo
4. Verificar que la navegación entre módulos funciona
5. Verificar que el sidebar resalta el módulo correcto
6. Verificar que el header muestra información del módulo activo
