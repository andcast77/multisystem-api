import { prisma } from '@/lib/prisma';
import { UserWithRelations } from '@/types';
import { LoginCredentials, RegisterData } from '@/interfaces';
import { Company, Employee } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '@/lib/config';

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<{ user: UserWithRelations; token: string; company: Company; employee: Employee | null }> {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        roles: {
          include: {
            user: true,
            role: true,
            company: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error('Contraseña incorrecta');
    }

    // Obtener la empresa desde el primer UserRole
    const company = user.roles?.[0]?.company as Company;
    const companyId = company?.id;
    if (!companyId || !company) throw new Error('El usuario no tiene empresa asociada');

    // Obtener el empleado asociado (si existe)
    const employee = await prisma.employee.findFirst({ where: { userId: user.id } });

    const token = jwt.sign(
      { userId: user.id, email: user.email, companyId },
      JWT_CONFIG.SECRET,
      {
        expiresIn: JWT_CONFIG.EXPIRES_IN,
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE
      }
    );

    // Asegurar que el objeto cumple UserWithRelations
    const userWithRelations: UserWithRelations = {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone ?? null,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret ?? null,
      roles: user.roles.map(r => ({
        id: r.id,
        userId: r.userId,
        roleId: r.roleId,
        companyId: r.companyId,
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
        role: r.role
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    return { user: userWithRelations, token, company, employee };
  }

  static async register(data: RegisterData): Promise<{ user: UserWithRelations; token: string }> {
    // Validar unicidad de usuario
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error('Ya existe un usuario con este email');

    try {
      // Guardar empresa con nombre original (mayúsculas/minúsculas)
      const company = await prisma.company.create({
        data: { name: data.companyName.trim() }
      });

      // Crear rol ADMIN para la empresa (si no existe)
      let adminRole = await prisma.role.findFirst({ where: { name: 'admin', companyId: company.id } });
      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            name: 'admin',
            companyId: company.id
          }
        });
      }

      // Crear usuario
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          isActive: true,
          firstName: data.firstName,
          lastName: data.lastName
        }
      });

      // Crear posición por defecto para el administrador
      const defaultPosition = await prisma.position.create({
        data: {
          name: 'Administrador',
          description: 'Posición por defecto para administradores',
          salaryAmount: 0,
          salaryType: 'month',
          overtimeEligible: false,
          hasAguinaldo: true,
          companyId: company.id
        }
      });

      // Crear empleado asociado
      await prisma.employee.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          idNumber: `EMP-${Date.now()}`,
          email: data.email,
          companyId: company.id,
          positionId: defaultPosition.id,
          status: 'ACTIVE',
          userId: user.id
        }
      });

      // Asignar rol de administrador al usuario creado
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
          companyId: company.id
        }
      });

      // Obtener usuario actualizado con roles
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          roles: {
            include: {
              user: true,
              role: true,
              company: true
            }
          }
        }
      });
      if (!userWithRoles) throw new Error('No se pudo obtener el usuario creado');

      const token = jwt.sign(
        { userId: userWithRoles.id, email: userWithRoles.email, companyId: company.id },
        JWT_CONFIG.SECRET,
        {
          expiresIn: JWT_CONFIG.EXPIRES_IN,
          issuer: JWT_CONFIG.ISSUER,
          audience: JWT_CONFIG.AUDIENCE
        }
      );

      // Asegurar que el objeto cumple UserWithRelations
      const userWithRelations: UserWithRelations = {
        id: userWithRoles.id,
        email: userWithRoles.email,
        password: userWithRoles.password,
        firstName: userWithRoles.firstName ?? null,
        lastName: userWithRoles.lastName ?? null,
        phone: userWithRoles.phone ?? null,
        isActive: userWithRoles.isActive,
        twoFactorEnabled: userWithRoles.twoFactorEnabled,
        twoFactorSecret: userWithRoles.twoFactorSecret ?? null,
        roles: userWithRoles.roles.map(r => ({
          id: r.id,
          userId: r.userId,
          roleId: r.roleId,
          companyId: r.companyId,
          user: {
            id: userWithRoles.id,
            email: userWithRoles.email,
            password: userWithRoles.password,
            firstName: userWithRoles.firstName ?? null,
            lastName: userWithRoles.lastName ?? null,
            phone: userWithRoles.phone ?? null,
            isActive: userWithRoles.isActive,
            twoFactorEnabled: userWithRoles.twoFactorEnabled,
            twoFactorSecret: userWithRoles.twoFactorSecret ?? null,
            createdAt: userWithRoles.createdAt,
            updatedAt: userWithRoles.updatedAt
          },
          role: r.role
        })),
        createdAt: userWithRoles.createdAt,
        updatedAt: userWithRoles.updatedAt
      };
      return { user: userWithRelations, token };
    } catch (error) {
      throw error; // Re-throw other errors
    }
  }

  static async verifyToken(token: string): Promise<{ userId: string; email: string; companyId: string }> {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.SECRET, {
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE
      }) as { userId: string; email: string; companyId: string };
      return {
        userId: decoded.userId,
        email: decoded.email,
        companyId: decoded.companyId
      };
    } catch {
      throw new Error('Token inválido');
    }
  }

  static async getUserById(userId: string): Promise<UserWithRelations | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            user: true,
            role: true,
            company: true
          }
        }
      }
    });
    if (!user) return null;
    const userWithRelations: UserWithRelations = {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone ?? null,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret ?? null,
      roles: user.roles.map(r => ({
        id: r.id,
        userId: r.userId,
        roleId: r.roleId,
        companyId: r.companyId,
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
        role: r.role
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    return userWithRelations;
  }
} 