import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import type { UserWithRelations } from '@/types';

export function apiError(message: string, status: number = 500, details?: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    // Log detallado solo en desarrollo
    console.error('[API ERROR]', message, details);
  }
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function requireAuth(request: NextRequest): Promise<UserWithRelations> {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    throw { status: 401, message: 'No autenticado' };
  }
  try {
    const { userId } = await AuthService.verifyToken(token);
    const user = await AuthService.getUserById(userId);
    if (!user) {
      throw { status: 401, message: 'Usuario no encontrado' };
    }
    return user;
  } catch {
    throw { status: 401, message: 'Token inválido' };
  }
}

export async function requireAuthFlexible(request: NextRequest): Promise<UserWithRelations> {
  let user;
  
  // Intentar obtener token de cookies primero
  const cookieToken = request.cookies.get('token')?.value;
  
  if (cookieToken) {
    try {
      user = await requireAuth(request);
    } catch {
      // Si falla con cookies, continuar con header
    }
  }
  
  // Si no hay usuario de cookies, intentar con header Authorization
  if (!user) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { userId } = await AuthService.verifyToken(token);
        user = await AuthService.getUserById(userId);
        if (!user) {
          throw { status: 401, message: 'Usuario no encontrado' };
        }
      } catch {
        throw { status: 401, message: 'Token inválido' };
      }
    }
  }
  
  if (!user) {
    throw { status: 401, message: 'No autenticado' };
  }
  
  return user;
}

export function requireRole(user: UserWithRelations, allowedRoles: string[]): void {
  const hasPermission = user.roles.some(role => allowedRoles.includes(String(role.role.name)));
  if (!hasPermission) {
    throw { status: 403, message: 'No tienes permisos para esta operación' };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeHandler(fn: (request: NextRequest, context?: any) => Promise<Response | void>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (request: NextRequest, context?: any): Promise<Response> => {
    try {
      const result = await fn(request, context);
      if (result instanceof Response) {
        return result;
      }
      return NextResponse.json({ message: 'Operación completada' });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
        const { status, message } = error as { status: number; message: string };
        return apiError(message, status);
      }
      return apiError('Error interno del servidor', 500);
    }
  };
} 