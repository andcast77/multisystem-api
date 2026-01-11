export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { validateLoginInput } from '@/lib/utils/validation';
import { 
  applyRateLimit, 
  detectSuspiciousActivity,
  validateIP 
} from '@/lib/utils/rateLimit';
import { 
  validateRequestSize, 
} from '@/lib/utils/security';
import { SecurityLogger } from '@/lib/utils/securityLogger';
import { userToDTO } from '@/lib/utils/dto';

export const POST = async (request: NextRequest) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  // Aplicar rate limiting para login
  await applyRateLimit(request, 'login');
  
  // Detectar actividad sospechosa
  if (detectSuspiciousActivity(request)) {
    SecurityLogger.suspiciousActivity(request, {
      reason: 'Suspicious activity detected in login attempt',
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

  let body;
  try {
    body = await request.json();
  } catch {
    throw { status: 400, message: 'JSON inválido en el body' };
  }

  // Validar y sanitizar datos de entrada
  let email, password;
  try {
    ({ email, password } = validateLoginInput(body.email, body.password));
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return Response.json({ error: error.message || 'Datos inválidos' }, { status: error.status || 400 });
  }

  console.log('🔍 Iniciando login con AuthService...');

  try {
    // Usar AuthService para el login
    const result = await AuthService.login({ email, password });
    
    console.log('✅ Login exitoso con AuthService');

    // Respuesta con datos del AuthService
    const response = Response.json({
      message: 'Login exitoso',
      token: result.token,
      user: userToDTO(result.user),
      company: result.company,
      employee: result.employee
    });

    // Configurar cookie simple
    response.headers.set('Set-Cookie', `token=${result.token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`);
    
    // Agregar headers de seguridad básicos
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    console.log('✅ Login exitoso completado');
    
    // Log de login exitoso
    SecurityLogger.loginSuccess(request, email, result.user.id);

    return response;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
      const { status, message } = error as { status: number; message: string };
      return NextResponse.json({ error: message }, { status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}; 