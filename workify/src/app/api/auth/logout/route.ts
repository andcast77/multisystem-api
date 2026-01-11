export const runtime = "nodejs";
import { NextRequest } from 'next/server';
import { safeHandler } from '../../_helpers';
import { getSecurityHeaders } from '@/lib/utils/security';
import { SecurityLogger } from '@/lib/utils/securityLogger';

export const POST = safeHandler(async (request: NextRequest) => {
  const response = Response.json({ message: 'Sesión cerrada exitosamente' });
  
  // Configurar cookie de logout segura
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    'token=',
    'HttpOnly',
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'SameSite=Strict',
    ...(isProduction ? ['Secure'] : [])
  ].join('; ');
  
  // Establecer cookie de logout
  response.headers.set('Set-Cookie', cookieOptions);
  
  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Log de logout
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  if (userId && email) {
    SecurityLogger.logout(request, userId, email);
  }
  
  return response;
}); 