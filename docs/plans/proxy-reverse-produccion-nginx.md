# Plan: Proxy Reverse en Producción con Nginx

## Objetivo

Configurar Nginx como reverse proxy en producción para que el hub funcione como punto de entrada único, proxyando las rutas `/shopflow/*` y `/workify/*` a sus respectivos frontends.

## Arquitectura

```
Usuario → https://hub.example.com/shopflow/dashboard
         ↓
    Nginx (Reverse Proxy)
         ↓
    ┌─────────────────────┐
    │  Hub Frontend       │  (Next.js - puerto 3005)
    │  ShopFlow Frontend  │  (Next.js - puerto 3003)
    │  Workify Frontend   │  (Next.js - puerto 3004)
    │  API                │  (Express - puerto 3000)
    └─────────────────────┘
```

## Archivos a Crear

### 1. `nginx/nginx.conf` (nuevo)

Configuración principal de Nginx:

```nginx
upstream hub-frontend {
    server hub-frontend:3005;
}

upstream shopflow-frontend {
    server shopflow-frontend:3003;
}

upstream workify-frontend {
    server workify-frontend:3004;
}

upstream api-backend {
    server api:3000;
}

server {
    listen 80;
    server_name _;

    # Redirección a HTTPS (opcional, comentar si no se usa SSL)
    # return 301 https://$server_name$request_uri;

    # O configurar directamente HTTP si no se usa SSL
    location / {
        proxy_pass http://hub-frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para módulo ShopFlow
    location /shopflow/ {
        proxy_pass http://shopflow-frontend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /shopflow;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy para módulo Workify
    location /workify/ {
        proxy_pass http://workify-frontend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /workify;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://api-backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health checks
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 2. `nginx/Dockerfile` (nuevo)

Dockerfile para Nginx:

```dockerfile
FROM nginx:alpine

# Copiar configuración
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 3. `docker-compose.prod.yml` (actualizar)

Agregar servicio Nginx:

```yaml
version: '3.8'

services:
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
      - "443:443"  # Si se configura SSL
    volumes:
      # Para SSL (opcional)
      # - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - hub-frontend
      - shopflow-frontend
      - workify-frontend
      - api
    networks:
      - multisystem-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # ... resto de servicios (hub-frontend, shopflow-frontend, etc.)
```

### 4. `nginx/nginx.conf.template` (opcional)

Template para configuración dinámica con variables de entorno:

```nginx
# Este archivo puede ser procesado por envsubst en el entrypoint
upstream hub-frontend {
    server ${HUB_FRONTEND_HOST:-hub-frontend}:${HUB_FRONTEND_PORT:-3005};
}

upstream shopflow-frontend {
    server ${SHOPFLOW_FRONTEND_HOST:-shopflow-frontend}:${SHOPFLOW_FRONTEND_PORT:-3003};
}

upstream workify-frontend {
    server ${WORKIFY_FRONTEND_HOST:-workify-frontend}:${WORKIFY_FRONTEND_PORT:-3004};
}

upstream api-backend {
    server ${API_HOST:-api}:${API_PORT:-3000};
}

# ... resto de la configuración
```

### 5. Configuración SSL/HTTPS (opcional)

Para producción con SSL, crear `nginx/ssl.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name hub.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... misma configuración de locations que en nginx.conf
}
```

## Consideraciones Importantes

### 1. Rewrite de Rutas

Nginx necesita reescribir las rutas correctamente. Cuando se accede a `/shopflow/dashboard`, Nginx debe proxy a `shopflow-frontend/dashboard` (sin el prefijo `/shopflow`).

La configuración `proxy_pass http://shopflow-frontend/;` (con trailing slash) automáticamente remueve el prefijo `/shopflow`.

### 2. Headers Necesarios

- `X-Forwarded-For`: IP del cliente original
- `X-Forwarded-Proto`: Protocolo (http/https)
- `X-Forwarded-Prefix`: Prefijo de ruta (para que las apps sepan que están bajo `/shopflow`)
- `Host`: Host original

### 3. WebSockets

Si los módulos usan WebSockets, la configuración con `Upgrade` y `Connection` headers ya está incluida.

### 4. Next.js Base Path

Los frontends Next.js pueden necesitar configuración de `basePath` si están bajo un subpath:

```javascript
// next.config.js de shopflow
const nextConfig = {
  basePath: process.env.NODE_ENV === 'production' ? '/shopflow' : '',
  // ...
}
```

**Nota**: Esto puede causar problemas. Mejor opción es que los frontends no usen `basePath` y Nginx maneje el routing.

### 5. Assets Estáticos

Next.js genera assets con rutas como `/_next/static/...`. Nginx debe proxy estas rutas también:

```nginx
location /_next/ {
    # Determinar de qué módulo viene basándose en el Referer o usar catch-all
    proxy_pass http://shopflow-frontend/_next/;
    # O mejor: usar un location más específico
}
```

**Solución**: Cada módulo puede usar su propio prefijo para assets, o Nginx puede determinar el módulo desde headers.

## Alternativa: Subpath Routing sin Base Path

Mejor enfoque: Los frontends NO usan `basePath`, y Nginx proxy todo incluyendo `/_next/`:

```nginx
location /shopflow/ {
    # Proxy todo, incluyendo /_next/
    rewrite ^/shopflow/?(.*) /$1 break;
    proxy_pass http://shopflow-frontend;
    # ... headers
}
```

## Estructura de Directorios

```
multisystem/
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── nginx.conf.template (opcional)
├── docker-compose.prod.yml
└── ...
```

## Testing

1. Construir imagen de Nginx: `docker build -t multisystem-nginx ./nginx`
2. Iniciar servicios: `docker-compose -f docker-compose.prod.yml up -d`
3. Verificar que `http://localhost/shopflow/` proxy a shopflow-frontend
4. Verificar que `http://localhost/workify/` proxy a workify-frontend
5. Verificar que `http://localhost/` sirve el hub
6. Verificar headers `X-Forwarded-*` en los logs de los servicios

## Comandos Útiles

```bash
# Ver logs de Nginx
docker-compose -f docker-compose.prod.yml logs -f nginx

# Probar configuración de Nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Recargar Nginx sin reiniciar
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```
