# Plan: Proxy Reverse en Desarrollo - Hub como Proxy Reverso

## Objetivo

Configurar el hub para funcionar como proxy reverso en desarrollo, permitiendo que las rutas `/shopflow/*` y `/workify/*` sean proxeadas directamente a sus respectivos frontends sin redirecciones, manteniendo la URL del hub visible para el usuario.

## Arquitectura

```
Usuario → http://localhost:3005/shopflow/dashboard
         ↓
    Hub (Next.js)
         ↓ (rewrite)
    http://shopflow-frontend:3003/dashboard
```

## Archivos a Modificar

### 1. `hub/next.config.js`

Configurar rewrites para desarrollo que proxy las rutas de módulos a sus frontends:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const shopflowUrl = process.env.NEXT_PUBLIC_SHOPFLOW_URL || 'http://localhost:3003'
    const workifyUrl = process.env.NEXT_PUBLIC_WORKIFY_URL || 'http://localhost:3004'
    
    return [
      {
        source: '/shopflow/:path*',
        destination: `${shopflowUrl}/:path*`,
      },
      {
        source: '/workify/:path*',
        destination: `${workifyUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
```

**Nota**: Next.js rewrites tiene limitaciones para aplicaciones Next.js completas (no funciona bien con SSR dinámico). Esta solución es principalmente para desarrollo.

### 2. `hub/src/lib/modules/config.ts` (nuevo)

Crear archivo de configuración centralizada de módulos:

```typescript
export interface ModuleConfig {
  id: string
  name: string
  route: string
  url: string
  enabled: boolean
}

export const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: 'shopflow',
    name: 'ShopFlow',
    route: '/shopflow',
    url: process.env.NEXT_PUBLIC_SHOPFLOW_URL || 'http://localhost:3003',
    enabled: true,
  },
  {
    id: 'workify',
    name: 'Workify',
    route: '/workify',
    url: process.env.NEXT_PUBLIC_WORKIFY_URL || 'http://localhost:3004',
    enabled: true,
  },
]

export function getModuleConfig(moduleId: string): ModuleConfig | undefined {
  return MODULES_CONFIG.find(m => m.id === moduleId)
}

export function getModuleByRoute(route: string): ModuleConfig | undefined {
  return MODULES_CONFIG.find(m => route.startsWith(m.route))
}
```

### 3. `docker-compose.yml`

Actualizar variables de entorno del hub para usar nombres de contenedores Docker:

```yaml
hub-frontend:
  environment:
    NEXT_PUBLIC_SHOPFLOW_URL: http://shopflow-frontend:3003
    NEXT_PUBLIC_WORKIFY_URL: http://workify-frontend:3004
```

### 4. Variables de Entorno

Crear `.env.example` en `hub/`:

```env
# URLs de módulos (para desarrollo local sin Docker)
NEXT_PUBLIC_SHOPFLOW_URL=http://localhost:3003
NEXT_PUBLIC_WORKIFY_URL=http://localhost:3004

# URL de API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Limitaciones de Next.js Rewrites

**Importante**: Next.js rewrites tiene limitaciones significativas:

1. **No funciona bien con SSR dinámico**: Las aplicaciones Next.js que usan `getServerSideProps` o Server Components pueden tener problemas
2. **No proxy WebSockets**: No funciona para conexiones WebSocket o Server-Sent Events
3. **Headers limitados**: Algunos headers pueden no propagarse correctamente
4. **Solo para desarrollo**: Para producción, se recomienda usar Nginx u otro reverse proxy

## Alternativa: Middleware de Next.js

Si los rewrites no funcionan correctamente, se puede usar middleware para hacer proxy HTTP:

### `hub/src/middleware.ts` (alternativa)

```typescript
import { NextRequest, NextResponse } from 'next/server'

const MODULES = {
  shopflow: process.env.NEXT_PUBLIC_SHOPFLOW_URL || 'http://localhost:3003',
  workify: process.env.NEXT_PUBLIC_WORKIFY_URL || 'http://localhost:3004',
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Verificar si es una ruta de módulo
  for (const [module, url] of Object.entries(MODULES)) {
    if (pathname.startsWith(`/${module}/`)) {
      const targetPath = pathname.replace(`/${module}`, '')
      const targetUrl = new URL(targetPath || '/', url)
      
      try {
        const response = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        })
        
        return new NextResponse(response.body, {
          status: response.status,
          headers: response.headers,
        })
      } catch (error) {
        return NextResponse.json(
          { error: `Error proxying to ${module}` },
          { status: 502 }
        )
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/shopflow/:path*', '/workify/:path*'],
}
```

**Nota**: El middleware también tiene limitaciones y puede no funcionar bien para aplicaciones Next.js completas.

## Recomendación

Para desarrollo local sin Docker, los rewrites pueden funcionar para casos simples. Para desarrollo con Docker o producción, se recomienda usar Nginx (ver Épica 3).

## Testing

1. Iniciar shopflow-frontend en puerto 3003
2. Iniciar workify-frontend en puerto 3004
3. Iniciar hub-frontend en puerto 3005
4. Acceder a `http://localhost:3005/shopflow/` y verificar que se proxy correctamente
5. Acceder a `http://localhost:3005/workify/` y verificar que se proxy correctamente
