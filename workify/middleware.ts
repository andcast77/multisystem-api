import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { SecurityLogger } from '@/lib/utils/securityLogger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/employees',
  '/work-shifts',
  '/roles',
  '/settings',
  '/time-entries',
  '/reports',
  '/users',
  '/api/employees',
  '/api/work-shifts',
  '/api/holidays',
  '/api/time-entries',
  '/api/roles',
  '/api/users',
  '/api/reports',
  '/api/dashboard',
  '/api/me',
  '/api/positions',
  '/api/roles',
];

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Importar headers de seguridad dinámicamente para compatibilidad edge
  const { getSecurityHeaders, validateUUID } = await import('@/lib/utils/security');
  const securityHeaders = getSecurityHeaders();

  // Helper para aplicar headers a cualquier respuesta
  function withSecurityHeaders(response: NextResponse) {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Validación especial para /api/employees/[id] UUID (cubre rutas anidadas y caracteres escapados)
  if (pathname.startsWith('/api/employees/')) {
    // Extraer solo el segmento del id (puede haber subrutas)
    const after = pathname.substring('/api/employees/'.length);
    const id = decodeURIComponent(after.split('/')[0] || '');
    // Validar solo si no es vacío y no es una subruta vacía
    if (id && !validateUUID(id)) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'ID de empleado inválido' }, { status: 400 })
      );
    }
  }

  // Obtener el token de la cookie
  const token = request.cookies.get('token')?.value;

  // Si el usuario está en /login y tiene un token válido, redirigir a dashboard
  if (pathname === '/login' && token) {
    return jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
      .then(() => {
        const res = NextResponse.redirect(new URL('/dashboard', request.url));
        return withSecurityHeaders(res);
      })
      .catch(() => {
        // Token inválido, permitir acceso al login
        return withSecurityHeaders(NextResponse.next());
      });
  }

  // Si el usuario está en /register y tiene un token válido, redirigir a dashboard
  if (pathname === '/register' && token) {
    return jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
      .then(() => {
        const res = NextResponse.redirect(new URL('/dashboard', request.url));
        return withSecurityHeaders(res);
      })
      .catch(() => {
        // Token inválido, permitir acceso al registro
        return withSecurityHeaders(NextResponse.next());
      });
  }

  // Verificar si la ruta actual requiere autenticación
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // Si es una ruta pública, permitir acceso
  if (isPublicRoute) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Si no es una ruta protegida, permitir acceso (archivos estáticos, etc.)
  if (!isProtectedRoute) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Si no hay token, redirigir al login o devolver 401 para APIs
  if (!token) {
    SecurityLogger.unauthorizedAccess(request);
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
      return withSecurityHeaders(res);
    }
    return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }

  // Verificar el token usando jose (compatible con Edge Runtime)
  return jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
    .then(({ payload }) => {
      // Validar que el payload tenga los campos requeridos
      if (!payload.userId || !payload.email || !payload.companyId) {
        console.error('JWT payload missing required fields:', payload);
        SecurityLogger.tokenInvalid(request);
        if (pathname.startsWith('/api/')) {
          const res = NextResponse.json(
            { error: 'Invalid token', message: 'Token malformado' },
            { status: 401 }
          );
          return withSecurityHeaders(res);
        }
        return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
      }

      // Agregar información del usuario a los headers para uso posterior
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId as string);
      requestHeaders.set('x-user-email', payload.email as string);
      requestHeaders.set('x-company-id', payload.companyId as string);

      // Permitir acceso a la ruta protegida
      return withSecurityHeaders(NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }));
    })
    .catch((error) => {
      // Token inválido o expirado
      console.error('JWT verification failed:', error);
      SecurityLogger.tokenInvalid(request);
      
      if (pathname.startsWith('/api/')) {
        const res = NextResponse.json(
          { error: 'Invalid token', message: 'Token inválido o expirado' },
          { status: 401 }
        );
        return withSecurityHeaders(res);
      }
      return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
    });
}

// Configurar el matcher para todas las rutas que necesiten middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 