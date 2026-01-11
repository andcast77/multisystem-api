import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '@/lib/config';
import { validateLoginInput } from '@/lib/utils/validation';
import { userToDTO } from '@/lib/utils/dto';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando login simple sin safeHandler...');
    
    const body = await request.json();
    console.log('📝 Body recibido:', { email: body.email, password: body.password ? '***' : 'undefined' });
    
    let email, password;
    try {
      ({ email, password } = validateLoginInput(body.email, body.password));
    } catch (err) {
      const error = err as { status?: number; message?: string };
      return Response.json({ error: error.message || 'Datos inválidos' }, { status: error.status || 400 });
    }

    console.log('🔍 Buscando usuario:', email);
    
    const user = await prisma.user.findUnique({
      where: { email: email },
      include: {
        employees: true,
        roles: {
          include: { role: true, company: true }
        }
      }
    });

    console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (!user) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    // Obtener companyId desde el primer UserRole
    const companyId = user.roles?.[0]?.companyId;
    if (!companyId) {
      return Response.json({ error: 'El usuario no tiene empresa asociada' }, { status: 401 });
    }

    // Transformar roles a UserRole completo para cumplir el tipo UserWithRelations
    const userRoles = user.roles.map((ur: typeof user.roles[0]) => ({
      userId: ur.userId,
      roleId: ur.roleId,
      companyId: ur.companyId,
      user: {
        id: user.id,
        email: user.email,
        password: user.password,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        phone: user.phone ?? null,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorSecret: user.twoFactorSecret ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      role: ur.role,
      company: ur.company
    }));
    const userWithRelations = {
      ...user,
      employee: user.employees?.[0] ?? null,
      companyId,
      company: user.roles?.[0]?.company ?? null,
      roles: userRoles
    };

    console.log('🔐 Verificando contraseña...');
    
    const isValid = await bcrypt.compare(password, user.password);
    console.log('🔑 Contraseña válida:', isValid);
    
    if (!isValid) {
      return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    console.log('🎫 Generando token...');
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, companyId },
      JWT_CONFIG.SECRET,
      { 
        expiresIn: JWT_CONFIG.EXPIRES_IN,
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE
      }
    );

    console.log('🍪 Configurando respuesta...');
    
    const response = Response.json({
      message: 'Login exitoso',
      token,
      user: userToDTO(userWithRelations)
    });

    // Configurar cookie simple
    response.headers.set('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${JWT_CONFIG.EXPIRES_IN}; SameSite=Strict`);
    
    // Agregar headers de seguridad básicos
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    console.log('✅ Login exitoso completado');
    
    return response;

  } catch (error) {
    console.error('❌ Error en login simple:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 