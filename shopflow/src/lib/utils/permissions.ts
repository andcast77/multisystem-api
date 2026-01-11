import { NextRequest } from 'next/server'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { hasPermissionString, Module, Permission } from '@/lib/permissions'
import type { UserRole } from '@prisma/client'

// Type for permission string
export type PermissionString = `${Module}:${Permission}`

/**
 * Extract user role from request headers (set by proxy)
 */
export function getUserRoleFromRequest(request: NextRequest): UserRole {
  const role = request.headers.get('x-user-role')
  if (!role) {
    throw new ApiError(401, 'User role not found', ErrorCodes.UNAUTHORIZED)
  }
  return role as UserRole
}

/**
 * Extract user ID from request headers (set by proxy)
 */
export function getUserIdFromRequest(request: NextRequest): string {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    throw new ApiError(401, 'User ID not found', ErrorCodes.UNAUTHORIZED)
  }
  return userId
}

/**
 * Check if user has permission and throw error if not
 * Accepts string to allow dynamic construction of permission strings
 */
export function requirePermission(
  request: NextRequest,
  permissionString: string
): asserts permissionString is PermissionString {
  const role = getUserRoleFromRequest(request)
  
  // Validate format: module:permission
  const parts = permissionString.split(':')
  if (parts.length !== 2) {
    throw new ApiError(
      400,
      `Invalid permission string format: ${permissionString}. Expected format: module:permission`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  const [moduleStr, permissionStr] = parts
  const moduleEnum = moduleStr as Module
  const permission = permissionStr as Permission

  // Validate module and permission exist
  if (!Object.values(Module).includes(moduleEnum)) {
    throw new ApiError(
      400,
      `Invalid module: ${moduleStr}`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  if (!Object.values(Permission).includes(permission)) {
    throw new ApiError(
      400,
      `Invalid permission: ${permissionStr}`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  const hasAccess = hasPermissionString(role, permissionString as PermissionString)

  if (!hasAccess) {
    throw new ApiError(
      403,
      `Insufficient permissions. Required: ${permissionString}`,
      ErrorCodes.FORBIDDEN
    )
  }
}

/**
 * Check if user can access a module
 */
export function requireModuleAccess(
  request: NextRequest,
  module: Module
): void {
  const role = getUserRoleFromRequest(request)
  const hasAccess = hasPermissionString(role, `${module}:${Permission.VIEW}` as PermissionString)

  if (!hasAccess) {
    throw new ApiError(
      403,
      `Access denied to module: ${module}`,
      ErrorCodes.FORBIDDEN
    )
  }
}

