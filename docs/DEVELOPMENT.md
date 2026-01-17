# Guía de Desarrollo - Multisystem

Esta guía explica cómo trabajar con la estructura de Git Submodules en Multisystem.

## 📋 Tabla de Contenidos

- [Conceptos Básicos](#conceptos-básicos)
- [Clonar el Proyecto](#clonar-el-proyecto)
- [Trabajar con Submodules](#trabajar-con-submodules)
- [Flujo de Desarrollo](#flujo-de-desarrollo)
- [Agregar Nuevos Módulos](#agregar-nuevos-módulos)
- [Solución de Problemas](#solución-de-problemas)

## Conceptos Básicos

### ¿Qué son Git Submodules?

Git Submodules permiten incluir un repositorio Git dentro de otro como un subdirectorio. En Multisystem:

- **Repositorio Principal**: Contiene solo la infraestructura de multisystem:
  - `nginx/` - Configuración del reverse proxy
  - `docs/` - Documentación
  - `scripts/` - Scripts de utilidad
  - `docker-compose.yml` - Orquestación
- **Hub**: La aplicación Next.js está en la raíz del repositorio - parte del repositorio principal (no es submodule)
- **Submodules**: Servicios y módulos frontend son Git Submodules:
  - `services/api/` - Servicio backend compartido (submodule en `services/`)
  - `modules/shopflow/`, `modules/workify/` - Módulos frontend (submodules en `modules/`)
- **Ventaja**: Todos los monorepos mantienen desarrollo independiente sin duplicar commits en el repo principal

### Estructura de Submodules

```
multisystem/              # ✅ Aplicación hub (Next.js) en la raíz
├── .gitmodules          # Configuración de submodules
├── package.json         # ✅ Package.json de la aplicación hub
├── src/                 # ✅ Código fuente de la aplicación hub
├── next.config.js       # ✅ Configuración Next.js
├── services/
│   └── api/            # Submodule → servicio backend compartido
├── modules/
│   ├── shopflow/       # Submodule → repositorio independiente
│   └── workify/        # Submodule → repositorio independiente
```

## Clonar el Proyecto

### Clonar con Submodules

```bash
# Opción 1: Clonar e inicializar en un paso
git clone --recurse-submodules <URL_REPO_MULTISYSTEM>
cd multisystem

# Opción 2: Clonar y luego inicializar
git clone <URL_REPO_MULTISYSTEM>
cd multisystem
git submodule update --init --recursive

# Opción 3: Usar script de inicialización
git clone <URL_REPO_MULTISYSTEM>
cd multisystem
./scripts/setup-submodules.sh  # Linux/Mac
.\scripts\setup-submodules.ps1  # Windows PowerShell
```

### Verificar Estado de Submodules

```bash
# Ver estado de todos los submodules
git submodule status

# Ver información detallada
git submodule foreach 'echo "=== $name ==="; git status'
```

## Trabajar con Submodules

### Actualizar Submodules

#### Actualizar a la Última Versión

```bash
# Actualizar todos los submodules a la última versión de sus ramas remotas
git submodule update --remote

# Actualizar un submodule específico
git submodule update --remote modules/hub

# O usar el script
./scripts/update-submodules.sh
```

#### Actualizar a una Versión Específica

```bash
# Entrar al submodule
cd modules/hub

# Cambiar a una rama o commit específico
git checkout main
git pull origin main

# O cambiar a un commit específico
git checkout <commit-hash>

# Volver al repositorio principal y actualizar la referencia
cd ../..
git add modules/hub
git commit -m "chore: actualizar hub a versión específica"
```

### Trabajar en un Módulo

#### Desarrollo Normal

```bash
# 1. Entrar al módulo
cd modules/hub

# 2. Crear una rama (si trabajas en el módulo directamente)
git checkout -b feature/nueva-funcionalidad

# 3. Hacer cambios y commits normalmente
# ... editar archivos ...
git add .
git commit -m "feat: agregar nueva funcionalidad"

# 4. Push al repositorio del módulo
git push origin feature/nueva-funcionalidad

# 5. Volver al repositorio principal
cd ../..
```

#### Actualizar Referencia en el Repositorio Principal

Si trabajaste directamente en el módulo y quieres que el repositorio principal apunte a tu nueva versión:

```bash
# Desde el repositorio principal
git add modules/hub
git commit -m "chore: actualizar referencia de hub a nueva funcionalidad"
```

### Trabajar con el Repositorio Principal

El repositorio principal trackea solo las **referencias** (commits) de los submodules, no su contenido.

```bash
# Ver qué commit de cada submodule está siendo usado
git submodule status

# Cambiar a una versión específica de un submodule
cd modules/hub
git checkout <commit-hash>
cd ../..
git add modules/hub
git commit -m "chore: fijar hub a commit específico"
```

## Flujo de Desarrollo

### Escenario 1: Desarrollo en un Módulo Específico

```bash
# 1. Actualizar submodules a última versión
git submodule update --remote

# 2. Trabajar en el módulo
cd modules/hub
git checkout -b feature/mi-feature
# ... hacer cambios ...
git commit -m "feat: mi feature"
git push origin feature/mi-feature

# 3. Volver al repositorio principal
cd ../..

# 4. (Opcional) Actualizar referencia si quieres que el repo principal apunte a tu cambio
git add modules/hub
git commit -m "chore: actualizar referencia de hub"
```

### Escenario 2: Desarrollo en el Repositorio Principal

```bash
# 1. Trabajar en cambios de multisystem (API, nginx, docs, etc.)
git checkout -b feature/mejora-api
# ... editar api/, nginx/, docs/, etc. ...
git add .
git commit -m "feat: mejorar API"
git push origin feature/mejora-api

# 2. Los submodules no se ven afectados
```

### Escenario 3: Desarrollo en Múltiples Módulos

```bash
# 1. Actualizar todos los submodules
git submodule update --remote

# 2. Trabajar en cada módulo independientemente
cd modules/hub
git checkout -b feature/hub-feature
# ... cambios ...
git commit -m "feat: hub feature"
git push origin feature/hub-feature
cd ../..

cd modules/shopflow
git checkout -b feature/shopflow-feature
# ... cambios ...
git commit -m "feat: shopflow feature"
git push origin feature/shopflow-feature
cd ../..

# 3. Actualizar referencias en el repo principal (opcional)
git add modules/
git commit -m "chore: actualizar referencias de módulos"
```

## Trabajar con el Servicio API

El servicio `services/api/` es un Git Submodule en el directorio `services/`. Se maneja igual que los módulos frontend, pero es un servicio compartido que consumen todos los módulos.

### Actualizar el Servicio API

```bash
# Actualizar services/api/ como cualquier otro submodule
git submodule update --remote services/api

# O actualizar todos los submodules (incluyendo services/api/)
git submodule update --remote
```

### Desarrollo en el Servicio API

```bash
# Trabajar en services/api/ normalmente
cd services/api
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios ...
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# Volver al repositorio principal y actualizar la referencia
cd ../..
git add services/api
git commit -m "chore: actualizar referencia de api"
```

### Notas Importantes

- `services/api/` es un Git Submodule, igual que los módulos frontend
- Se inicializa automáticamente con `git submodule update --init --recursive`
- Los cambios se commitean en el repositorio de `services/api/`
- La referencia se actualiza en el repositorio principal cuando cambias la versión
- `services/api/` consume `services/database/` como dependencia (`@multisystem/database`)

## Trabajar con el Servicio Database

El servicio `services/database/` es un Git Submodule que gestiona Prisma (schema, migraciones, cliente). Este servicio es consumido por `services/api/` y otros servicios que necesiten acceso a la base de datos.

### Estructura del Servicio Database

```
services/database/
├── prisma/
│   ├── schema.prisma      # Schema de Prisma
│   └── migrations/        # Migraciones de BD
├── src/
│   └── client.ts          # Cliente Prisma exportado
└── package.json           # "@multisystem/database"
```

### Actualizar el Servicio Database

```bash
# Actualizar services/database/ como cualquier otro submodule
git submodule update --remote services/database

# O actualizar todos los submodules
git submodule update --remote
```

### Desarrollo en el Servicio Database

```bash
# Trabajar en services/database/
cd services/database
git checkout -b feature/nueva-migracion

# Hacer cambios en schema.prisma
# ...

# Ejecutar migración
pnpm prisma migrate dev --name nueva_tabla
pnpm prisma generate

git commit -m "feat: agregar nueva tabla"
git push origin feature/nueva-migracion

# Volver al repositorio principal y actualizar la referencia
cd ../..
git add services/database
git commit -m "chore: actualizar database a nueva versión"
```

### Uso del Servicio Database

El servicio `services/database/` es consumido por `services/api/` mediante dependencia local:

```json
// services/api/package.json
{
  "dependencies": {
    "@multisystem/database": "file:../database"
  }
}
```

```typescript
// services/api/src/services/productService.ts
import { prisma } from '@multisystem/database'

export async function getProducts() {
  return prisma.product.findMany()
}
```

### Migraciones

Las migraciones se ejecutan desde `services/database/`:

```bash
cd services/database
pnpm prisma migrate dev --name nombre_migracion
pnpm prisma generate
```

### Notas Importantes

- `services/database/` es un Git Submodule independiente
- Contiene Prisma schema, migraciones y cliente Prisma
- `services/api/` lo consume como dependencia `file:../database`
- Las migraciones se ejecutan desde `services/database/`, no desde `services/api/`

## Agregar Nuevos Módulos

### Paso 1: Crear el Repositorio del Módulo

Primero, crea un nuevo repositorio Git para tu módulo (en GitHub, GitLab, etc.).

### Paso 2: Agregar como Submodule

```bash
# Agregar el nuevo módulo como submodule
git submodule add <URL_REPO_NUEVO_MODULO> modules/nuevo-modulo

# Esto:
# 1. Clona el repositorio en modules/nuevo-modulo
# 2. Agrega la entrada a .gitmodules
# 3. Agrega la referencia al staging area
```

### Paso 3: Configurar Docker Compose

Edita `docker-compose.yml` y `docker-compose.prod.yml` para agregar el nuevo servicio:

```yaml
nuevo-modulo-frontend:
  build:
    context: ./modules/nuevo-modulo
    dockerfile: Dockerfile
    target: dev
  # ... resto de configuración
```

### Paso 4: Configurar Nginx

Edita `nginx/nginx.conf` para agregar las rutas del nuevo módulo.

### Paso 5: Commit

```bash
git add .gitmodules modules/nuevo-modulo docker-compose.yml nginx/nginx.conf
git commit -m "feat: agregar nuevo módulo como submodule"
```

## Solución de Problemas

### Los Submodules Están Vacíos

**Síntoma**: `modules/hub` existe pero está vacío o solo tiene un archivo `.git`

**Solución**:
```bash
git submodule update --init --recursive
```

### Error: "fatal: not a git repository"

**Síntoma**: Al entrar a un módulo, Git dice que no es un repositorio

**Solución**:
```bash
# Desde el repositorio principal
git submodule update --init --recursive
```

### Los Cambios en Submodules No se Reflejan

**Síntoma**: Hiciste cambios en un módulo pero no aparecen en el repo principal

**Explicación**: Esto es normal. El repositorio principal solo trackea referencias (commits), no el contenido.

**Solución**: Si quieres actualizar la referencia:
```bash
git add modules/<nombre-modulo>
git commit -m "chore: actualizar referencia de <nombre-modulo>"
```

### Error al Clonar: "fatal: clone of '<URL>' into submodule path 'modules/...' failed"

**Causas posibles**:
1. URL incorrecta en `.gitmodules`
2. No tienes acceso al repositorio
3. Problemas de red

**Solución**:
1. Verifica la URL en `.gitmodules`
2. Verifica tus credenciales de Git
3. Intenta clonar manualmente: `git clone <URL> modules/<nombre>`

### Docker No Encuentra los Módulos

**Síntoma**: Docker Compose falla con "context not found"

**Solución**:
```bash
# Asegúrate de que los submodules estén inicializados
git submodule update --init --recursive

# Verifica que existan los directorios
ls modules/
```

### Desincronización de Submodules

**Síntoma**: El estado de los submodules no coincide con lo esperado

**Solución**:
```bash
# Forzar actualización
git submodule update --init --recursive --force

# O resetear completamente (¡cuidado! perderás cambios locales)
git submodule foreach git reset --hard
git submodule update --init --recursive
```

## Mejores Prácticas

1. **Actualiza submodules regularmente**: Usa `git submodule update --remote` antes de empezar a trabajar
2. **Commitea referencias explícitamente**: Si actualizas un módulo, commitea la referencia en el repo principal
3. **Documenta cambios importantes**: Si cambias la versión de un módulo, documenta el motivo
4. **Usa scripts de utilidad**: Los scripts en `scripts/` automatizan tareas comunes
5. **Mantén `.gitmodules` actualizado**: Si cambias URLs, actualiza `.gitmodules` y haz commit

## Comandos Útiles

```bash
# Ver estado de todos los submodules
git submodule status

# Ver información detallada de cada submodule
git submodule foreach 'echo "=== $name ==="; git log --oneline -5'

# Actualizar todos los submodules
git submodule update --remote

# Entrar a un submodule y ejecutar un comando
git submodule foreach 'git status'

# Sincronizar submodules con el repositorio remoto
git submodule sync
git submodule update --init --recursive
```

## Referencias

- [Documentación oficial de Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [README Principal](../README.md)
- [Arquitectura Multi-Módulo](plans/arquitectura-multi-modulo.md)
