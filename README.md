## 📄 Documentación Swagger
## Comportamiento del endpoint raíz

Usa `/api/docs` para consultar la documentación interactiva de la API.

La API cuenta con documentación interactiva generada automáticamente mediante Swagger/OpenAPI.

### Acceso a la documentación

Inicia el servidor y accede a:

```
http://localhost:3000/api/docs
```

Aquí podrás explorar todos los endpoints, parámetros, modelos y ejemplos de respuesta.

### Ejemplo de uso

1. Abre tu navegador y visita `/api/docs`.
2. Explora los endpoints disponibles (usuarios, autenticación, salud, etc).
3. Prueba peticiones directamente desde la interfaz.

### Actualización automática

La documentación se actualiza automáticamente al agregar o modificar rutas y modelos en el código.

### Recursos

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)
# Multisystem API

API compartida Fastify para la plataforma Multisystem. Servicio backend que proporciona endpoints HTTP para los módulos frontend.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+
- pnpm (gestor de paquetes)
- Base de datos Neon PostgreSQL (o PostgreSQL local)

### Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus configuraciones
```

### Desarrollo Local

```bash
# Iniciar servidor en modo desarrollo
pnpm dev

# El servidor estará disponible en http://localhost:3000
```

### Build y Producción

```bash
# Compilar TypeScript
pnpm build

# Iniciar servidor de producción
pnpm start
```

## 📁 Estructura del Proyecto

```
services/api/
├── src/
│   ├── routes/          # Rutas de la API
│   │   ├── health.ts    # Health check endpoint
│   │   ├── users.ts     # Rutas de usuarios
│   │   └── index.ts     # Registro de rutas
│   └── server.ts        # Servidor Fastify principal
├── package.json
├── tsconfig.json
└── .env.example         # Ejemplo de variables de entorno
```

## 🔧 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia servidor en modo desarrollo con hot-reload |
| `pnpm build` | Compila TypeScript a JavaScript |
| `pnpm start` | Inicia servidor de producción |
| `pnpm test` | Ejecuta todos los tests |
| `pnpm test:unit` | Ejecuta solo tests unitarios |
| `pnpm test:integration` | Ejecuta solo tests de integración |

## 🔐 Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
# Puerto del servidor
PORT=3000

# Orígenes CORS permitidos (separados por coma)
CORS_ORIGIN=http://localhost:3003,http://localhost:3004,http://localhost:3005

# URL de conexión a Neon PostgreSQL
# Formato: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require

# Entorno de ejecución
NODE_ENV=development
```

### Variables para Render.com

Ver `.env.render.example` para configuración específica de Render.

## 🌐 Endpoints

### Health Check

```bash
GET /health
```

Respuesta:
```json
{
  "status": "ok"
}
```

### Usuarios

```bash
GET /api/users
GET /api/users/:id
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests unitarios
pnpm test:unit

# Tests de integración
pnpm test:integration

# Modo watch
pnpm test:watch

# Con cobertura
pnpm test:coverage
```

## 🚀 Despliegue

### Render.com (Recomendado - Gratis)

Ver [README_RENDER.md](./README_RENDER.md) para guía rápida o [docs/RENDER_DEPLOYMENT.md](../docs/RENDER_DEPLOYMENT.md) para guía completa.

**Configuración rápida**:
- Root Directory: `/` (si es repo separado) o `services/api` (si está en monorepo)
- Build Command: `pnpm install --prod=false && pnpm build`
- Start Command: `pnpm start`
- Health Check Path: `/health`

## 📝 Notas

- La API usa Fastify como framework web
- TypeScript para type safety
- Prisma Client para acceso a base de datos (a través de `@multisystem/database`)
- CORS configurado para permitir requests desde frontends

## 🔗 Enlaces Útiles

- [Documentación de Fastify](https://www.fastify.io/)
- [Guía de despliegue en Render](./docs/RENDER_DEPLOYMENT.md)
- [Neon PostgreSQL](https://neon.tech/)
