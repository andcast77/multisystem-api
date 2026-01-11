# Plan: Arquitectura Multi-Módulo de Aplicaciones

## Objetivo

Transformar la estructura actual (dos aplicaciones Next.js independientes) en una plataforma donde **cada módulo (ShopFlow, Workify) sea un monorepo independiente** con su propio frontend y backend, integrados en una plataforma principal (hub), permitiendo agregar más módulos como monorepos independientes fácilmente.

## Arquitectura Propuesta

### Estructura de Directorios (Cada Módulo es un Monorepo Independiente)

```
multisystem/
├── hub/                         # Plataforma principal (monorepo)
│   ├── apps/
│   │   └── frontend/            # Frontend hub (Next.js)
│   │       ├── src/
│   │       │   ├── app/
│   │       │   │   ├── (auth)/   # Autenticación compartida
│   │       │   │   │   └── login/
│   │       │   │   ├── (modules)/ # Route group para módulos
│   │       │   │   │   ├── shopflow/[...paths]/ # Proxy a shopflow frontend
│   │       │   │   │   └── workify/[...paths]/  # Proxy a workify frontend
│   │       │   │   └── layout.tsx
│   │       │   ├── components/
│   │       │   │   └── layout/
│   │       │   │       └── HubSidebar.tsx # Navegación unificada
│   │       │   └── lib/
│   │       │       ├── api/      # Cliente API que apunta a APIs remotas
│   │       │       └── modules/
│   │       │           └── registry.ts # Registro de módulos
│   │       └── package.json
│   └── packages/
│       └── shared/              # Código compartido del hub
│           └── types/
├── shopflow/                    # Monorepo ShopFlow (solo frontend)
│   ├── apps/
│   │   └── frontend/            # Frontend ShopFlow (Next.js)
│   │       ├── src/
│   │       │   ├── app/
│   │       │   │   ├── dashboard/
│   │       │   │   ├── pos/
│   │       │   │   ├── products/
│   │       │   │   └── ...
│   │       │   ├── components/
│   │       │   ├── lib/
│   │       │   │   └── api/     # Cliente API que apunta a APIs remotas
│   │       │   └── hooks/
│   │       └── package.json
│   ├── packages/
│   │   └── shared/             # Código compartido ShopFlow
│   │       └── types/
│   ├── package.json             # Workspace root
│   └── pnpm-workspace.yaml
├── workify/                     # Monorepo Workify (solo frontend)
│   ├── apps/
│   │   └── frontend/            # Frontend Workify (Next.js)
│   │       ├── src/
│   │       │   ├── app/
│   │       │   │   ├── dashboard/
│   │       │   │   ├── employees/
│   │       │   │   ├── time-entries/
│   │       │   │   └── ...
│   │       │   ├── components/
│   │       │   ├── lib/
│   │       │   │   └── api/     # Cliente API que apunta a APIs remotas
│   │       │   └── hooks/
│   │       └── package.json
│   ├── packages/
│   │   └── shared/             # Código compartido Workify
│   │       └── types/
│   ├── package.json             # Workspace root
│   └── pnpm-workspace.yaml
└── api/                         # Monorepo de APIs (remoto, compartido)
    ├── apps/
    │   ├── shopflow-api/        # API endpoints de ShopFlow
    │   │   ├── src/
    │   │   │   ├── routes/
    │   │   │   │   ├── products/
    │   │   │   │   ├── sales/
    │   │   │   │   └── ...
    │   │   │   ├── controllers/
    │   │   │   └── services/
    │   │   └── package.json
    │   ├── workify-api/         # API endpoints de Workify
    │   │   ├── src/
    │   │   │   ├── routes/
    │   │   │   │   ├── employees/
    │   │   │   │   ├── time-entries/
    │   │   │   │   └── ...
    │   │   │   ├── controllers/
    │   │   │   └── services/
    │   │   └── package.json
    │   └── auth-api/            # API de autenticación (compartida)
    │       ├── src/
    │       │   ├── routes/
    │       │   │   ├── login/
    │       │   │   ├── register/
    │       │   │   └── me/
    │       │   └── services/
    │       └── package.json
    ├── packages/
    │   └── database/            # Base de datos centralizada (compartida)
    │       ├── prisma/
    │       │   └── schema.prisma # Schema unificado con todos los modelos
    │       └── src/
    │           └── client.ts    # Cliente Prisma compartido
    ├── package.json             # Workspace root
    └── pnpm-workspace.yaml
```

