# Project Setup Guide - ShopFlow POS

This document describes the step-by-step process to initialize the project from scratch.

**Note**: This is a reference guide. For task tracking and progress, see the [Plans](../plans/) documents.

---

## Step 1: Next.js Project Creation (5%)

### 1.1 Initialize Next.js with TypeScript

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

**Selected options:**
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ ESLint
- ✅ App Router
- ✅ `src/` directory
- ✅ Import alias `@/*`
- ✅ pnpm as package manager
- ✅ No React Compiler (recommended for stability)

**Note**: When prompted about React Compiler, select **No** for project stability.

---

## Step 2: Base Dependencies Installation (10%)

### 2.1 Production dependencies

```bash
# ORM and Database
npm install prisma @prisma/client

# Authentication and Security
npm install jsonwebtoken bcrypt
npm install --save-dev @types/jsonwebtoken @types/bcrypt

# Validation and Forms
npm install zod react-hook-form @hookform/resolvers

# Global State
npm install zustand

# Data Fetching
npm install @tanstack/react-query

# Date Handling
npm install date-fns

# Utilities
npm install clsx tailwind-merge
npm install lucide-react

# Charts
npm install recharts

# PDF and Excel
npm install jspdf exceljs
npm install --save-dev @types/jspdf
```

### 2.2 Development dependencies

```bash
pnpm add -D @types/node
pnpm add -D prettier eslint-config-prettier
pnpm add -D husky lint-staged
pnpm add -D tsx
pnpm add -D dotenv
```

**Note**: `tsx` is needed for running Prisma seed files. `dotenv` is required for Prisma 7+ configuration.

---

## Step 3: shadcn/ui Configuration (10%)

### 3.1 Initialize shadcn/ui

```bash
npx shadcn-ui@latest init
```

**Recommended configuration:**
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ CSS Variables
- ✅ `src/components/ui`
- ✅ `src/lib/utils.ts`

### 3.2 Install necessary base components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add form
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tabs
```

---

## Step 4: Prisma Configuration (15%)

### 4.1 Setup PostgreSQL with Docker (Recommended)

The project uses PostgreSQL with Docker for easy setup and consistency.

**Start PostgreSQL:**
```bash
pnpm db:docker:up
```

This will start PostgreSQL in a Docker container with:
- Database: `shopflow_pos`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

**Other Docker commands:**
```bash
pnpm db:docker:down    # Stop PostgreSQL
pnpm db:docker:logs    # View PostgreSQL logs
pnpm db:docker:reset   # Reset database (delete all data)
```

**Alternative: Install PostgreSQL natively**
If you prefer to install PostgreSQL directly on your system, download it from [postgresql.org](https://www.postgresql.org/download/) and create the database manually:
```bash
createdb -U postgres shopflow_pos
```

### 4.2 Initialize Prisma

```bash
npx prisma init
```

### 4.3 Configure `.env`

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopflow_pos"

# JWT
JWT_SECRET="your-super-secure-secret-here"
JWT_EXPIRES_IN="7d"

# App
NEXT_PUBLIC_APP_NAME="ShopFlow POS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4.4 Create initial schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// Base schema (will be expanded in Phase 1.2)
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      String   // ADMIN, CASHIER, SUPERVISOR
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 4.4 Generate client and initial migration

**Important:** Make sure Docker Desktop is running before proceeding.

**Start PostgreSQL with Docker:**
```bash
pnpm db:docker:up
```

**Wait a few seconds for PostgreSQL to be ready, then run migrations:**
```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

**Note:** If you see an error about Docker not being available, make sure Docker Desktop is started. You can verify Docker is running with `docker ps`.

---

## Step 5: Folder Structure (10%)

### 5.1 Create base structure

```
shopflow-pos/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── pos/
│   │   │   ├── products/
│   │   │   ├── customers/
│   │   │   └── reports/
│   │   └── api/
│   │       ├── auth/
│   │       ├── products/
│   │       ├── sales/
│   │       └── ...
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── layout/      # Layout components
│   │   ├── forms/       # Form components
│   │   └── features/    # Feature-specific components
│   ├── lib/
│   │   ├── utils.ts     # General utilities
│   │   ├── prisma.ts    # Prisma client singleton
│   │   ├── auth.ts      # Authentication utilities
│   │   ├── services/    # API service layer
│   │   └── validations/ # Zod schemas
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand stores
│   └── types/           # TypeScript types
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
└── ...
```

### 5.2 Create base files

**`src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**`src/lib/utils.ts`** (already created by shadcn/ui)
- Verify it exists and is configured correctly

---

## Step 6: Tailwind CSS Configuration (5%)

### 6.1 Update `tailwind.config.ts`

- Verify custom color configuration
- Configure dark mode theme (optional)
- Configure custom fonts

### 6.2 Update `globals.css`

- Verify shadcn/ui CSS variables
- Configure base styles

---

## Step 7: TypeScript Configuration (5%)

### 7.1 Verify `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## Step 8: ESLint and Prettier Configuration (5%)

