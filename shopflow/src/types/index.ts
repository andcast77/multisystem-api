import { UserRole, PaymentMethod, SaleStatus } from '@prisma/client'

// Re-export Prisma types for convenience
export type {
  User,
  Product,
  Category,
  Customer,
  Sale,
  SaleItem,
  StoreConfig,
} from '@prisma/client'

export { UserRole, PaymentMethod, SaleStatus }

// Extended types
export interface UserWithRole {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
}

// LoginCredentials is now defined in src/lib/validations/auth.ts as LoginInput
// Re-export for backward compatibility
export type { LoginInput as LoginCredentials } from '@/lib/validations/auth'

export interface AuthResponse {
  user: UserWithRole
  token: string
}