## Componentes Clave

### 1. Sistema de Registro de Módulos

**Archivo**: `hub/apps/frontend/src/lib/modules/registry.ts`

```typescript
export interface ModuleConfig {
  id: string
  name: string
  route: string           // Prefijo de ruta: '/shopflow', '/workify'
  icon: React.ComponentType
  color: string
  enabled: boolean
  routes: ModuleRoute[]
  permissions?: string[]
}

export interface ModuleRoute {
  path: string           // Ruta relativa al módulo
  label: string
  icon?: React.ComponentType
  permissions?: string[]
}

const modules: ModuleConfig[] = [
  {
    id: 'shopflow',
    name: 'ShopFlow',
    route: '/shopflow',
    icon: ShoppingCart,
    color: '#3B82F6',
    enabled: true,
    routes: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/pos', label: 'Punto de Venta' },
      // ...
    ]
  },
  {
    id: 'workify',
    name: 'Workify',
    route: '/workify',
    icon: Users,
    color: '#10B981',
    enabled: true,
    routes: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/employees', label: 'Empleados' },
      // ...
    ]
  }
]
```

### 2. Router de Módulos con Rutas Directas

**Archivo**: `hub/apps/frontend/src/app/(modules)/shopflow/[...paths]/page.tsx` y `hub/apps/frontend/src/app/(modules)/workify/[...paths]/page.tsx`

- Rutas directas para cada módulo: `/shopflow/*` y `/workify/*`
- Proxy o redirección a frontends de módulos externos
- Mantiene el contexto de autenticación

### 3. Layout Unificado con Navegación de Módulos

**Archivo**: `hub/apps/frontend/src/components/layout/HubSidebar.tsx`

- Sidebar principal que muestra todos los módulos disponibles
- Permite cambiar entre módulos
- Muestra navegación específica del módulo activo
- Permisos por módulo

## Flujo de Navegación

```
Usuario accede a /shopflow/dashboard
  ↓
Hub layout detecta módulo 'shopflow'
  ↓
HubSidebar muestra navegación de ShopFlow
  ↓
Catch-all route proxy/redirige a shopflow frontend
  ↓
Si cambia a /workify/employees
  ↓
HubSidebar actualiza a navegación de Workify
  ↓
Catch-all route proxy/redirige a workify frontend
```

## Migración de Aplicaciones Existentes

### Fase 1: Crear Estructura de Monorepos

1. Crear `api/` como monorepo para APIs compartidas
2. Crear `hub/` como monorepo para la plataforma principal
3. Crear `shopflow/` como monorepo independiente (solo frontend)
4. Crear `workify/` como monorepo independiente (solo frontend)
5. Configurar pnpm workspaces en cada monorepo

### Fase 2: Crear Monorepo de APIs

1. Crear `api/packages/database/` con Prisma schema unificado
2. Configurar cliente Prisma compartido
3. Crear `api/apps/shopflow-api/` con Express/Fastify/NestJS
4. Crear `api/apps/workify-api/` con Express/Fastify/NestJS
5. Crear `api/apps/auth-api/` para autenticación compartida
6. Todas las APIs usan la misma BD compartida

### Fase 3: Migrar ShopFlow a Monorepo

1. Mover `pos/` a `shopflow/apps/frontend/`
2. Eliminar APIs de ShopFlow (ahora están en `api/apps/shopflow-api/`)
3. Configurar cliente API que apunte a APIs remotas
4. Configurar estructura de monorepo en `shopflow/`

### Fase 4: Migrar Workify a Monorepo

1. Mover `workify/` a `workify/apps/frontend/`
2. Eliminar APIs de Workify (ahora están en `api/apps/workify-api/`)
3. Configurar cliente API que apunte a APIs remotas
4. Configurar estructura de monorepo en `workify/`

