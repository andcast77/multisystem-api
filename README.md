# Multisystem

Plataforma modular que integra múltiples aplicaciones independientes (monorepos) a través de una API compartida y un sistema de proxy reverso.

## 🏗️ Arquitectura

Multisystem está estructurado en tres categorías principales:

### Servicios Compartidos (Infraestructura de Multisystem)
- **`services/api/`** - API compartida con Prisma y base de datos unificada (servicio backend)
  - 🔗 **Git Submodule** - Servicio compartido que consumen todos los módulos frontend
- **`nginx/`** - Configuración del reverse proxy
- **`scripts/`** - Scripts de utilidad para desarrollo
- **`docker-compose.yml`** - Orquestación de servicios

**Nota**: `services/api/` es un servicio compartido con su propio repositorio Git, configurado como **Git Submodule** para que el repositorio principal trackee qué versión está usando.

### Hub (Plataforma Principal)
- **Raíz del repositorio** - La aplicación Next.js de multisystem está en la raíz
  - ✅ **Parte del repositorio principal** - No es un submodule
  - Es la aplicación central que integra todos los módulos
  - Contiene `package.json`, `src/`, `next.config.js`, etc. directamente en la raíz

### Módulos Frontend como Submodules
- **`modules/shopflow/`** - Módulo ShopFlow
- **`modules/workify/`** - Módulo Workify

Cada módulo frontend es un **Git Submodule** independiente con su propio repositorio Git. Estos módulos se integran en el hub y consumen la API compartida (`services/api/`).

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Git
- Node.js 20+ y pnpm (para desarrollo local)
- Tailwind CSS está configurado (incluido en el proyecto)

### Clonar el Proyecto

```bash
# Clonar el repositorio principal
git clone <URL_REPO_MULTISYSTEM>
cd multisystem

# Inicializar todos los submodules (api + módulos frontend)
git submodule update --init --recursive

# O usar el script de inicialización
./scripts/setup-submodules.sh  # Linux/Mac
.\scripts\setup-submodules.ps1  # Windows PowerShell
```

### Configuración Inicial

1. **Configurar URLs de submodules** (si aún no están configuradas):
   Edita `.gitmodules` y reemplaza los placeholders con las URLs reales de tus repositorios:
   ```ini
   [submodule "services/api"]
       path = services/api
       url = https://github.com/tu-usuario/api.git
   
   [submodule "modules/shopflow"]
       path = modules/shopflow
       url = https://github.com/tu-usuario/shopflow.git
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita .env con tus configuraciones
   ```

3. **Inicializar submodules**:
   ```bash
   ./scripts/setup-submodules.sh
   ```

### Desarrollo Local

#### Opción 1: Docker Compose (Recomendado)

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

#### Opción 2: Desarrollo Local sin Docker

```bash
# 1. Iniciar PostgreSQL (o usar servicio externo)
# 2. Instalar dependencias de la API
cd services/api
pnpm install

# 3. Configurar base de datos
pnpm db:generate
pnpm db:push
pnpm db:seed

# 4. Iniciar API
pnpm dev

# 5. En otra terminal, iniciar hub (desde la raíz) y cada módulo
# Hub está en la raíz, así que desde multisystem/
# Las dependencias ya están instaladas (pnpm-lock.yaml existe)
pnpm install  # Solo necesario si cambias dependencias
pnpm dev

# En otra terminal, iniciar módulos
cd modules/shopflow
pnpm install
pnpm dev

cd modules/workify
pnpm install
pnpm dev
```

## 📁 Estructura del Proyecto

```
multisystem/
├── services/               # 🔗 Servicios compartidos (submodules)
│   ├── api/               # Servicio backend compartido
│   │   ├── src/
│   │   │   ├── routes/    # Rutas de la API
│   │   │   └── lib/       # Utilidades compartidas
│   │   └── package.json   # Depende de @multisystem/database
│   │
│   └── database/          # 🔗 Servicio de base de datos (submodule)
│       ├── prisma/        # Schema y migraciones de BD
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── src/
│       │   └── client.ts  # Cliente Prisma exportado
│       └── package.json
│
├── [archivos de Next.js]   # ✅ Aplicación hub en la raíz
│   ├── package.json
│   ├── pnpm-lock.yaml      # Lockfile de dependencias
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js  # Configuración Tailwind CSS
│   ├── postcss.config.js   # Configuración PostCSS
│   ├── nginx.conf          # Configuración reverse proxy
│   ├── Dockerfile          # Multi-stage Dockerfile
│   ├── src/
│   └── ...
│
├── modules/                # 🔗 Módulos frontend como submodules
│   ├── shopflow/          # Módulo ShopFlow
│   └── workify/           # Módulo Workify
│
├── scripts/                # ✅ Scripts de utilidad
│   ├── setup-submodules.sh
│   ├── update-submodules.sh
│   └── init-dev.sh
│
├── docker-compose.yml      # ✅ Desarrollo
├── docker-compose.prod.yml # ✅ Producción
└── .gitmodules            # 🔗 Configuración de submodules
```

