# Deployment Guide - ShopFlow POS

This guide covers deployment strategies, production configuration, and infrastructure setup for ShopFlow POS, a Point of Sale system with PWA capabilities and printing integration.

## 🚀 Deployment Options

### Recommended: Vercel + Railway (Full Stack)

For the best balance of ease of use and control.

#### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │
│   (Frontend)    │◄──►│   (PostgreSQL)  │
│   (API Routes)  │    │                 │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Cloudflare    │
│   (CDN)         │
└─────────────────┘
```

#### Prerequisites
- Vercel account
- Railway account (or alternative PostgreSQL provider)
- Domain name (optional but recommended)

### Alternative: Docker Full Stack

For self-hosted or enterprise deployments.

#### Docker Compose Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  shopflow-pos:
    image: shopflow-pos:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    restart: unless-stopped
    volumes:
      - uploads:/app/public/uploads

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=shopflow_prod
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    command: >
      postgres -c wal_level=logical
                -c max_wal_senders=5
                -c max_replication_slots=5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads:/var/www/html/uploads
    depends_on:
      - shopflow-pos
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  uploads:
```

---

## 🗄️ Database Configuration

### PostgreSQL Production Setup

#### Railway (Recommended)
```bash
# Create PostgreSQL database
railway login
railway init shopflow-pos
railway up

# Get connection string
railway variables get DATABASE_URL
```

#### AWS RDS PostgreSQL
```bash
# RDS Configuration
# Instance: db.t3.micro (start small, scale up)
# Storage: 20GB (with auto-scaling)
# Multi-AZ: Enabled for production
# Backup: Daily backups with 7-day retention

DATABASE_URL="postgresql://user:pass@host:5432/shopflow_prod"
```

### Database Optimization

#### Indexes for POS Performance
```sql
-- Critical indexes for POS operations
CREATE INDEX CONCURRENTLY idx_sales_date ON sales (created_at DESC);
CREATE INDEX CONCURRENTLY idx_sales_status ON sales (status);
CREATE INDEX CONCURRENTLY idx_products_sku ON products (sku);
CREATE INDEX CONCURRENTLY idx_inventory_product_id ON inventory (product_id);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_active_products ON products (id) WHERE active = true;
CREATE INDEX CONCURRENTLY idx_active_customers ON customers (id) WHERE active = true;
```

#### Connection Pooling
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['query', 'error', 'warn'],
});
```

---

## 🔐 Environment Variables

### Required Production Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/shopflow_prod"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-min-32-chars"
NEXTAUTH_URL="https://yourdomain.com"
JWT_SECRET="your-jwt-secret-min-32-chars"

# Application
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# File Uploads
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (for receipts)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Push Notifications
VAPID_SUBJECT="mailto:admin@yourdomain.com"
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

# Redis (optional, for caching)
REDIS_URL="redis://localhost:6379"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

### Environment-Specific Configuration

```typescript
// lib/config.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL!,
    isProduction: process.env.NODE_ENV === 'production',
  },
  auth: {
    nextAuth: {
      secret: process.env.NEXTAUTH_SECRET!,
      url: process.env.NEXTAUTH_URL!,
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
    },
  },
  uploads: {
    provider: process.env.FILE_UPLOAD_PROVIDER || 'local',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      apiSecret: process.env.CLOUDINARY_API_SECRET!,
    },
  },
  notifications: {
    email: {
      smtp: {
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    },
    push: {
      vapid: {
        subject: process.env.VAPID_SUBJECT!,
        publicKey: process.env.VAPID_PUBLIC_KEY!,
        privateKey: process.env.VAPID_PRIVATE_KEY!,
      },
    },
  },
};
```

---

## 🖨️ Printer Integration Setup

### Production Printer Configuration

#### ESC/POS Printer Setup
```typescript
// lib/printer/config.ts
export const printerConfig = {
  production: {
    vendorId: process.env.PRINTER_VENDOR_ID || '0x04b8',
    productId: process.env.PRINTER_PRODUCT_ID || '0x0202',
    interface: 'USB',
    options: {
      encoding: 'GB18030',
      width: 32,
      timeout: 5000,
    },
  },
  fallback: {
    type: 'network',
    ip: process.env.PRINTER_IP || '192.168.1.100',
    port: parseInt(process.env.PRINTER_PORT || '9100'),
  },
};
```

#### Browser-based Printing (PWA)
```typescript
// For PWA printing in production
export const pwaPrinterConfig = {
  supported: 'media' in navigator && 'query' in navigator.media,
  capabilities: {
    color: false,
    duplex: false,
    copies: 1,
  },
};
```

### Receipt Templates

```typescript
// lib/templates/receipt.ts
export const receiptTemplate = {
  header: `
    ====================================
           SHOPFLOW POS
    ====================================
    Date: {{date}}
    Time: {{time}}
    Transaction: #{{transactionId}}
    ------------------------------------
  `,
  items: `
    {{productName}}
    {{quantity}} x ${{unitPrice}} = ${{total}}
  `,
  footer: `
    ------------------------------------
    Subtotal: ${{subtotal}}
    Tax: ${{tax}}
    Total: ${{total}}
    ====================================
    Thank you for your business!
  `,
};
```

---

## 📱 PWA Configuration

### Service Worker Setup

```typescript
// public/sw.js
const CACHE_NAME = 'shopflow-pos-v1';
const STATIC_CACHE = 'shopflow-static-v1';
const DYNAMIC_CACHE = 'shopflow-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_CACHE);
    })
  );
});