### Fase 5: Crear Hub de Integración

1. Crear `hub/apps/frontend/` como Next.js
2. Implementar sistema de registro de módulos
3. Crear catch-all routes que proxy/redirijan a módulos externos
4. Implementar layout unificado con navegación
5. Configurar comunicación entre hub y módulos

## APIs y Base de Datos Remotas y Compartidas

**Arquitectura**: APIs remotas compartidas en un monorepo separado que consumen directamente una base de datos remota compartida. Los frontends NO consumen la BD directamente, solo consumen las APIs.

### Flujo de Datos: ¿Quién consume qué?

```
┌─────────────────┐
│   Frontends     │  (shopflow, workify, hub)
│   (Next.js)     │
└────────┬────────┘
         │ HTTP Requests
         │ (fetch/axios)
         ▼
┌─────────────────┐
│   APIs Remotas  │  (api/apps/shopflow-api, workify-api, auth-api)
│   (Express/     │
│   Fastify/etc)  │
└────────┬────────┘
         │ Prisma Client
         │ (DATABASE_URL)
         ▼
┌─────────────────┐
│  Base de Datos  │  (PostgreSQL remota)
│   PostgreSQL    │  (multisystem_db)
└─────────────────┘
```

**Resumen**:
- ✅ **APIs consumen la BD**: Las APIs usan Prisma para conectarse directamente a PostgreSQL
- ❌ **Frontends NO consumen la BD**: Los frontends solo hacen HTTP requests a las APIs
- ✅ **BD es remota**: PostgreSQL está en un servidor (localhost en dev, servidor remoto en producción)

### APIs Remotas Compartidas

**Monorepo de APIs** (`api/`):

- `api/apps/shopflow-api/` → Endpoints de ShopFlow (puerto 3001)
  - **Consume BD directamente** usando Prisma desde `api/packages/database/`
- `api/apps/workify-api/` → Endpoints de Workify (puerto 3002)
  - **Consume BD directamente** usando Prisma desde `api/packages/database/`
- `api/apps/auth-api/` → Autenticación compartida (puerto 3000)
  - **Consume BD directamente** usando Prisma desde `api/packages/database/`

**Todas las APIs comparten**:
- La misma conexión de base de datos (`DATABASE_URL`)
- El mismo cliente Prisma (`api/packages/database/src/client.ts`)
- El mismo schema Prisma (`api/packages/database/prisma/schema.prisma`)

**Ventajas**:
- ✅ APIs centralizadas y compartidas
- ✅ Misma base de datos para todas las APIs
- ✅ Relaciones entre módulos posibles (ej: User → Sales, User → Employees)
- ✅ Transacciones que cruzan módulos
- ✅ Un solo punto de mantenimiento para APIs
- ✅ Frontends desacoplados de la BD (solo consumen APIs)

### Base de Datos Remota Compartida

**Base de Datos Centralizada** (`api/packages/database/`):

- **Una sola base de datos PostgreSQL remota** (servidor de BD)
- **Schema Prisma unificado** con todos los modelos (ShopFlow, Workify, compartidos)
- **Solo las APIs consumen la BD** usando Prisma Client
- **Cliente Prisma compartido** en `api/packages/database/src/client.ts`
- **Frontends NO tienen acceso directo a la BD**, solo consumen APIs

**Configuración de Conexión**:

```bash
# api/packages/database/.env o api/.env
DATABASE_URL=postgresql://user:password@localhost:5432/multisystem_db

# En producción:
# DATABASE_URL=postgresql://user:password@db-server.example.com:5432/multisystem_db
```

**¿Dónde está la BD?**
- **Desarrollo**: PostgreSQL en localhost (Docker o instalación local)
- **Producción**: PostgreSQL en servidor remoto (AWS RDS, DigitalOcean, etc.)
- **Las APIs se conectan** usando `DATABASE_URL` desde cualquier ubicación

### Schema Prisma Unificado

**api/packages/database/prisma/schema.prisma**