### 8.1 Configure Prettier

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### 8.2 Configure lint-staged and Husky

```bash
npx husky init
```

Create `.lintstagedrc`:

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

---

## Step 9: React Query Configuration (5%)

### 9.1 Create Provider

**`src/providers/query-provider.tsx`**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 9.2 Add to root layout

Update `src/app/layout.tsx` to include the QueryProvider.

---

## Step 10: Environment Variables and Configuration (5%)

### 10.1 Create `.env.example`

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=""
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_NAME="ShopFlow POS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 10.2 Configure `next.config.js`

- Configure public environment variables
- Configure PWA (optional for MVP)

---

## Step 11: Package.json Scripts (5%)

### 11.1 Update scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "db:studio": "prisma studio"
  }
}
```

---

## Step 12: Initial Verification and Testing (5%)

### 12.1 Verify everything works

- [x] `pnpm dev` starts without errors
- [x] Main page loads correctly
- [x] Tailwind CSS works
- [x] shadcn/ui configured (components can be added as needed)
- [x] Prisma connects to database
- [x] TypeScript compiles without errors
- [x] ESLint shows no critical errors
- [x] Build verification successful (`pnpm run build` passes)

### 12.2 Project Status

✅ **Setup completed successfully** - The project is ready for development.

---

## ✅ Setup Status - COMPLETED

**Status**: All setup steps have been successfully completed as of January 2025.

### Verification Summary

- ✅ Next.js 16.1.1 project created with App Router
- ✅ All dependencies installed via pnpm
- ✅ shadcn/ui configured (`components.json` ready, components can be added as needed with `npx shadcn@latest add [component]`)
- ✅ Prisma initialized with PostgreSQL and initial migration applied (User model)
- ✅ Complete folder structure created (`components/`, `hooks/`, `store/`, `lib/services/`, `types/`, etc.)
- ✅ Tailwind CSS v3.4.19 configured with shadcn/ui theme variables
- ✅ TypeScript strict mode enabled with all recommended flags
- ✅ ESLint and Prettier configured and working
- ✅ React Query provider integrated in root layout
- ✅ Environment variables configured (`.env` with DATABASE_URL, JWT_SECRET, etc.)
- ✅ Package.json scripts updated (dev, build, db:* commands)
- ✅ Build verification successful (`pnpm run build` completes without errors)
- ✅ JWT authentication system implemented (`src/lib/auth.ts`, API routes in `src/app/api/auth/`)
- ✅ Next.js proxy implemented (`src/proxy.ts`) - migrated from deprecated `middleware.ts` for Next.js 16 compatibility
- ✅ Base API utilities and error handling (`src/lib/utils/api.ts`, `src/lib/utils/errors.ts`)

### Project Structure Created

```
shopflow-pos/
├── prisma/
│   ├── schema.prisma          # User model defined
│   └── migrations/            # Initial migration applied
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/        # Login page
│   │   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── api/
│   │   │   └── auth/         # Auth API routes (login, logout, me)
│   │   ├── layout.tsx         # QueryProvider integrated
│   │   └── page.tsx
│   ├── proxy.ts               # Next.js 16 proxy (route protection)
│   ├── components/
│   │   ├── ui/               # shadcn/ui components (empty, ready for components)
│   │   ├── layout/
│   │   ├── forms/
│   │   └── features/
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client singleton (lazy initialization)
│   │   ├── auth.ts           # JWT authentication utilities
│   │   ├── utils.ts          # cn() utility function
│   │   ├── utils/
│   │   │   ├── api.ts        # API response utilities
│   │   │   └── errors.ts     # Error handling utilities
│   │   ├── services/
│   │   └── validations/
│   ├── providers/
│   │   └── query-provider.tsx # React Query provider
│   ├── hooks/                # Custom hooks
│   ├── store/                # Zustand stores
│   └── types/                # TypeScript types
├── .env                      # Environment variables
├── tailwind.config.ts        # Tailwind with shadcn/ui theme
├── tsconfig.json             # TypeScript strict mode
├── .prettierrc               # Prettier configuration
├── .lintstagedrc.json        # Lint-staged configuration
├── eslint.config.mjs         # ESLint with Prettier
├── prisma.config.ts          # Prisma configuration
├── components.json           # shadcn/ui configuration
└── package.json              # All scripts ready
```

### Commands Available

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:seed` - Seed database (when seed file is created)

### Next Steps

The project setup is **complete**. Proceed with:

1. **[Phase 1: Architecture and Base Configuration](../plans/01-development-phases.md#phase-1-architecture-and-base-configuration-10)**
   - Authentication system ✅
   - API routes structure ✅
   - Proxy configuration (Next.js 16) - migrated from middleware ✅

2. **Add shadcn/ui components as needed:**
   ```bash
   npx shadcn@latest add button
   npx shadcn@latest add input
   # ... etc
   ```

3. **Review [Conventions and Patterns](./03-conventions.md)** before starting development.