**Leyenda:**
- ✅ = Contenido del repositorio principal (multisystem)
- 🔗 = Git Submodules (repositorios independientes)

## 🧪 Testing

La API incluye una suite completa de tests unitarios e integración usando Vitest.

### Estructura de Tests

```
src/
├── __tests__/
│   ├── unit/                  # Tests unitarios
│   │   ├── routes/
│   │   │   └── health.test.ts
│   │   └── server.test.ts
│   ├── integration/           # Tests de integración
│   │   └── api.integration.test.ts
│   └── helpers/              # Utilidades para tests
│       └── test-utils.ts
```

### Ejecutar Tests

```bash
# Instalar dependencias primero
pnpm install

# Ejecutar todos los tests
pnpm test

# Ejecutar solo tests unitarios
pnpm test:unit

# Ejecutar solo tests de integración
pnpm test:integration

# Modo watch (ejecuta tests automáticamente al cambiar archivos)
pnpm test:watch

# Interfaz visual de tests
pnpm test:ui

# Tests con cobertura de código
pnpm test:coverage

# Script de endpoints (requiere servidor corriendo)
pnpm test:endpoints
```

### Script de Endpoints

El script `test-endpoints.js` permite probar la API cuando el servidor está corriendo:

```bash
# Probar contra servidor local (default: http://localhost:3000)
pnpm test:endpoints

# Probar contra servidor específico
pnpm test:endpoints http://localhost:3001

# Modo verbose (más información)
pnpm test:endpoints --verbose
```

Este script prueba:
- Endpoints existentes (GET /health)
- Respuestas correctas y tiempos de respuesta
- Headers CORS
- Manejo de rutas inexistentes (404)
- Requests concurrentes
- Validación de métodos HTTP

### Escribir Nuevos Tests

#### Test Unitario

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTestServer, closeTestServer } from '../helpers/test-utils'
import type { FastifyInstance } from 'fastify'

describe('Mi Ruta', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestServer({ logger: false })
  })

  afterEach(async () => {
    await closeTestServer(app)
  })

  it('debería responder correctamente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/mi-ruta'
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: 'valor' })
  })
})
```

#### Test de Integración

Los tests de integración verifican el comportamiento completo de la API, incluyendo plugins y configuración.

### Cobertura de Código

Para ver el reporte de cobertura:

```bash
pnpm test:coverage
```

El reporte se genera en `coverage/` y muestra qué líneas de código están cubiertas por los tests.

## 🔧 Scripts Disponibles

### Setup de Submodules

```bash
# Linux/Mac
./scripts/setup-submodules.sh

# Windows PowerShell
.\scripts\setup-submodules.ps1
```

### Actualizar Submodules

```bash
# Linux/Mac
./scripts/update-submodules.sh

# Windows PowerShell
.\scripts\update-submodules.ps1
```

### Inicialización Completa

```bash
# Linux/Mac
./scripts/init-dev.sh

# Windows PowerShell
.\scripts\init-dev.ps1
```

## 🔄 Trabajar con Git Submodules

### Actualizar Submodules

```bash
# Actualizar todos los submodules a la última versión
git submodule update --remote

# O usar el script
./scripts/update-submodules.sh
```

### Trabajar en el Hub

```bash
# Trabajar en hub (la raíz del repositorio es la aplicación hub)
# Desde la raíz de multisystem/
# ... hacer cambios en src/, componentes, etc. ...
git add .
git commit -m "feat: nueva funcionalidad en hub"
git push origin main
```

### Trabajar en un Módulo Específico

```bash
# Entrar al módulo
cd modules/shopflow

# Crear una rama y trabajar normalmente
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios ...
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# Volver al repositorio principal
cd ../..

# Actualizar la referencia del submodule
git add modules/shopflow
git commit -m "chore: actualizar referencia de shopflow"
```

### Agregar un Nuevo Módulo

```bash
# Agregar como submodule
git submodule add <URL_REPO> modules/nuevo-modulo

# Commit en el repositorio principal
git commit -m "feat: agregar nuevo módulo"
```

## 🌐 Servicios y Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| API | 3000 | API compartida |
| Hub Frontend | 3005 | Plataforma principal |
| ShopFlow Frontend | 3003 | Módulo ShopFlow |
| Workify Frontend | 3004 | Módulo Workify |
| Nginx | 80 | Reverse proxy |
| PostgreSQL | 5432 | Base de datos |

## 🐳 Docker

El proyecto incluye un Dockerfile multi-stage optimizado con los siguientes targets:

- **`deps`**: Instalación de dependencias
- **`build`**: Compilación de producción
- **`runtime`**: Imagen optimizada para producción (usa `output: standalone`)
- **`dev`**: Entorno de desarrollo
- **`dev-with-nginx`**: Desarrollo con Nginx integrado como reverse proxy

### Desarrollo

```bash
# Iniciar todos los servicios (incluye PostgreSQL, API, módulos y hub)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f hub-frontend

# Detener servicios
docker-compose down
```

### Producción

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Build Manual

```bash
# Build para desarrollo (con Nginx)
docker build -t multisystem-hub --target dev-with-nginx .