```prisma
// Schema unificado con todos los modelos

// Modelos compartidos
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      UserRole
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones con módulos
  shopflowSales Sale[] @relation("shopflowSales")
  workifyEmployees Employee[] @relation("workifyEmployees")
}

// Modelos de ShopFlow
model Product {
  id          String   @id @default(uuid())
  name        String
  price       Decimal
  stock       Int
  saleItems   SaleItem[]
  // ...
}

model Sale {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation("shopflowSales", fields: [userId], references: [id])
  items     SaleItem[]
  total     Decimal
  // ...
}

// Modelos de Workify
model Employee {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation("workifyEmployees", fields: [userId], references: [id])
  companyId   String
  timeEntries TimeEntry[]
  // ...
}

model TimeEntry {
  id         String   @id @default(uuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
  // ...
}
```

### Cliente Prisma Compartido

**api/packages/database/src/client.ts**

```typescript
import { PrismaClient } from '@prisma/client'

// Singleton del cliente Prisma
// Este cliente se conecta a PostgreSQL usando DATABASE_URL
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Prisma lee DATABASE_URL de process.env automáticamente
    // DATABASE_URL=postgresql://user:password@localhost:5432/multisystem_db
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Exportar tipos también
export type { Prisma } from '@prisma/client'
```

**Uso en las APIs**:

```typescript
// api/apps/shopflow-api/src/services/productService.ts
// ✅ LA API CONSUME LA BD DIRECTAMENTE usando Prisma
import { prisma } from '@api/database'  // Cliente Prisma compartido

export async function getProducts() {
  // Prisma se conecta a PostgreSQL usando DATABASE_URL
  return prisma.product.findMany({
    include: {
      category: true,
    },
  })
}

export async function createProduct(data: CreateProductInput) {
  // Escribe directamente en la BD
  return prisma.product.create({
    data,
  })
}
```

```typescript
// api/apps/workify-api/src/services/employeeService.ts
// ✅ LA API CONSUME LA BD DIRECTAMENTE usando Prisma
import { prisma } from '@api/database'

export async function getEmployees() {
  // Prisma se conecta a PostgreSQL usando DATABASE_URL
  return prisma.employee.findMany({
    include: {
      user: true,  // Relación con User compartido (misma BD)
      company: true,
      timeEntries: true,
    },
  })
}
```

```typescript
// shopflow/apps/frontend/src/lib/api/client.ts (Frontend)
// ❌ EL FRONTEND NO CONSUME LA BD, solo hace HTTP requests a la API
export const shopflowApi = {
  products: {
    list: () => fetch('http://localhost:3001/api/products').then(r => r.json()),
    create: (data: unknown) => fetch('http://localhost:3001/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.json()),
  },
}
```

### Configuración

**Ubicación de la Base de Datos**:
- **Desarrollo**: PostgreSQL en `localhost:5432` (Docker o instalación local)
- **Producción**: PostgreSQL en servidor remoto (ej: `db.example.com:5432`)

**Configuración en el Monorepo de APIs**:

```bash
# api/.env (raíz del monorepo api) o api/packages/database/.env
# Esta es la conexión que TODAS las APIs usan
DATABASE_URL=postgresql://user:password@localhost:5432/multisystem_db

# En producción:
# DATABASE_URL=postgresql://user:password@db-server.example.com:5432/multisystem_db
```

**Todas las APIs usan la misma DATABASE_URL**:

```bash
# api/apps/shopflow-api/.env (opcional, puede heredar de raíz)
DATABASE_URL=postgresql://user:password@localhost:5432/multisystem_db

# api/apps/workify-api/.env (opcional, puede heredar de raíz)
DATABASE_URL=postgresql://user:password@localhost:5432/multisystem_db

# api/apps/auth-api/.env (opcional, puede heredar de raíz)
DATABASE_URL=postgresql://user:password@localhost:5432/multisystem_db
```

### Migraciones

**Las migraciones se ejecutan desde el monorepo de APIs**:

```bash
# Desde el monorepo api
cd api/packages/database

# Ejecutar migración (modifica la BD PostgreSQL remota)
pnpm prisma migrate dev --name add_new_feature

# Generar cliente Prisma (para que las APIs puedan usarlo)
pnpm prisma generate

# O desde la raíz del monorepo api
cd api
pnpm --filter @api/database prisma migrate dev --name add_new_feature
pnpm --filter @api/database prisma generate
```

