'use client'

import { useQuery } from '@tanstack/react-query'
import { Module, Permission, type PermissionString, hasPermissionString } from '@/lib/permissions'
import type { UserRole } from '@prisma/client'

/**
 * Get current user from API
 */
async function getCurrentUser(): Promise<{ role: UserRole }> {
  const response = await fetch('/api/auth/me')
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  const data = await response.json()
  return data.user
}

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(permissionString: PermissionString): boolean {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!user) {
    return false
  }

  return hasPermissionString(user.role, permissionString)
}

/**
 * Hook to check if current user can access a module
 */
export function useModuleAccess(module: Module): boolean {
  return usePermission(`${module}:${Permission.VIEW}` as PermissionString)
}

/**
 * Hook to get current user role
 */
export function useUserRole(): UserRole | undefined {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return user?.role
}

/**
 * Hook to check multiple permissions at once
 */
export function usePermissions(permissionStrings: PermissionString[]): boolean {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!user) {
    return false
  }

  // User has all permissions if they have all of them
  return permissionStrings.every((permission) =>
    hasPermissionString(user.role, permission)
  )
}

