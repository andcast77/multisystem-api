'use client'

import { useQuery } from '@tanstack/react-query'
import type { UserRole } from '@prisma/client'

export interface CurrentUser {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

/**
 * Get current user from API
 */
async function getCurrentUser(): Promise<CurrentUser> {
  const response = await fetch('/api/auth/me')
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  const data = await response.json()
  return data.user
}

/**
 * Hook to get current user information
 */
export function useUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
