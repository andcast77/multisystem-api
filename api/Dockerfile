# ===============================
# Stage 1: Dependencies (base)
# ===============================
FROM node:20-alpine AS deps

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Verificar y copiar archivos de dependencias
COPY package.json ./
RUN if [ ! -f package.json ]; then \
      echo "ERROR: package.json no encontrado" && exit 1; \
    fi

COPY pnpm-lock.yaml* package-lock.json* ./

# Instalamos dependencias con verificación
RUN echo "Instalando dependencias..." && \
    if [ -f pnpm-lock.yaml ]; then \
      echo "Usando pnpm con lockfile..." && \
      pnpm install --frozen-lockfile || (echo "ERROR: Fallo en pnpm install" && exit 1); \
    else \
      echo "Usando npm..." && \
      npm ci || npm install || (echo "ERROR: Fallo en npm install" && exit 1); \
    fi && \
    echo "Generando Prisma Client..." && \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm exec prisma generate || (echo "ERROR: Fallo en generación de Prisma Client" && exit 1); \
    else \
      npm exec prisma generate || (echo "ERROR: Fallo en generación de Prisma Client" && exit 1); \
    fi && \
    echo "Verificando instalación de dependencias críticas..." && \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm list express @prisma/client 2>/dev/null || echo "ADVERTENCIA: Algunas dependencias pueden no estar instaladas"; \
    else \
      npm list express @prisma/client 2>/dev/null || echo "ADVERTENCIA: Algunas dependencias pueden no estar instaladas"; \
    fi && \
    echo "Dependencias instaladas correctamente"


# ===============================
# Stage 2: Build
# ===============================
FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build solo si hay TypeScript
RUN if [ -f tsconfig.json ]; then \
      if [ -f pnpm-lock.yaml ]; then \
        pnpm build; \
      else \
        npm run build; \
      fi; \
    else \
      echo "No tsconfig.json found, skipping build"; \
    fi


# ===============================
# Stage 3: Dev (docker-compose)
# ===============================
FROM node:20-alpine AS dev

WORKDIR /app

# Instalar herramientas necesarias para healthcheck y debugging
RUN apk add --no-cache libc6-compat wget curl

RUN corepack enable && corepack prepare pnpm@latest --activate

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
      pnpm list express @prisma/client tsx typescript 2>/dev/null || echo "ADVERTENCIA: Verificar dependencias"; \
      if ! pnpm list express >/dev/null 2>&1; then \
        echo "ERROR: Express no está instalado correctamente" && exit 1; \
      fi; \
      if ! pnpm list @prisma/client >/dev/null 2>&1; then \
        echo "ERROR: Prisma Client no está instalado correctamente" && exit 1; \
      fi; \
      if ! pnpm list tsx >/dev/null 2>&1; then \
        echo "ERROR: tsx no está instalado correctamente" && exit 1; \
      fi; \
    else \
      npm list express @prisma/client tsx typescript 2>/dev/null || echo "ADVERTENCIA: Verificar dependencias"; \
      if ! npm list express >/dev/null 2>&1; then \
        echo "ERROR: Express no está instalado correctamente" && exit 1; \
      fi; \
      if ! npm list @prisma/client >/dev/null 2>&1; then \
        echo "ERROR: Prisma Client no está instalado correctamente" && exit 1; \
      fi; \
      if ! npm list tsx >/dev/null 2>&1; then \
        echo "ERROR: tsx no está instalado correctamente" && exit 1; \
      fi; \
    fi && \
    echo "Dependencias de desarrollo instaladas correctamente"

# Copiar el resto de los archivos (incluyendo prisma/schema.prisma)
COPY . .

# Generar Prisma Client después de copiar los archivos
# DATABASE_URL dummy para prisma.config.ts (no se usa realmente en generate)
RUN echo "Generando Prisma Client..." && \
    export DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy" && \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm exec prisma generate || (echo "ERROR: Fallo en generación de Prisma Client" && exit 1); \
    else \
      npm exec prisma generate || (echo "ERROR: Fallo en generación de Prisma Client" && exit 1); \
    fi && \
    echo "Prisma Client generado correctamente"

# Configurar permisos para volúmenes
RUN chown -R node:node /app || true

# Variables de entorno para desarrollo
ENV NODE_ENV=development
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Script de inicio con verificación
CMD ["sh", "-c", "echo 'Iniciando servidor de desarrollo API...' && pnpm dev"]


# ===============================
# Stage 4: Production deps (pruned)
# ===============================
FROM deps AS prod-deps
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm prune --prod; \
    fi


# ===============================
# Stage 5: Runtime (production)
# ===============================
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no root
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodejs

COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs

EXPOSE 3000

CMD ["pnpm", "start"]
