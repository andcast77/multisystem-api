import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando test login...');
    
    const body = await request.json();
    console.log('📝 Body recibido:', { email: body.email, password: body.password ? '***' : 'undefined' });
    
    if (!body.email || !body.password) {
      return Response.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    console.log('🔍 Buscando usuario:', body.email);
    
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        roles: true
      }
    });

    console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (!user) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    console.log('🔐 Verificando contraseña...');
    
    const isValid = await bcrypt.compare(body.password, user.password);
    console.log('🔑 Contraseña válida:', isValid);
    
    if (!isValid) {
      return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    console.log('🎫 Generando token...');
    
    // Obtener companyId desde el primer UserRole
    const companyId = user.roles?.[0]?.companyId;
    let company = null;
    if (companyId) {
      company = await prisma.company.findUnique({ where: { id: companyId } });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, companyId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login exitoso');
    
    return Response.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        companyId,
        company
      }
    });

  } catch (error) {
    console.error('❌ Error en test login:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 