**Importante**:
- ✅ Las migraciones modifican la BD PostgreSQL remota directamente
- ✅ Todas las APIs usan el mismo cliente Prisma generado
- ✅ Los frontends NO ejecutan migraciones (no tienen acceso a la BD)
- ✅ Solo el monorepo `api/` tiene acceso a Prisma y la BD

## Flujo de Desarrollo

```
1. Iniciar APIs remotas (monorepo api)
   cd api/
   pnpm dev  # Inicia todas las APIs:
            # - shopflow-api (puerto 3001)
            # - workify-api (puerto 3002)
            # - auth-api (puerto 3000)
            # Todas usan la misma BD compartida

2. Iniciar monorepo ShopFlow (solo frontend)
   cd shopflow/
   pnpm dev  # Inicia frontend (puerto 3003)
            # Frontend apunta a APIs remotas (3001, 3000)

3. Iniciar monorepo Workify (solo frontend)
   cd workify/
   pnpm dev  # Inicia frontend (puerto 3004)
            # Frontend apunta a APIs remotas (3002, 3000)

4. Iniciar Hub
   cd hub/
   pnpm dev  # Inicia frontend hub (puerto 3005)
            # Hub apunta a APIs remotas (3001, 3002, 3000)

5. Desarrollo
   - Cambios en APIs → solo rebuild api monorepo
   - Cambios en shopflow frontend → solo rebuild shopflow monorepo
   - Cambios en workify frontend → solo rebuild workify monorepo
   - Cambios en hub → solo rebuild hub monorepo
   - Cada monorepo es independiente, pero APIs y BD son compartidas
```

## Ventajas de esta Arquitectura

1. **APIs Centralizadas**: Todas las APIs en un solo monorepo, fácil de mantener
2. **Base de Datos Compartida**: Una sola BD con relaciones entre módulos
3. **Frontends Independientes**: Cada módulo tiene su propio frontend monorepo
4. **Equipos Separados**: Equipos pueden trabajar en frontends diferentes sin conflictos
5. **Deploy Independiente**: Desplegar frontends sin afectar APIs y viceversa
6. **Relaciones entre Módulos**: Fácil relacionar datos (ej: User → Sales, User → Employees)
7. **Transacciones**: Transacciones que cruzan módulos son posibles
8. **Consistencia**: Un solo schema, sin duplicación de modelos
9. **Fácil Agregar Módulos**: Crear nuevo frontend monorepo y agregar endpoints en api monorepo

## Estructura de URLs Resultante

```
/                    → Hub landing o redirect
/login               → Login unificado
/shopflow/*          → Todas las rutas de ShopFlow
  /shopflow/dashboard
  /shopflow/pos
  /shopflow/products
  ...
/workify/*           → Todas las rutas de Workify
  /workify/dashboard
  /workify/employees
  /workify/time-entries
  ...

# APIs del Monorepo Backend Separado (NO en Next.js)
http://localhost:3001/api/*       → shopflow-api (monorepo backend)
http://localhost:3002/api/*       → workify-api (monorepo backend)
http://localhost:3000/api/*       → auth-api (monorepo backend, opcional)

# En producción:
https://api-shopflow.example.com/* → shopflow-api
https://api-workify.example.com/*  → workify-api
https://api-auth.example.com/*     → auth-api

# Frontend NO tiene API Routes (excepto casos muy especiales)
# El cliente API del frontend siempre apunta a las APIs remotas del monorepo backend
```

## Dockerización Completa

### Arquitectura Docker

La aplicación está completamente dockerizada con una estructura híbrida:

- **docker-compose.yml en raíz**: Orquesta todos los servicios (PostgreSQL, APIs, Frontends)
- **docker-compose.yml en cada monorepo**: Para desarrollo individual de cada módulo
- **PostgreSQL separado**: Contenedor independiente compartido por todas las APIs

### Servicios Docker

#### PostgreSQL (Servicio Compartido)
- **Imagen**: postgres:16-alpine
- **Puerto**: 5432
- **Base de datos**: multisystem_db
- **Volumen**: postgres_data (persistente)

