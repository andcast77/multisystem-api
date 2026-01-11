# =========================
# Stage 1: Dependencies
# =========================
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* package-lock.json* ./

RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      npm ci || npm install; \
    fi


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
RUN apk add --no-cache libc6-compat wget
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* package-lock.json* ./

RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install; \
    else \
      npm install; \
    fi

COPY . .

ENV NODE_ENV=development
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3005

CMD ["pnpm", "dev"]
