# Plan: Separar Prisma a Repositorio Database Independiente

**Objetivo**: Extraer Prisma (schema, migraciones, cliente) de `services/api/` a un nuevo repositorio `services/database/` como Git submodule independiente. La API consumirá este repositorio como dependencia usando `file:../database`, manteniendo separación clara entre gestión de base de datos y lógica de API.

## Objetivo

Crear un repositorio Git independiente `multisystem-database` que será agregado como submodule en `services/database/` para gestionar Prisma (schema, migraciones, cliente), separándolo completamente de `services/api/`.

## Arquitectura Propuesta

```
multisystem/
├── services/
│   ├── api/              # 🔗 Submodule - Solo lógica de API (sin Prisma)
│   │   ├── src/
│   │   │   └── routes/
│   │   └── package.json  # Dependencia: "@multisystem/database": "file:../database"
│   │
│   └── database/         # 🔗 NUEVO Submodule - Solo gestión de BD
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── src/
│       │   └── client.ts # Cliente Prisma exportado
│       └── package.json
│
├── docker-compose.yml
└── .gitmodules           # Incluirá services/database
```

## Beneficios

1. **Separación de responsabilidades**: BD gestionada independientemente de la API
2. **Reutilización**: Otros servicios pueden consumir `services/database/`
3. **Versionado independiente**: Cambios de schema no afectan API directamente
4. **Equipos independientes**: Equipo de BD puede trabajar sin afectar API
5. **Deploy independiente**: Migraciones se ejecutan desde `database/`, no desde `api/`
6. **Git submodule**: Repositorio Git separado con versionado independiente

## Pasos de Implementación

### Fase 1: Crear Repositorio Git Database

**IMPORTANTE**: Debes crear el repositorio Git primero en GitHub/GitLab:

1. **Crear repositorio Git** `multisystem-database` en GitHub/GitLab/Bitbucket
   - URL ejemplo: `https://github.com/andcast77/multisystem-database.git`

2. **Estructura inicial del repositorio**:
   ```
   multisystem-database/
   ├── prisma/
   │   ├── schema.prisma
   │   └── migrations/
   ├── src/
   │   └── client.ts
   ├── package.json
   ├── tsconfig.json
   ├── Dockerfile
   └── README.md
   ```

### Fase 2: Mover Prisma desde API a Database

1. **Desde `services/api/`**, mover:
   - `prisma/schema.prisma` → `services/database/prisma/schema.prisma`
   - `prisma/migrations/` → `services/database/prisma/migrations/`
   - Código del cliente Prisma → `services/database/src/client.ts`

2. **Eliminar de `services/api/`**:
   - Carpeta `prisma/` completa
   - Referencias a Prisma en `package.json`

### Fase 3: Configurar Repositorio Database

1. **`services/database/package.json`**:
   ```json
   {
     "name": "@multisystem/database",
     "version": "1.0.0",
     "main": "./src/client.ts",
     "types": "./src/client.ts",
     "dependencies": {
       "@prisma/client": "^5.x",
       "prisma": "^5.x"
     },
     "scripts": {
       "generate": "prisma generate",
       "migrate:dev": "prisma migrate dev",
       "migrate:deploy": "prisma migrate deploy",
       "db:push": "prisma db push",
       "studio": "prisma studio"
     }
   }
   ```

2. **`services/database/src/client.ts`**:
   ```typescript
   import { PrismaClient } from '@prisma/client'
   
   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined
   }
   
   export const prisma =
     globalForPrisma.prisma ??
     new PrismaClient({
       log: process.env.NODE_ENV === 'development' 
         ? ['query', 'error', 'warn'] 
         : ['error'],
     })
   
   if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = prisma
   }
   
   export type { Prisma } from '@prisma/client'
   ```

### Fase 4: Configurar API para Consumir Database

1. **Agregar dependencia en `services/api/package.json`**:
   ```json
   {
     "dependencies": {
       "@multisystem/database": "file:../database"
     }
   }
   ```
   
   **Nota**: Usamos `file:../database` (NO workspace) porque:
   - ✅ Funciona perfectamente con Git submodules
   - ✅ No requiere configuración de workspace en la raíz
   - ✅ Es simple, directo y explícito
   - ✅ Compatible con pnpm, npm y yarn
   - ✅ Mantiene separación de repositorios independientes

2. **Actualizar imports en `services/api/`**:
   ```typescript
   // Antes:
   // import { prisma } from './lib/prisma'
   
   // Después:
   import { prisma } from '@multisystem/database'
   ```

### Fase 5: Agregar Database como Git Submodule

**IMPORTANTE**: Debes haber creado el repositorio Git primero (Fase 1).

1. **Agregar como submodule**:
   ```bash
   # Desde la raíz de multisystem/
   git submodule add https://github.com/andcast77/multisystem-database.git services/database
   ```

2. **Esto actualiza `.gitmodules` automáticamente**:
   ```ini
   [submodule "services/api"]
       path = services/api
       url = https://github.com/andcast77/multisystem-api.git

   [submodule "modules/shopflow"]
       path = modules/shopflow
       url = https://github.com/andcast77/multisystem-shopflow.git

   [submodule "modules/workify"]
       path = modules/workify
       url = https://github.com/andcast77/multisystem-workify.git

   [submodule "services/database"]
       path = services/database
       url = https://github.com/andcast77/multisystem-database.git
   ```

### Fase 6: Actualizar Docker Compose

