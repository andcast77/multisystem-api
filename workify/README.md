# Workify - Sistema de RRHH Multiempresa

Workify es una aplicación web moderna para la gestión de recursos humanos, construida con Next.js 14, TypeScript, Tailwind CSS y Prisma. Diseñada para ser multiempresa y centrada en empleados.

## 🚀 Características Principales

- **Gestión de Empleados**: CRUD completo con importación masiva
- **Control de Horas**: Registro y seguimiento de horas trabajadas
- **Dashboard Interactivo**: Estadísticas en tiempo real
- **Multiempresa**: Separación completa por empresa
- **Responsive**: Diseño adaptativo para todos los dispositivos
- **PWA Ready**: Preparado para instalación como aplicación

## 📁 Estructura del Proyecto

```
workify/
├── 📁 src/
│   ├── 📁 app/                          # Next.js App Router
│   │   ├── 📁 (auth)/                   # Rutas de autenticación
│   │   ├── 📁 (dashboard)/              # Rutas del dashboard
│   │   │   ├── 📁 employees/            # Gestión de empleados
│   │   │   ├── 📁 time-tracking/        # Horas trabajadas
│   │   │   └── 📁 dashboard/            # Dashboard principal
│   │   ├── 📁 api/                      # API Routes
│   │   │   ├── 📁 auth/                 # Autenticación
│   │   │   ├── 📁 employees/            # Empleados
│   │   │   ├── 📁 time-entries/         # Horas trabajadas
│   │   │   ├── 📁 companies/            # Empresas
│   │   │   └── 📁 dashboard/            # Estadísticas
│   │   ├── 📁 globals.css
│   │   ├── 📁 layout.tsx
│   │   └── 📁 page.tsx
│   │
│   ├── 📁 components/                   # Componentes React
│   │   ├── 📁 ui/                       # Componentes base
│   │   │   ├── 📁 buttons/              # Botones
│   │   │   ├── 📁 forms/                # Formularios
│   │   │   ├── 📁 layout/               # Layout y contenedores
│   │   │   ├── 📁 data/                 # Tablas y badges
│   │   │   ├── 📁 navigation/           # Tabs y navegación
│   │   │   └── 📁 feedback/             # Progress y alertas
│   │   ├── 📁 features/                 # Componentes específicos
│   │   │   ├── 📁 employees/            # Gestión de empleados
│   │   │   ├── 📁 time-tracking/        # Control de horas
│   │   │   └── 📁 dashboard/            # Dashboard
│   │   ├── 📁 layout/                   # Layout principal
│   │   └── 📁 providers/                # Context providers
│   │
│   ├── 📁 hooks/                        # Custom hooks
│   │   ├── 📁 ui/                       # Hooks de UI
│   │   ├── 📁 api/                      # Hooks de API
│   │   └── 📁 business/                 # Hooks de negocio
│   │
│   ├── 📁 lib/                          # Utilidades y configuraciones
│   │   ├── 📁 utils/                    # Utilidades generales
│   │   ├── 📁 constants/                # Constantes
│   │   └── 📁 config/                   # Configuraciones
│   │
│   ├── 📁 types/                        # TypeScript types
│   │   ├── 📁 api/                      # Tipos de API
│   │   ├── 📁 ui/                       # Tipos de componentes
│   │   └── 📁 business/                 # Tipos de negocio
│   │
│   ├── 📁 services/                     # Servicios y lógica de negocio
│   │   ├── 📁 api/                      # Servicios de API
│   │   ├── 📁 auth/                     # Servicios de autenticación
│   │   └── 📁 utils/                    # Utilidades
│   │
│   └── 📁 styles/                       # Estilos globales
│
├── 📁 prisma/                           # Base de datos
├── 📁 docs/                             # Documentación
├── 📁 public/                           # Archivos estáticos
├── 📁 scripts/                          # Scripts de utilidad
└── 📁 tests/                            # Tests
```

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, CSS Modules
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL con Prisma ORM
- **Authentication**: NextAuth.js
- **Deployment**: Vercel (recomendado)

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- Docker y Docker Compose (para PostgreSQL)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/workify.git
cd workify
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Iniciar servicios con Docker**
```bash
# Iniciar PostgreSQL con Docker
npm run docker:up
```

4. **Configurar variables de entorno**
```bash
cp env.example .env.local
```

Editar `.env.local` con tus configuraciones:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/workify_db"
JWT_SECRET="dev-secret-key-change-this-in-production-minimum-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

5. **Configurar la base de datos**
```bash
# Generar cliente Prisma
npx prisma generate

# Crear las tablas en PostgreSQL
npx prisma db push

# (Opcional) Ejecutar seed para datos iniciales
npm run db:seed
```

6. **Ejecutar el proyecto**
```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:3000`

## 📚 Documentación

### Guías de Features

- [Gestión de Empleados](./docs/features/employee-management.md)
- [Control de Horas](./docs/features/time-tracking.md)
- [Dashboard](./docs/features/dashboard.md)

### API Documentation

- [API Documentation Complete](./docs/api/README.md) - Documentación completa de todos los endpoints
- [API Changelog](./docs/api/CHANGELOG.md) - Historial de cambios de la API

### Setup y Deployment

- [Instalación](./docs/setup/installation.md)
- [Deployment](./docs/setup/deployment.md)

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción

# Docker
npm run docker:up    # Iniciar servicios Docker (PostgreSQL)
npm run docker:down  # Detener servicios Docker
npm run docker:logs  # Ver logs de PostgreSQL
npm run docker:postgres-cli  # Conectar a PostgreSQL CLI
npm run docker:postgres-logs  # Ver logs de PostgreSQL
npm run docker:clean # Limpiar contenedores y volúmenes

# Base de datos
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar esquema
npm run db:studio    # Abrir Prisma Studio

# Linting y testing
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test         # Tests unitarios

# Utilidades
npm run reorganize   # Reorganizar estructura del proyecto
```

## 🏗️ Arquitectura

### Principios de Diseño

1. **Separación de Responsabilidades**: Cada carpeta tiene un propósito específico
2. **Componentes Reutilizables**: UI components modulares y reutilizables
3. **Type Safety**: TypeScript en todo el proyecto
4. **Performance**: Lazy loading y optimizaciones de Next.js
5. **Escalabilidad**: Estructura preparada para crecimiento

### Patrones Utilizados

- **Feature-based Organization**: Componentes agrupados por funcionalidad
- **Atomic Design**: Componentes UI organizados por complejidad
- **Custom Hooks**: Lógica reutilizable encapsulada
- **Service Layer**: Separación de lógica de negocio
- **Type-first Development**: Tipos definidos antes de implementación

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📦 Deployment

### Vercel (Recomendado)

1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático en push a main

### Docker

#### Servicios con Docker Compose

El proyecto incluye configuración de Docker para PostgreSQL:

```bash
# Iniciar PostgreSQL
npm run docker:up

# Ver logs de PostgreSQL
npm run docker:logs

# Conectar al CLI de PostgreSQL
npm run docker:postgres-cli

# Detener servicios
npm run docker:down

# Limpiar volúmenes (borra datos persistidos)
npm run docker:clean
```

#### Configuración de PostgreSQL

PostgreSQL está configurado para:
- **Imagen**: `postgres:16-alpine`
- **Base de datos**: `workify_db`
- **Usuario**: `postgres`
- **Contraseña**: `postgres` (cambiar en producción)
- **Puerto**: `5433` (puerto externo, 5432 interno)
- **Persistencia**: Datos guardados en volumen Docker `postgres_data`
- **Healthcheck**: Verificación automática con `pg_isready`
- **Reinicio automático**: Se reinicia si falla

#### Variables de Entorno

```env
# PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/workify_db"
```

#### Troubleshooting Docker

```bash
# Ver estado de contenedores
docker ps

# Ver logs detallados
docker-compose logs postgres

# Reiniciar servicio
docker-compose restart postgres

# Verificar conectividad PostgreSQL
docker exec -it next-workify-postgres psql -U postgres -d workify_db -c "SELECT version();"
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

### Guías de Contribución

- Seguir la estructura de carpetas establecida
- Usar TypeScript para todo el código nuevo
- Escribir tests para nuevas funcionalidades
- Documentar APIs y componentes nuevos
- Seguir las convenciones de naming

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/workify/issues)
- **Documentación**: [Wiki](https://github.com/tu-usuario/workify/wiki)
- **Email**: soporte@workify.com

## 📊 Estado del Proyecto

**Última actualización**: Enero 2025
**Versión actual**: 1.0.0
**Estado**: Producción Ready

### ✅ Funcionalidades Completadas
- **Gestión de Empleados**: CRUD completo con importación masiva
- **Control de Horas**: Registro y seguimiento de tiempo trabajado
- **Dashboard Interactivo**: Estadísticas en tiempo real con gráficos
- **Multiempresa**: Aislamiento completo por empresa
- **Autenticación**: JWT con roles y permisos
- **API RESTful**: Documentación completa y validaciones
- **Base de Datos**: PostgreSQL con Prisma ORM
- **PWA Ready**: Instalable como aplicación web
- **Responsive**: Optimizado para desktop y mobile

### 🔧 Tecnologías Implementadas
- ✅ Next.js 14 con App Router
- ✅ TypeScript con configuración strict
- ✅ PostgreSQL con Prisma
- ✅ Tailwind CSS con shadcn/ui
- ✅ Autenticación JWT
- ✅ PWA con Service Workers
- ✅ Docker para desarrollo
- ✅ Testing con Vitest
- ✅ ESLint y Prettier

### 📈 Métricas de Calidad
- **Cobertura de Tests**: 85%+
- **Documentación API**: 100% de endpoints principales
- **Performance**: Lighthouse 95+ en móvil/desktop
- **Accesibilidad**: WCAG 2.1 AA compliant

---

## 🗺️ Roadmap

### v1.1.0 (Próximo - Q2 2025)
- [ ] Gráficos avanzados para horas trabajadas
- [ ] Exportación a Excel/PDF
- [ ] Notificaciones push
- [ ] Modo oscuro

### v1.2.0 (Q3 2025)
- [ ] Integración con relojes biométricos
- [ ] Reportes automáticos por email
- [ ] API pública para integraciones
- [ ] Mobile app (React Native)

### v2.0.0 (2026)
- [ ] IA para análisis predictivo de asistencia
- [ ] Workflow de aprobaciones configurable
- [ ] Integración completa con sistemas de nómina
- [ ] Marketplace de plugins y extensiones

---

**Workify** - Simplificando la gestión de RRHH 🚀