# Build para producción
docker build -t multisystem-hub-prod --target runtime .
```

### Ejecutar Migraciones

```bash
docker-compose --profile migration up migrate-db
```

## 🚂 Despliegue en Railway

Railway es la plataforma recomendada para desplegar Multisystem en producción debido a su soporte nativo para Docker Compose y PostgreSQL gestionado.

### Inicio Rápido

1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará automáticamente `docker-compose.prod.yml`
3. Configura PostgreSQL como servicio gestionado
4. Ajusta variables de entorno
5. Despliega

Para una guía detallada, consulta [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md).

### Ventajas de Railway

- ✅ Soporte nativo de Docker Compose
- ✅ PostgreSQL gestionado incluido
- ✅ Networking automático entre servicios
- ✅ Soporte para Git Submodules
- ✅ Despliegue en minutos
- ✅ Precio razonable ($5 crédito/mes en plan gratuito)

### Configuración Básica

Railway detecta automáticamente tu `docker-compose.prod.yml` y despliega todos los servicios. Solo necesitas:

1. **PostgreSQL gestionado**: Crea un servicio PostgreSQL en Railway y usa su `DATABASE_URL`
2. **Variables de entorno**: Configura las variables necesarias en el dashboard
3. **Dominios públicos**: Railway genera URLs públicas automáticamente

### Variables de Entorno Principales

```bash
DATABASE_URL=postgresql://...  # URL de PostgreSQL gestionado de Railway
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://api:3000
NEXT_PUBLIC_SHOPFLOW_URL=http://shopflow-frontend:3003
NEXT_PUBLIC_WORKIFY_URL=http://workify-frontend:3004
CORS_ORIGINS=https://tu-proyecto.railway.app
```

Ver [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md) para la lista completa y configuración detallada.

## 🔐 Variables de Entorno

Copia `.env.example` a `.env` y configura:

- `DATABASE_URL` - URL de conexión a PostgreSQL
- `POSTGRES_USER` - Usuario de PostgreSQL
- `POSTGRES_PASSWORD` - Contraseña de PostgreSQL
- `API_PORT` - Puerto del servicio API (default: 3000)
- `CORS_ORIGINS` - Orígenes permitidos para CORS
- `NEXT_PUBLIC_API_URL` - URL de la API para los frontends
- `NEXT_PUBLIC_SHOPFLOW_URL` - URL del módulo ShopFlow
- `NEXT_PUBLIC_WORKIFY_URL` - URL del módulo Workify

Ver `env.example` para todas las variables disponibles.

## 📝 Notas sobre la Arquitectura

### Servicios vs Módulos

- **Hub**: La aplicación Next.js está en la raíz del repositorio - parte del repositorio principal
- **Servicios Compartidos como Submodules**:
  - **`services/api/`**: Servicio backend compartido que consumen todos los módulos
    - Git Submodule en `services/`
- **Servicios de Infraestructura** (`nginx/`, `scripts/`): Parte del repositorio principal de multisystem
- **Módulos Frontend como Submodules** (`modules/shopflow/`, `modules/workify/`): Aplicaciones frontend independientes

**Estructura de Submodules**:
- `services/api/` → Submodule en `services/` (servicio compartido)
- `modules/shopflow/`, `modules/workify/` → Submodules en `modules/` (aplicaciones frontend)
- Raíz del repositorio → Aplicación hub (Next.js) - no es submodule
- Todos los submodules se gestionan con `git submodule update --init --recursive`

## 🤝 Contribuir

1. Trabaja en el módulo específico (submodule)
2. Haz commit y push en el repositorio del módulo
3. Actualiza la referencia en el repositorio principal si es necesario

## 📝 Notas Importantes

- **Hub es la aplicación principal**: La aplicación Next.js está en la raíz del repositorio, no es un submodule
- **Servicios y módulos son independientes**: `services/api/` y los módulos frontend tienen sus propios repositorios Git como submodules
- **El repositorio principal trackea referencias de submodules**: No se duplican commits de servicios ni módulos
- **Docker funciona con rutas locales**: El contexto de hub apunta a la raíz (`.`), servicios a `services/api/` y módulos a `modules/`
- **Actualiza submodules regularmente**: Usa `git submodule update --remote` para actualizar todos los submodules
- **Tailwind CSS configurado**: El proyecto incluye Tailwind CSS con configuración completa (`tailwind.config.js`, `postcss.config.js`)
- **Lockfile incluido**: El proyecto incluye `pnpm-lock.yaml` para builds reproducibles
- **Nginx integrado**: El hub incluye Nginx como reverse proxy en el contenedor (stage `dev-with-nginx`)

## 🆘 Solución de Problemas

### Los submodules están vacíos

```bash
git submodule update --init --recursive
```

### Error al clonar submodules

Verifica que las URLs en `.gitmodules` sean correctas y que tengas acceso a los repositorios.

### Docker no encuentra los módulos

Asegúrate de que los submodules estén inicializados:
```bash
git submodule update --init --recursive
```

## 📄 Licencia

[Especificar licencia]
