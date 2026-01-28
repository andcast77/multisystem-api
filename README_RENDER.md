# Despliegue Rápido en Render.com

## Configuración Rápida

1. **Ve a [render.com](https://render.com)** y crea una cuenta
2. **Crea un nuevo Web Service**
3. **Configura**:
   - **Root Directory**: `services/api`
   - **Build Command**: `pnpm install --prod=false && pnpm build`
   - **Start Command**: `pnpm start`
   - **Health Check Path**: `/health`
4. **Agrega variables de entorno** (ver `.env.render.example`)
5. **Despliega**

## Variables de Entorno Requeridas

```bash
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
CORS_ORIGIN=https://tu-frontend1.vercel.app,https://tu-frontend2.vercel.app
NODE_ENV=production
```

## Verificación

Una vez desplegado, verifica:
```bash
curl https://tu-api.onrender.com/health
```

Debería responder: `{"status":"ok"}`

## Documentación Completa

Ver [docs/RENDER_DEPLOYMENT.md](../../docs/RENDER_DEPLOYMENT.md) para guía detallada.
