# Technology Stack - ShopFlow POS

Complete documentation of the technology stack used in the project.

---

## 🛠️ Technology Stack

### Frontend

#### Framework and Core
- **Next.js 16.1.1** (App Router) - React framework with SSR and optimizations
- **React 18+** - UI library
- **TypeScript** (strict, no `any`) - Static typing

#### Styles and UI
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible and customizable UI components
- **Lucide React** - Modern icons

#### State and Forms
- **Zustand** - Lightweight state management (selected)
- **React Hook Form** - Performant form handling
- **Zod** - Schema and form validation

#### Data Fetching
- **TanStack Query (React Query)** - Data fetching and intelligent caching

#### CSS Utilities
- **clsx** - Utility for conditional classes
- **tailwind-merge** - Intelligent Tailwind class merging

---

### Backend

#### Framework
- **Next.js API Routes** (App Router) - Integrated backend endpoints

#### Database
- **Prisma ORM** - Type-safe ORM with autocomplete
- **PostgreSQL** - Robust relational database for all environments

#### Authentication and Security
- **JWT** (jsonwebtoken) - Authentication tokens
- **bcrypt** - Secure password hashing

---

### Utilities and Libraries

#### Validation
- **Zod** - Type-safe schema validations

#### Dates
- **date-fns** - Modern date manipulation

#### Visualization
- **Recharts** or **Chart.js** - Charts and visualizations

#### Documents
- **jsPDF** - PDF generation
- **ExcelJS** - Excel/CSV export

#### PWA
- **next-pwa** - PWA support (offline mode)

---

### Development Tools

#### Linting and Formatting
- **ESLint** - Linter for JavaScript/TypeScript
- **Prettier** - Automatic code formatting

#### Git Hooks
- **Husky** - Git hooks for automation
- **lint-staged** - Pre-commit hooks for linting

#### Type Checking
- **TypeScript** - Type checking at compile time

---

## 🔧 Next.js Technical Considerations

### App Router vs Pages Router

- Use **App Router** (Next.js 16) for better performance and DX
- Server Components by default for better performance
- Client Components only when interactivity is needed (`'use client'`)
- Streaming and Suspense for better UX
- **Proxy** instead of deprecated middleware (Next.js 16)

---

### Rendering Strategy

#### Server Components
**Usage**: Pages that don't require interactivity
- Reports (read-only)
- Static listings
- Administration pages with server data

**Advantages**:
- Better performance (code not sent to client)
- Direct access to server resources (DB, APIs, etc.)
- Better SEO

#### Client Components
**Usage**: Interactive components
- POS interface (cart, calculator)
- Forms with real-time validation
- Components with local state
- Components using React hooks

**Advantages**:
- Full interactivity
- React hooks available
- Local state and effects

#### API Routes
**Usage**: Backend endpoints
- Structure: `app/api/route.ts`
- Methods: GET, POST, PUT, DELETE, etc.
- Integration with Prisma
- Authentication and authorization
- Thin layer that delegates to service layer
- Use Zod for validation
- Centralized error handling with `ApiError`

---

### Optimizations

#### Image Optimization
```typescript
import Image from 'next/image'

<Image 
  src="/product.jpg" 
  alt="Product" 
  width={500} 
  height={500}
  priority // For above-the-fold images
/>
```

#### Font Optimization
```typescript
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
```

#### Code Splitting
- Automatic by route in App Router
- Lazy loading of heavy components with `dynamic()`

---

### State and Data Fetching

#### TanStack Query
**Usage**: Data fetching in client components

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetchProducts(),
  staleTime: 60 * 1000, // 1 minute
})
```

**Advantages**:
- Automatic caching
- Intelligent refetching
- Integrated loading/error state
- Optimistic updates

#### Zustand
**Usage**: Shared global state

```typescript
// Example: POS cart store
const useCartStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
}))
```

**Advantages**:
- Simple and lightweight API
- No unnecessary providers
- TypeScript friendly

#### Server Actions (Next.js 14+)
**Usage**: Simple mutations from the server

```typescript
'use server'

export async function createProduct(formData: FormData) {
  // Server logic
}
```

---

## 📦 Package Management

### Installation
- **pnpm** - Package manager used in the project
- **package.json** - Dependency and script management

### Main Scripts
```json
{
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
```

---

## 🔐 Security

### Security Headers
Configure in `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  // ... more headers
]
```

### Authentication
- JWT tokens in HTTP-only cookies
- Token validation in proxy (Next.js 16) - migrated from deprecated middleware
- Roles and permissions per route

---

## 📊 Technology Choices Comparison

### Why Next.js over Nuxt?
- Larger React ecosystem
- Better performance with App Router
- Greater design flexibility
- More resources and tutorials available

### Why Tailwind over Vuetify?
- Greater control over design
- Better for custom interfaces (POS)
- Not limited by predefined components
- Lighter in production

### Why shadcn/ui?
- Accessible components (ARIA compliant)
- Complete customization (copy the code)
- Based on Radix UI (accessible primitives)
- Native TypeScript

### Why Zustand over Redux?
- Simpler API
- Less boilerplate
- Better for medium-sized projects
- Sufficient for this use case

---

**References**:
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)

