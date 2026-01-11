# 🚀 Preparación para Producción - Sistema de Impresoras

## 📋 Checklist de Producción

### ✅ Requisitos Previos

- [x] Código funcional en desarrollo
- [x] Testing completo realizado
- [x] Documentación preparada
- [ ] Revisión de seguridad completada
- [ ] Optimizaciones de performance aplicadas
- [ ] Configuración de producción preparada

## 🔧 Configuración de Producción

### Variables de Entorno

Crea un archivo `.env.production` con:

```bash
# Base de datos
DATABASE_URL="postgresql://user:password@prod-host:5432/pos_prod"

# Next.js
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"

# Autenticación (si aplica)
NEXTAUTH_SECRET="tu-secret-produccion-super-seguro"
NEXTAUTH_URL="https://tu-dominio.com"

# Logs y monitoreo
LOG_LEVEL="warn"
SENTRY_DSN="tu-sentry-dsn"

# Configuración de archivos
MAX_FILE_SIZE="5242880"  # 5MB
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif"
```

### Build de Producción

```bash
# Instalar dependencias de producción
npm ci --only=production

# Ejecutar tests finales
npm run test

# Build de la aplicación
npm run build

# Verificar build exitoso
npm run start
```

### Optimizaciones de Build

#### Next.js Config (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de producción
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // Compresión
  compress: true,

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },

  // Optimizaciones de imágenes
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  }
}

module.exports = nextConfig
```

## 🗄️ Base de Datos

### Migraciones de Prisma

```bash
# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones en producción
npx prisma migrate deploy

# Verificar estado de la base de datos
npx prisma studio --port 5556
```

### Seeds Iniciales

```javascript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Configuración por defecto del sistema de impresoras
  await prisma.ticketConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      ticketType: 'TICKET',
      header: 'Mi Negocio\nDirección\nTeléfono',
      footer: 'Gracias por su compra\nVisítenos nuevamente',
      fontSize: 12,
      copies: 1,
      autoPrint: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## 🔒 Seguridad

### Validaciones de Seguridad

#### Middleware de Autenticación

```javascript
// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Lógica adicional de middleware
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}
```

#### Rate Limiting

```javascript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
})

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
})
```

### Sanitización de Inputs

```javascript
// lib/security.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  })
}

export function validateFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  const maxSize = 5 * 1024 * 1024 // 5MB

  return allowedTypes.includes(file.type) && file.size <= maxSize
}
```

## 📊 Monitoreo y Logs

### Configuración de Sentry

```javascript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Console(),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection()
  ]
})
```

### Logs Estructurados

```javascript
// lib/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}
```

## 🚀 Despliegue

### Docker (Recomendado)

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Instalar dependencias solo cuando cambien
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/pos
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=pos
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Scripts de Despliegue

```bash
# scripts/deploy.sh
#!/bin/bash

# Variables
APP_NAME="pos-printer-system"
DOCKER_IMAGE="$APP_NAME:$(date +%Y%m%d-%H%M%S)"

echo "🚀 Iniciando despliegue de $APP_NAME"

# Build de imagen
echo "📦 Construyendo imagen Docker..."
docker build -t $DOCKER_IMAGE .

# Ejecutar tests
echo "🧪 Ejecutando tests..."
docker run --rm $DOCKER_IMAGE npm test

# Desplegar
echo "🚀 Desplegando..."
docker-compose up -d app

# Health check
echo "🔍 Verificando salud del servicio..."
sleep 30
curl -f http://localhost:3000/api/health || exit 1

echo "✅ Despliegue completado exitosamente!"
```

## 📈 Optimizaciones de Performance

### Lazy Loading

```javascript
// components/PrinterConfig.lazy.tsx
import { lazy } from 'react'

export const PrinterConfig = lazy(() =>
  import('./PrinterConfig').then(module => ({ default: module.PrinterConfig }))
)
```

### Caching Estratégico

```javascript
// API Routes con caching
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  // ... lógica de API
}
```

### Bundle Analysis

```bash
# Analizar tamaño del bundle
npm install --save-dev @next/bundle-analyzer

# En package.json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build"
  }
}
```

## 🔄 Mantenimiento

### Tareas Programadas

```javascript
// scripts/maintenance.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanupOldLogs() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  await prisma.log.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo
      }
    }
  })

  console.log('🧹 Limpieza de logs antiguos completada')
}

cleanupOldLogs().catch(console.error)
```

### Backups Automáticos

```bash
# scripts/backup.sh
#!/bin/bash

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/printer_config_$DATE.sql"

# Backup de base de datos
pg_dump $DATABASE_URL > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Limpiar backups antiguos (mantener 30 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup completado: $BACKUP_FILE.gz"
```

## 📋 Checklist Final de Producción

### Pre-Despliegue
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada y poblada
- [ ] Build de producción exitoso
- [ ] Tests pasando en CI/CD
- [ ] Documentación actualizada

### Durante Despliegue
- [ ] Backup de datos existente
- [ ] Despliegue en staging primero
- [ ] Tests de integración en staging
- [ ] Monitoreo durante despliegue
- [ ] Rollback plan preparado

### Post-Despliegue
- [ ] Verificación de funcionalidades
- [ ] Monitoreo de errores
- [ ] Performance monitoring
- [ ] Documentación de cambios
- [ ] Comunicación a usuarios

### Monitoreo Continuo
- [ ] Uptime monitoring (99.9% objetivo)
- [ ] Error tracking (< 1% de errores)
- [ ] Performance monitoring (< 2s carga)
- [ ] Security scanning semanal
- [ ] Backup verification diaria

---

## 🎯 Métricas de Éxito

### Rendimiento
- **Tiempo de carga**: < 2 segundos
- **First Contentful Paint**: < 1.5 segundos
- **Largest Contentful Paint**: < 2.5 segundos

### Confiabilidad
- **Uptime**: > 99.9%
- **Error rate**: < 1%
- **Successful requests**: > 99%

### Seguridad
- **Security headers**: Todos implementados
- **Vulnerabilities**: 0 críticas
- **Data breaches**: 0

¡El sistema está listo para producción! 🚀