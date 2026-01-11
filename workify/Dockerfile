# Multi-stage build para Next.js (Workify)
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Stage 2: Build
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build || npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3004

ENV PORT 3004
ENV HOSTNAME "0.0.0.0"

CMD ["pnpm", "start"]

# Stage 4: Desarrollo (sin build)
FROM node:20-alpine AS dev

# Instalar herramientas necesarias para desarrollo y healthcheck
RUN apk add --no-cache libc6-compat wget

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN pnpm install --frozen-lockfile || npm ci || npm install

# Copiar el resto del código
COPY . .

EXPOSE 3004

# Variables de entorno para desarrollo
ENV NODE_ENV=development
ENV PORT=3004
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Variables para HMR mejorado
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

CMD ["pnpm", "dev"]
