# ===============================
# Stage 1: Dependencies (base)
# ===============================
FROM node:20-alpine AS deps

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiamos manifests primero para cache
COPY package.json pnpm-lock.yaml* package-lock.json* ./
COPY pnpm-workspace.yaml* ./

# Instalamos dependencias
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      npm ci || npm install; \
    fi


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
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* package-lock.json* ./
COPY pnpm-workspace.yaml* ./

RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install; \
    else \
      npm install; \
    fi

COPY . .

ENV NODE_ENV=development
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "dev"]


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
