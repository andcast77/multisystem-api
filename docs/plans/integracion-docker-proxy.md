# Plan: Integración con Docker y Docker Compose

## Objetivo

Integrar el sistema de proxy reverso con Docker, configurando correctamente:
- Redes Docker para comunicación entre servicios
- Dependencias entre servicios
- Variables de entorno para desarrollo y producción
- Healthchecks y reinicios automáticos

## Archivos a Modificar

### 1. `docker-compose.yml` (actualizar)

Actualizar configuración para desarrollo con proxy:

```yaml
version: '3.8'

services:
  # ... servicios existentes (postgres, api, etc.)

  # =========================
  # Frontend Hub
  # =========================
  hub-frontend:
    build:
      context: ./hub
      dockerfile: Dockerfile
      target: dev
    container_name: multisystem-hub-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: ${HUB_FRONTEND_PORT:-3005}
      HOSTNAME: "0.0.0.0"
      # URLs usando nombres de contenedores Docker
      NEXT_PUBLIC_SHOPFLOW_URL: http://shopflow-frontend:3003
      NEXT_PUBLIC_WORKIFY_URL: http://workify-frontend:3004
      NEXT_PUBLIC_SHOPFLOW_ENABLED: "true"
      NEXT_PUBLIC_WORKIFY_ENABLED: "true"
      NEXT_PUBLIC_API_URL: http://api:3000
      NEXT_TELEMETRY_DISABLED: 1
      WATCHPACK_POLLING: true
      CHOKIDAR_USEPOLLING: true
    ports:
      - "${HUB_FRONTEND_PORT:-3005}:3005"
    volumes:
      - ./hub:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      api:
        condition: service_healthy
      shopflow-frontend:
        condition: service_started
      workify-frontend:
        condition: service_started
    networks:
      - multisystem-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3005/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # =========================
  # Frontend ShopFlow
  # =========================
  shopflow-frontend:
    build:
      context: ./shopflow
      dockerfile: Dockerfile
      target: dev
    container_name: multisystem-shopflow-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: ${SHOPFLOW_FRONTEND_PORT:-3003}
      HOSTNAME: "0.0.0.0"
      NEXT_PUBLIC_API_URL: http://api:3000
      NEXT_TELEMETRY_DISABLED: 1
      WATCHPACK_POLLING: true
      CHOKIDAR_USEPOLLING: true
    ports:
      - "${SHOPFLOW_FRONTEND_PORT:-3003}:3003"
    volumes:
      - ./shopflow:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      api:
        condition: service_healthy
    networks:
      - multisystem-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3003/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # =========================
  # Frontend Workify
  # =========================
  workify-frontend:
    build:
      context: ./workify
      dockerfile: Dockerfile
      target: dev
    container_name: multisystem-workify-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: ${WORKIFY_FRONTEND_PORT:-3004}
      HOSTNAME: "0.0.0.0"
      NEXT_PUBLIC_API_URL: http://api:3000
      NEXT_TELEMETRY_DISABLED: 1
      WATCHPACK_POLLING: true
      CHOKIDAR_USEPOLLING: true
    ports:
      - "${WORKIFY_FRONTEND_PORT:-3004}:3004"
    volumes:
      - ./workify:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      api:
        condition: service_healthy
    networks:
      - multisystem-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3004/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

networks:
  multisystem-network:
    driver: bridge
    name: multisystem-network
```

### 2. `docker-compose.prod.yml` (actualizar)

Agregar Nginx y configurar para producción:

