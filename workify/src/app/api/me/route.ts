import { NextRequest } from 'next/server';
import { safeHandler, requireAuthFlexible } from '../_helpers';
import { 
  validateRequestSize, 
  getSecurityHeaders 
} from '@/lib/utils/security';

export const GET = safeHandler(async (request: NextRequest) => {
  try {
    // Validar tamaño de request
    validateRequestSize(request);
    
    const user = await requireAuthFlexible(request);
    
    // Validar que el usuario tenga los campos requeridos
    const companyId = user.roles?.[0]?.companyId;
    if (!user || !user.id || !user.email || !companyId) {
      throw { status: 401, message: 'Usuario no válido' };
    }
    
    // Solo devolver información no sensible
    const safeUser = {
      id: user.id,
      email: user.email,
      companyId: user.roles?.[0]?.companyId,
      roles: user.roles || []
    };
    
    const response = Response.json({ user: safeUser });
    
    // Agregar headers de seguridad
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value as string);
    });
    
    return response;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
      throw error;
    }
    if (error instanceof Error) {
      throw { status: 400, message: error.message };
    }
    throw { status: 500, message: 'Error interno del servidor' };
  }
}); 