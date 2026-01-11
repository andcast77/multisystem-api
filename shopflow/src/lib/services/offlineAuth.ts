/**
 * Offline Authentication Service
 * Handles authentication when offline by storing and validating tokens locally
 * 
 * NOTE: This file must be client-side only. It cannot import server-side modules
 * like prisma or pg. We decode JWT manually to avoid server dependencies.
 */

const TOKEN_STORAGE_KEY = 'offline_token'
const USER_STORAGE_KEY = 'offline_user'

/**
 * Decode JWT token (client-side only, no signature verification)
 * This only decodes and validates the token structure and expiration
 * Full authentication should be verified server-side
 */
function decodeToken(token: string): {
  id: string
  email: string
  role: string
  exp?: number
  iat?: number
} | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode payload (base64url)
    const payload = parts[1]
    // Replace URL-safe base64 characters
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    
    const decoded = JSON.parse(atob(padded)) as {
      id: string
      email: string
      role: string
      exp?: number
      iat?: number
    }

    if (!decoded || !decoded.id || !decoded.email || !decoded.role) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}

/**
 * Verify token locally (client-side only)
 * This only decodes and validates the token structure and expiration
 * Full authentication should be verified server-side
 */
function verifyTokenLocal(token: string): {
  id: string
  email: string
  role: string
} | null {
  try {
    const decoded = decodeToken(token)
    if (!decoded) {
      return null
    }

    // Check expiration if present
    if (decoded.exp) {
      const expirationTime = decoded.exp * 1000 // Convert to milliseconds
      if (Date.now() >= expirationTime) {
        return null // Token expired
      }
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

export interface OfflineUser {
  id: string
  email: string
  role: string
  name?: string
}

/**
 * Save token and user info for offline access
 */
export function saveOfflineAuth(token: string, user: OfflineUser): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('Failed to save offline auth:', error)
  }
}

/**
 * Get stored token
 */
export function getOfflineToken(): string | null {
  if (typeof window === 'undefined') return null

  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Get stored user info
 */
export function getOfflineUser(): OfflineUser | null {
  if (typeof window === 'undefined') return null

  try {
    const userStr = localStorage.getItem(USER_STORAGE_KEY)
    if (!userStr) return null
    return JSON.parse(userStr) as OfflineUser
  } catch {
    return null
  }
}

/**
 * Validate token locally (without server)
 */
export function validateOfflineToken(): OfflineUser | null {
  const token = getOfflineToken()
  if (!token) return null

  try {
    // Use local verification (client-side only)
    const decoded = verifyTokenLocal(token)
    if (!decoded) {
      // Token is invalid, clear storage
      clearOfflineAuth()
      return null
    }

    // Get user info from storage
    const user = getOfflineUser()
    if (!user || user.id !== decoded.id) {
      return null
    }

    return user
  } catch {
    clearOfflineAuth()
    return null
  }
}

/**
 * Check if token is expired or will expire soon
 */
export function isTokenExpiringSoon(thresholdMinutes: number = 30): boolean {
  const token = getOfflineToken()
  if (!token) return true

  try {
    // Use local verification (client-side only)
    const decoded = verifyTokenLocal(token)
    if (!decoded) return true

    // JWT tokens contain exp (expiration timestamp)
    // We need to decode the payload to check expiration
    const parts = token.split('.')
    if (parts.length !== 3) return true

    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return true

    const expirationTime = payload.exp * 1000 // Convert to milliseconds
    const now = Date.now()
    const thresholdMs = thresholdMinutes * 60 * 1000

    return expirationTime - now < thresholdMs
  } catch {
    return true
  }
}

/**
 * Clear offline auth data
 */
export function clearOfflineAuth(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear offline auth:', error)
  }
}

/**
 * Check if user is authenticated offline
 */
export function isAuthenticatedOffline(): boolean {
  return validateOfflineToken() !== null
}