// Fetch event with offline fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      return fetch(event.request)
        .then(response => {
          // Cache successful GET requests
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
    })
  );
});
```

### Web App Manifest

```json
// public/manifest.json
{
  "name": "ShopFlow POS",
  "short_name": "ShopFlow",
  "description": "Modern Point of Sale System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Sale",
      "short_name": "New Sale",
      "description": "Start a new sale",
      "url": "/sales/new",
      "icons": [{ "src": "/icons/sale-icon.png", "sizes": "96x96" }]
    }
  ]
}
```

---

## 🔒 Security Configuration

### HTTPS & SSL
```nginx
# nginx.conf for production
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for real-time features
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Database Security
```sql
-- Production database security
CREATE USER shopflow_prod WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE shopflow_prod TO shopflow_prod;
GRANT USAGE ON SCHEMA public TO shopflow_prod;

-- Grant minimal permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO shopflow_prod;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO shopflow_prod;

-- Row Level Security for multi-tenant
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_store_isolation ON sales
  FOR ALL USING (store_id = current_user_store_id());
```

---

## 📊 Monitoring & Analytics

### Application Monitoring

#### Sentry Setup
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Console(),
  ],
});
```

#### Performance Monitoring
```typescript
// lib/performance.ts
export const performanceMonitor = {
  measure: (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      console.log(`${name} took ${duration}ms`);

      // Send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Send to DataDog, New Relic, etc.
      }
    });
  },
};
```

### Database Monitoring

#### Query Performance
```sql
-- Slow query log setup
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- Log queries > 1s
ALTER SYSTEM SET log_statement = 'ddl'; -- Log DDL statements

-- Query performance monitoring
CREATE EXTENSION pg_stat_statements;

-- Top slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🔄 Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup.sh - Daily database backup

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/shopflow_backup_$DATE.sql.gz"

# Create backup
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to cloud storage
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/daily/

# Keep only last 7 days locally
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Send notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Database backup completed successfully"}' \
  $SLACK_WEBHOOK_URL
```

### Point-in-Time Recovery

```sql
-- Enable WAL archiving for PITR
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'cp %p /wal-archive/%f';

-- Create base backup
pg_basebackup -D /backups/base -Ft -z -P

-- Restore to specific time
pg_restore -d shopflow_prod /backups/base.tar.gz
```

---

## 🚦 Health Checks

### Application Health Check

```typescript
// app/api/health/route.ts
export const GET = safeHandler(async () => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkFileStorage(),
    printer: await checkPrinter(),
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'ok');

  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: isHealthy ? 200 : 503
  });
});

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', responseTime: Date.now() };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
```

### POS-Specific Health Checks

```typescript
async function checkPrinter() {
  try {
    // Check printer connectivity
    const printerStatus = await printerService.checkStatus();
    return { status: printerStatus ? 'ok' : 'warning' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function checkFileStorage() {
  try {
    // Check upload directory permissions
    await fs.access('/uploads', fs.constants.W_OK);
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
```

---

## 🔧 Scaling Considerations

### Horizontal Scaling
- **Stateless API**: Design allows horizontal scaling
- **Session Storage**: Use Redis for session management
- **File Storage**: Cloud storage (S3, Cloudflare R2) for uploads
- **Cache Layer**: Redis for frequently accessed data

### Database Scaling
- **Read Replicas**: For reporting and analytics
- **Connection Pooling**: PgBouncer for connection management
- **Partitioning**: Time-based partitioning for sales data

### CDN Configuration
```typescript
// next.config.ts
export default nextConfig({
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  // CDN headers for static assets
  async headers() {
    return [
      {
        source: '/api/uploads/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
});
```

---

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database schema migrated
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] File storage configured
- [ ] Printer integration tested
- [ ] PWA manifest updated

### Post-deployment
- [ ] Application accessible via HTTPS
- [ ] Database connections working
- [ ] Authentication functioning
- [ ] File uploads working
- [ ] Printer connectivity verified
- [ ] PWA installable and offline-capable

### Monitoring Setup
- [ ] Error tracking active (Sentry)
- [ ] Performance monitoring configured
- [ ] Database monitoring enabled
- [ ] Backup automation running
- [ ] Health checks responding

---

## 🔄 CI/CD Pipeline

### GitHub Actions for POS

```yaml
# .github/workflows/deploy.yml
name: Deploy ShopFlow POS

on:
  push:
    branches: [ main, staging ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm run test:ci
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

    - name: Build application
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Deploy to production
      run: |
        echo "Deploying to production..."
        # Add your deployment commands here
```

---

**Last updated**: Enero 2025