# =========================
# Stage 1: Dependencies
# =========================
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Verificar y copiar archivos de dependencias
COPY package.json ./
RUN if [ ! -f package.json ]; then \
      echo "ERROR: package.json no encontrado" && exit 1; \
    fi

COPY pnpm-lock.yaml* package-lock.json* ./

# Instalar dependencias con verificación
RUN echo "Instalando dependencias..." && \
    if [ -f pnpm-lock.yaml ]; then \
      echo "Usando pnpm con lockfile..." && \
      pnpm install --frozen-lockfile || (echo "ERROR: Fallo en pnpm install" && exit 1); \
    else \
      echo "Usando npm..." && \
      npm ci || npm install || (echo "ERROR: Fallo en npm install" && exit 1); \
    fi && \
    echo "Verificando instalación de dependencias críticas..." && \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm list next react react-dom 2>/dev/null || echo "ADVERTENCIA: Algunas dependencias pueden no estar instaladas"; \
    else \
      npm list next react react-dom 2>/dev/null || echo "ADVERTENCIA: Algunas dependencias pueden no estar instaladas"; \
    fi && \
    echo "Dependencias instaladas correctamente"


# =========================
# Stage 2: Build (Producción)
# =========================
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm build; \
    else \
      npm run build; \
    fi


# =========================
# Stage 3: Runtime (Producción)
# =========================
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"

# Usuario no root
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=deps  --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3005

CMD ["pnpm", "start"]


# =========================
# Stage 4: Development
# =========================
FROM node:20-alpine AS dev
RUN apk add --no-cache libc6-compat wget curl
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Verificar y copiar archivos de dependencias
COPY package.json ./
RUN if [ ! -f package.json ]; then \
      echo "ERROR: package.json no encontrado" && exit 1; \
    fi

COPY pnpm-lock.yaml* package-lock.json* ./

# Instalar dependencias (incluyendo devDependencies) con verificación
RUN echo "Instalando dependencias de desarrollo..." && \
    if [ -f pnpm-lock.yaml ]; then \
      echo "Usando pnpm..." && \
      pnpm install --shamefully-hoist || (echo "ERROR: Fallo en pnpm install" && exit 1); \
    else \
      echo "Usando npm..." && \
      npm install || (echo "ERROR: Fallo en npm install" && exit 1); \
    fi && \
    echo "Verificando instalación de dependencias críticas..." && \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm list next react react-dom typescript 2>/dev/null || echo "ADVERTENCIA: Verificar dependencias"; \
      if ! pnpm list next >/dev/null 2>&1; then \
        echo "ERROR: Next.js no está instalado correctamente" && exit 1; \
      fi; \
    else \
      npm list next react react-dom typescript 2>/dev/null || echo "ADVERTENCIA: Verificar dependencias"; \
      if ! npm list next >/dev/null 2>&1; then \
        echo "ERROR: Next.js no está instalado correctamente" && exit 1; \
      fi; \
    fi && \
    echo "Dependencias de desarrollo instaladas correctamente"

# Copiar el resto de los archivos
COPY . .

# Configurar permisos para volúmenes
RUN chown -R node:node /app || true

# Variables de entorno para desarrollo
ENV NODE_ENV=development
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3005

# Script de inicio con verificación
CMD ["sh", "-c", "echo 'Iniciando servidor de desarrollo...' && pnpm dev"]
