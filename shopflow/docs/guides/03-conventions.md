# Conventions and Patterns - ShopFlow POS

Code standards, naming conventions, and development patterns to follow in the project.

---

## 📝 Project Conventions

### TypeScript

#### Strict Configuration
- TypeScript in strict mode (`strict: true`)
- Do not use `any` (forbidden)
- Use explicit types instead of inference when it improves clarity
- Prefer `interface` over `type` for objects

```typescript
// ✅ Correct
interface Product {
  id: string
  name: string
  price: number
}

// ❌ Incorrect
const product: any = { ... }
```

#### Type Naming
- Interfaces: PascalCase (`Product`, `User`, `Sale`)
- Types: PascalCase (`ApiResponse`, `FormData`)
- Union types: PascalCase (`UserRole`, `PaymentMethod`)

```typescript
interface Product {
  id: string
  name: string
}

type UserRole = 'ADMIN' | 'CASHIER' | 'SUPERVISOR'
```

---

### Folder Structure

#### Organization by Feature
```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── products/
│   │   ├── pos/
│   │   └── reports/
│   └── api/
│       ├── auth/
│       ├── products/
│       └── sales/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   ├── forms/           # Form components
│   └── features/        # Feature-specific
│       ├── products/
│       ├── pos/
│       └── sales/
├── lib/
│   ├── utils.ts
│   ├── prisma.ts
│   ├── auth.ts
│   ├── services/        # API service layer
│   └── validations/     # Zod schemas
├── hooks/               # Custom hooks
├── store/               # Zustand stores
└── types/               # TypeScript types
```

#### File Naming Conventions
- Components: PascalCase (`ProductCard.tsx`, `SaleForm.tsx`)
- Utilities: camelCase (`formatCurrency.ts`, `validateEmail.ts`)
- Hooks: camelCase with `use` prefix (`useProducts.ts`, `useAuth.ts`)
- Stores: camelCase with `Store` suffix (`productStore.ts`, `cartStore.ts`)
- Types: PascalCase (`Product.ts`, `Sale.ts`)

---

### React Components

#### Server Components vs Client Components

**Server Components** (by default):
```typescript
// ✅ Server Component (default)
export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductList products={products} />
}
```

**Client Components** (when necessary):
```typescript
'use client'

// ✅ Client Component (with interactivity)
export function Cart() {
  const [items, setItems] = useState([])
  return <div>...</div>
}
```

#### Component Structure
```typescript
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// 2. Types/Interfaces
interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
}

// 3. Component
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // 4. Hooks
  const [quantity, setQuantity] = useState(1)

  // 5. Handlers
  const handleAdd = () => {
    onAddToCart(product)
  }

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

---

### Naming

#### Variables and Functions
- camelCase for variables and functions
- PascalCase only for components and classes
- Descriptive names in English

```typescript
// ✅ Correct
const productList = []
const calculateTotal = () => {}
const isAuthenticated = true

// ❌ Incorrect
const pl = []
const calc = () => {}
const auth = true
```

#### Constants
- UPPER_SNAKE_CASE for global constants
- camelCase for local constants

```typescript
// ✅ Global constant
const API_BASE_URL = 'https://api.example.com'

// ✅ Local constant
const maxItems = 10
```

---

## 🎨 UI and Content

### Language
- **Code**: English (variables, functions, comments)
- **UI**: Spanish (user-visible texts)
- **Comments**: English (code comments)

```typescript
// ✅ Correct
const productName = 'Producto ABC'
const buttonLabel = 'Agregar al Carrito'

// ❌ Incorrect
const nombreProducto = 'Producto ABC'
const etiquetaBoton = 'Agregar al Carrito'
```

---

## 🏗️ Patterns to Follow

### Separation of Concerns

#### Service Layer
All business logic should be in the service layer:

```typescript
// src/lib/services/productService.ts
export async function getProducts() {
  return await prisma.product.findMany()
}

export async function createProduct(data: CreateProductData) {
  return await prisma.product.create({ data })
}
```

#### API Routes
API routes should be thin and delegate to services:

```typescript
// src/app/api/products/route.ts
import { productService } from '@/lib/services/productService'

export async function GET() {
  const products = await productService.getProducts()
  return Response.json(products)
}
```

#### Validations
Use Zod for all validations:

```typescript
// src/lib/validations/product.ts
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  sku: z.string().min(1),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
```

---

### Error Handling

#### Centralized
Create a centralized error handler:

```typescript
// src/lib/utils/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  // Unknown error
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

---

### Type-First Development

1. **Define types first**
```typescript
// src/types/Product.ts
export interface Product {
  id: string
  name: string
  price: number
  stock: number
}
```

2. **Use types in Zod validations**
```typescript
const productSchema = z.object({
  name: z.string(),
  price: z.number(),
}) satisfies z.ZodType<Product>
```

3. **Reuse types throughout the application**

---

## 📐 Styles and CSS

### Tailwind CSS
- Use Tailwind classes instead of custom CSS
- Create reusable components for repeated styles
- Use `cn()` (clsx + tailwind-merge) for conditional classes

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'p-4 rounded-lg',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50'
)}>
```

### Responsive Design
- Mobile-first approach
- Use Tailwind breakpoints:
  - `sm:` 640px
  - `md:` 768px
  - `lg:` 1024px
  - `xl:` 1280px

```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
```

---

## 🧪 Testing (Future)

### Test Conventions
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

---

## 🔍 Code Quality

### ESLint Rules
- Follow Next.js standard configuration
- Do not disable rules without justification
- Resolve all warnings before commit

### Formatting
- Prettier with standard configuration
- Auto-format on save
- Pre-commit hooks with lint-staged

---

## 📚 Imports

### Import Order
1. React and Next.js
2. External libraries
3. Internal components
4. Utilities and types
5. Styles

```typescript
// 1. React/Next.js
import { useState } from 'react'
import { NextRequest } from 'next/server'

// 2. External libraries
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

// 3. Internal components
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/features/products/ProductCard'

// 4. Utilities and types
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

// 5. Styles (if applicable)
import './styles.css'
```

### Path Aliases
Use `@/` alias instead of relative paths:

```typescript
// ✅ Correct
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'

// ❌ Avoid
import { Button } from '../../../components/ui/button'
```

---

## ✅ Code Quality Standards

Before committing, verify:

- TypeScript compiles without errors
- ESLint shows no errors
- Prettier formatted the code
- Descriptive names in English
- Comments in English where necessary
- Types defined correctly (no `any`)
- Separation of concerns (services, components, utils)
- Zod validations implemented
- Appropriate error handling

---

**Reference**: Review this document before starting any development task to maintain code consistency.