1. **Actualizar servicio `migrate-db` en `docker-compose.yml`**:
   ```yaml
   migrate-db:
     build:
       context: ./services/database  # Cambiar contexto
       dockerfile: Dockerfile
       target: dev
     container_name: multisystem-migrate-db
     environment:
       DATABASE_URL: ${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/multisystem_db}
     command: >
       sh -c "pnpm install &&
              pnpm exec prisma generate &&
              pnpm exec prisma db push --accept-data-loss &&
              pnpm exec prisma db seed"
     depends_on:
       postgres:
         condition: service_healthy
     networks:
       - multisystem-network
     profiles:
       - migration
   ```

2. **Actualizar `docker-compose.prod.yml`** de la misma manera.

3. **Actualizar servicio `api`** (la API ya tendrá `@multisystem/database` como dependencia via `file:../database`):
   ```yaml
   api:
     build:
       context: ./services/api
       dockerfile: Dockerfile
       target: dev
     # ... resto de configuración
     # La API consumirá @multisystem/database automáticamente
   ```

### Fase 7: Actualizar Dockerfiles

1. **`services/database/Dockerfile`** (nuevo):
   ```dockerfile
   FROM node:20-alpine AS deps
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN npm install -g pnpm && pnpm install --frozen-lockfile
   
   FROM node:20-alpine AS dev
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   ```

2. **Actualizar `services/api/Dockerfile`**:
   - Asegurar que `services/database/` esté disponible en el contexto de build
   - Opción A: Copiar `services/database/` al contexto de build de API
   - Opción B: Usar build context compartido en docker-compose
   - Opción C: Usar multi-stage build que copie database

### Fase 8: Actualizar Documentación

1. **`README.md`**: Actualizar estructura de proyecto para incluir `services/database/`
2. **`docs/DEVELOPMENT.md`**: Agregar sección sobre trabajar con `services/database/`
3. **`docs/RAILWAY_DEPLOYMENT.md`**: Actualizar instrucciones de migraciones

## Consideraciones Importantes

### Dependencia: `file:../database` (NO Workspace)

**Decisión**: Usar `"@multisystem/database": "file:../database"`

- ✅ **Funciona con Git submodules**: No requiere workspace en la raíz
- ✅ **Simple y directo**: Una línea en package.json, sin configuración adicional
- ✅ **Compatible con todos los package managers**: pnpm, npm, yarn
- ✅ **Mantiene separación de repositorios**: Respetando la arquitectura de submodules
- ⚠️ **NO usar workspace en raíz**: Contradice la filosofía de Git submodules independientes

### Git Submodule: Repositorio Separado

**IMPORTANTE**: `services/database/` será un **Git submodule**, no un directorio local:

- Debes crear el repositorio `multisystem-database` en GitHub/GitLab primero
- Luego agregarlo como submodule con `git submodule add`
- Cada submodule tiene su propio repositorio Git independiente
- El repositorio principal (`multisystem`) trackea qué commit está usando

### Docker Build Context

Para que la API acceda a `database/` en Docker con `file:../database`:

- **Opción A**: Copiar `services/database/` al contexto de build de API
- **Opción B**: Usar build context compartido en docker-compose
- **Opción C**: Multi-stage build que incluye database

### Migraciones

Las migraciones se ejecutarán desde `services/database/`:

```bash
cd services/database
pnpm prisma migrate dev
pnpm prisma generate
```

## Estructura Final

```
multisystem/                        # Repositorio principal
├── services/
│   ├── api/                        # 🔗 Git submodule
│   │   ├── .git                    # Repositorio independiente
│   │   ├── src/
│   │   └── package.json            # "@multisystem/database": "file:../database"
│   │
│   └── database/                   # 🔗 Git submodule (NUEVO)
│       ├── .git                    # Repositorio independiente
│       ├── prisma/
│       ├── src/client.ts
│       └── package.json
│
├── docker-compose.yml              # migrate-db usa services/database
└── .gitmodules                     # Incluye services/database
```

## Archivos a Crear/Modificar

### 1. Crear (en nuevo repositorio `multisystem-database`):
- `services/database/package.json`
- `services/database/src/client.ts`
- `services/database/Dockerfile`
- `services/database/README.md`

### 2. Modificar:
- `.gitmodules` - Agregar submodule database (se hace automáticamente con `git submodule add`)
- `services/api/package.json` - Agregar dependencia `"@multisystem/database": "file:../database"`
- `services/api/src/**` - Actualizar imports de Prisma
- `docker-compose.yml` - Actualizar servicio `migrate-db`
- `docker-compose.prod.yml` - Actualizar servicio `migrate-db`
- `services/api/Dockerfile` - Manejar dependencia `file:../database`
- `README.md` - Actualizar estructura de proyecto
- `docs/DEVELOPMENT.md` - Documentar database repo

### 3. Mover (desde `services/api/` a `services/database/`):
- `prisma/schema.prisma`
- `prisma/migrations/`
- Código del cliente Prisma (a `src/client.ts`)

### 4. Eliminar (después de migrar):
- `services/api/prisma/` - Carpeta completa (movida a database/)

## Flujo de Trabajo Futuro

### Trabajar en Database:
```bash
cd services/database
git checkout -b feature/nueva-migracion
# ... hacer cambios en schema.prisma ...
pnpm prisma migrate dev --name nueva_tabla
git commit -m "feat: agregar nueva tabla"
git push origin feature/nueva-migracion
```

### Actualizar API para usar nueva versión de Database:
```bash
# Desde multisystem/
cd services/database
git checkout main
git pull origin main
cd ../..
git add services/database
git commit -m "chore: actualizar database a versión con nueva tabla"
```

### La API consume Database:
```typescript
// services/api/src/services/productService.ts
import { prisma } from '@multisystem/database'  // ← Consume desde submodule

export async function getProducts() {
  return prisma.product.findMany()  // ← Consulta directa a PostgreSQL
}
```
