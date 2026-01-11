export const runtime = "nodejs";
import { NextRequest } from 'next/server';
import { safeHandler } from '../../_helpers';
import { AuthService } from '@/services/auth.service';
import { validateRegisterInput } from '@/lib/utils/validation';
import { 
  applyRateLimit, 
  getRateLimitHeaders, 
  detectSuspiciousActivity,
  validateIP 
} from '@/lib/utils/rateLimit';
import { 
  validateRequestSize, 
  getSecurityHeaders 
} from '@/lib/utils/security';

export const POST = safeHandler(async (request: NextRequest) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  // Aplicar rate limiting para registro
  await applyRateLimit(request, 'login'); // Usar el mismo rate limit que login
  
  // Detectar actividad sospechosa
  if (detectSuspiciousActivity(request)) {
    console.warn('Suspicious activity detected in registration attempt:', {
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      path: request.nextUrl.pathname
    });
  }
  
  // Validar IP
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  if (!validateIP(clientIP)) {
    throw { status: 400, message: 'IP inválida' };
  }

  let body: {
    email: string;
    password: string;
    companyName: string;
    firstName: string;
    lastName: string;
  };
  try {
    body = await request.json();
  } catch {
    throw { status: 400, message: 'JSON inválido en el body' };
  }

  // Validar y sanitizar datos de entrada
  const validatedData = validateRegisterInput(body);

  // Verificar que todos los campos requeridos estén presentes
  if (!validatedData.email || !validatedData.password || !validatedData.companyName || !validatedData.firstName || !validatedData.lastName) {
    throw { status: 400, message: 'Todos los campos son requeridos' };
  }

  try {
    const { user, token } = await AuthService.register(validatedData);
    
    // Configurar cookie segura
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `token=${token}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`,
      'SameSite=Strict',
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');

    const companyId = user.roles?.[0]?.companyId;
    const response = Response.json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        companyId
      }
    });

    // Establecer cookie de autenticación
    response.headers.set('Set-Cookie', cookieOptions);
    
    // Agregar headers de seguridad
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    // Agregar headers de rate limit
    Object.entries(getRateLimitHeaders(request, 'login')).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Log de registro exitoso (sin información sensible)
    console.log('Registro exitoso:', {
      userId: user.id,
      email: user.email,
      companyId,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    return response;
  } catch (error) {
    // Devolver el mensaje real del error si existe
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
      // Si el error ya tiene status y message, relanzar tal cual
      throw error;
    }
    if (error instanceof Error) {
      throw { status: 400, message: error.message };
    }
    throw { status: 500, message: 'Error interno del servidor' };
  }
}); 