#### APIs (Monorepo api/)
- **shopflow-api**: Puerto 3001
- **workify-api**: Puerto 3002
- **auth-api**: Puerto 3000
- **Base de datos compartida**: PostgreSQL

#### Frontends
- **hub-frontend**: Puerto 3005 (Next.js)
- **shopflow-frontend**: Puerto 3003 (Next.js)
- **workify-frontend**: Puerto 3004 (Next.js)

### Comandos de Desarrollo

#### Desarrollo Completo (desde raíz)
```bash
# Iniciar todos los servicios
docker-compose up -d

# Detener todos los servicios
docker-compose down

# Ver logs de un servicio específico
docker-compose logs -f [service-name]

# Ejecutar comando en contenedor
docker-compose exec [service-name] [command]
```

#### Desarrollo Individual por Monorepo

**APIs**:
```bash
cd api
docker-compose up -d  # Solo APIs + PostgreSQL
```

**Hub**:
```bash
cd hub
docker-compose up -d  # Solo hub frontend
```

**ShopFlow**:
```bash
cd pos  # o cd shopflow cuando se migre
docker-compose up -d  # Solo shopflow frontend
```

**Workify**:
```bash
cd workify
docker-compose up -d  # Solo workify frontend
```

### Variables de Entorno

#### Raíz (.env)
```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=multisystem_db
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/multisystem_db

# Puertos de APIs
SHOPFLOW_API_PORT=3001
WORKIFY_API_PORT=3002
AUTH_API_PORT=3000

# Puertos de Frontends
HUB_FRONTEND_PORT=3005
SHOPFLOW_FRONTEND_PORT=3003
WORKIFY_FRONTEND_PORT=3004

# CORS
CORS_ORIGINS=http://localhost:3003,http://localhost:3004,http://localhost:3005
```

#### Conexión entre Servicios
Los servicios se comunican usando nombres de contenedor:
- `shopflow-api:3001` desde cualquier frontend
- `workify-api:3002` desde cualquier frontend
- `auth-api:3000` desde cualquier frontend
- `postgres:5432` desde cualquier API

### Migraciones de Base de Datos

```bash
# Ejecutar migraciones
docker-compose exec shopflow-api pnpm --filter @api/database prisma migrate deploy

# Generar cliente Prisma
docker-compose exec shopflow-api pnpm --filter @api/database prisma generate

# Abrir Prisma Studio
docker-compose exec shopflow-api pnpm --filter @api/database prisma studio
```

### Healthchecks

Todos los servicios incluyen healthchecks automáticos:
- **PostgreSQL**: Verifica conexión a BD
- **APIs**: Endpoint `/health` retorna `{ status: 'ok' }`
- **Frontends**: Endpoint `/api/health` (si existe)

### Desarrollo vs Producción

**Desarrollo**:
- Hot reload activado
- Volúmenes montados para cambios en tiempo real
- Logs detallados
- Variables desde `.env`

**Producción**:
- Builds optimizados (multi-stage)
- Sin hot reload
- Logs mínimos
- Variables desde secrets/CI

### Troubleshooting

#### Verificar estado de servicios
```bash
docker-compose ps
```

#### Ver logs de todos los servicios
```bash
docker-compose logs
```

#### Reiniciar un servicio específico
```bash
docker-compose restart [service-name]
```

#### Limpiar todo (datos incluidos)
```bash
docker-compose down -v --remove-orphans
```

## Extensibilidad Futura

Para agregar un nuevo módulo (ej: `inventory`):

1. Crear `inventory/` monorepo con `apps/frontend/`
2. Crear `api/apps/inventory-api/` en el monorepo de APIs
3. Agregar modelos de Inventory al schema Prisma en `api/packages/database/`
4. Agregar configuración a `hub/apps/frontend/src/lib/modules/registry.ts`:
```typescript
{
  id: 'inventory',
  name: 'Inventory',
  route: '/inventory',
  // ...
}
```
5. Crear catch-all route: `hub/apps/frontend/src/app/(modules)/inventory/[...paths]/page.tsx`
6. El módulo aparecerá automáticamente en la navegación