```yaml
version: '3.8'

services:
  # ... servicios de base de datos y API

  # =========================
  # Nginx Reverse Proxy
  # =========================
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: multisystem-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      # Para SSL (descomentar si se configura)
      # - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      hub-frontend:
        condition: service_healthy
      shopflow-frontend:
        condition: service_healthy
      workify-frontend:
        condition: service_healthy
      api:
        condition: service_healthy
    networks:
      - multisystem-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # =========================
  # Frontend Hub (Producción)
  # =========================
  hub-frontend:
    build:
      context: ./hub
      dockerfile: Dockerfile
      target: production
    container_name: multisystem-hub-frontend-prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3005
      # En producción, las URLs apuntan a localhost (dentro de la red Docker)
      # Nginx maneja el routing externo
      NEXT_PUBLIC_SHOPFLOW_URL: http://shopflow-frontend:3003
      NEXT_PUBLIC_WORKIFY_URL: http://workify-frontend:3004
      NEXT_PUBLIC_API_URL: http://api:3000
      NEXT_TELEMETRY_DISABLED: 1
    networks:
      - multisystem-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3005/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ... shopflow-frontend y workify-frontend con target: production

networks:
  multisystem-network:
    driver: bridge
    name: multisystem-network
```

### 3. `.env.example` (raíz del proyecto)

Template de variables de entorno:

```env
# ==========================================
# Puertos
# ==========================================
HUB_FRONTEND_PORT=3005
SHOPFLOW_FRONTEND_PORT=3003
WORKIFY_FRONTEND_PORT=3004
API_PORT=3000

# ==========================================
# Base de Datos
# ==========================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=multisystem_db
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/multisystem_db

# ==========================================
# URLs (para desarrollo local sin Docker)
# ==========================================
# NEXT_PUBLIC_SHOPFLOW_URL=http://localhost:3003
# NEXT_PUBLIC_WORKIFY_URL=http://localhost:3004
# NEXT_PUBLIC_API_URL=http://localhost:3000

# ==========================================
# CORS
# ==========================================
CORS_ORIGIN=http://localhost:3003,http://localhost:3004,http://localhost:3005
```

### 4. `docker-compose.override.yml.example` (nuevo)

Template para overrides locales:

```yaml
# Copiar a docker-compose.override.yml para personalizaciones locales
# Este archivo no se commitea (está en .gitignore)

version: '3.8'

services:
  hub-frontend:
    environment:
      # Override URLs si es necesario
      NEXT_PUBLIC_SHOPFLOW_URL: http://localhost:3003
```

### 5. Actualizar `.gitignore`

Asegurar que archivos de override no se commiteen:

```gitignore
# Docker
docker-compose.override.yml
.env.local
.env*.local
```

## Orden de Inicio de Servicios

```
1. postgres (base de datos)
2. api (backend)
3. shopflow-frontend, workify-frontend (módulos)
4. hub-frontend (hub)
5. nginx (solo en producción)
```

## Comunicación entre Servicios

### En Desarrollo (docker-compose.yml)

- Los servicios se comunican usando nombres de contenedores
- `hub-frontend` → `shopflow-frontend:3003`
- `hub-frontend` → `workify-frontend:3004`
- Todos los servicios en la misma red: `multisystem-network`

### En Producción (docker-compose.prod.yml)

- Nginx es el punto de entrada único (puerto 80/443)
- Nginx proxy a servicios internos
- Servicios se comunican entre sí usando nombres de contenedores
- Usuario final solo ve Nginx

## Healthchecks

Todos los servicios tienen healthchecks para:
- Verificar que el servicio está funcionando
- `depends_on` con `condition: service_healthy` espera a que los servicios estén listos

## Comandos Útiles

```bash
# Desarrollo
docker-compose up -d                    # Iniciar todos los servicios
docker-compose logs -f hub-frontend     # Ver logs del hub
docker-compose restart hub-frontend     # Reiniciar hub
docker-compose down                     # Detener servicios

# Producción
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f nginx

# Ver estado de servicios
docker-compose ps

# Ejecutar comando en contenedor
docker-compose exec hub-frontend sh
```

## Testing

1. Verificar que todos los servicios inician correctamente
2. Verificar que hub-frontend puede comunicarse con shopflow-frontend y workify-frontend
3. Verificar que los healthchecks funcionan
4. Verificar que las variables de entorno se propagan correctamente
5. En producción, verificar que Nginx proxy correctamente
6. Verificar que los servicios se reinician automáticamente si fallan
