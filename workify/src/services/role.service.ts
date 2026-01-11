import { prisma } from '@/lib/prisma';
import { Role, Permission, Prisma } from '@prisma/client';

export interface CreateRoleData {
  name: string;
  permissions: string[];
}

export type ActiveRoleSummary = {
  id: string;
  name: string;
};

export interface RoleFilters {
  page?: number | undefined;
  limit?: number | undefined;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export class RoleService {
  /**
   * Crear un nuevo rol
   */
  static async create(data: CreateRoleData, companyId: string): Promise<RoleWithPermissions> {
    // Verificar que el nombre no esté duplicado en la empresa
    const existingRole = await prisma.role.findFirst({
      where: { 
        name: data.name, 
        companyId 
      }
    });

    if (existingRole) {
      throw new Error('Ya existe un rol con este nombre');
    }

    // Verificar que los permisos existen
    if (data.permissions.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: { id: { in: data.permissions } }
      });

      if (permissions.length !== data.permissions.length) {
        throw new Error('Algunos permisos especificados no existen');
      }
    }

    return prisma.role.create({
      data: {
        name: data.name,
        companyId,
        permissions: {
          connect: data.permissions.map(id => ({ id }))
        }
      },
      include: {
        permissions: true
      }
    });
  }

  /**
   * Obtener rol por ID
   */
  static async getById(id: string, companyId: string): Promise<RoleWithPermissions | null> {
    return prisma.role.findFirst({
      where: { 
        id,
        companyId
      },
      include: {
        permissions: true
      }
    });
  }

  /**
   * Obtener lista de roles con filtros
   */
  static async getList(filters: RoleFilters, companyId: string) {
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    // Construir condiciones de búsqueda
    const where: Record<string, unknown> = { companyId };
    
    // Ejecutar consultas en paralelo
    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          permissions: true
        }
      }),
      prisma.role.count({ where })
    ]);

    return {
      roles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total
      }
    };
  }

  /**
   * Actualizar rol
   */
  static async update(id: string, data: Partial<CreateRoleData>, companyId: string): Promise<RoleWithPermissions> {
    // Verificar que el rol existe y pertenece a la empresa
    const existingRole = await prisma.role.findFirst({
      where: { 
        id,
        companyId
      }
    });

    if (!existingRole) {
      throw new Error('Rol no encontrado');
    }

    // Verificar duplicados de nombre si se está cambiando
    if (data.name && data.name !== existingRole.name) {
      const duplicateRole = await prisma.role.findFirst({
        where: {
          name: data.name,
          companyId,
          id: { not: id }
        }
      });
      if (duplicateRole) {
        throw new Error('Ya existe un rol con este nombre');
      }
    }

    // Verificar que los permisos existen si se están actualizando
    if (data.permissions && data.permissions.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: { id: { in: data.permissions } }
      });

      if (permissions.length !== data.permissions.length) {
        throw new Error('Algunos permisos especificados no existen');
      }
    }

    // Preparar datos para actualización (solo claves válidas y tipos correctos)
    const updateData: Prisma.RoleUpdateInput = {};
    if (typeof data.name === 'string') updateData.name = data.name.trim();
    // Manejar permisos por separado
    if (data.permissions !== undefined) {
      // Primero desconectar todos los permisos existentes
      await prisma.role.update({
        where: { id },
        data: {
          permissions: {
            set: []
          }
        }
      });
      // Luego conectar los nuevos permisos
      if (data.permissions.length > 0) {
        updateData.permissions = {
          connect: data.permissions.map((permissionId: string) => ({ id: permissionId }))
        };
      }
    }

    return prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: true
      }
    });
  }

  /**
   * Eliminar rol
   */
  static async delete(id: string, companyId: string): Promise<void> {
    // Verificar que el rol existe y pertenece a la empresa
    const existingRole = await prisma.role.findFirst({
      where: { 
        id,
        companyId
      }
    });

    if (!existingRole) {
      throw new Error('Rol no encontrado');
    }

    await prisma.role.delete({
      where: { id }
    });
  }

  /**
   * Obtener todos los permisos disponibles
   */
  static async getPermissions(): Promise<Permission[]> {
    return prisma.permission.findMany({
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Obtener roles activos para asignación
   */
  static async getActiveRoles(companyId: string): Promise<ActiveRoleSummary[]> {
    return prisma.role.findMany({
      where: { 
        companyId
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true
      }
    });
  }

  /**
   * Verificar si un usuario tiene un permiso específico
   */
  static async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.roles) {
      return false;
    }

    // Un usuario puede tener varios roles, cada uno con varios permisos
    for (const userRole of user.roles) {
      if (userRole.role && userRole.role.permissions.some(permission => permission.name === permissionName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtener permisos de un usuario
   */
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.roles) {
      return [];
    }

    // Unificar todos los permisos de todos los roles del usuario
    const permissionsSet = new Set<string>();
    const permissions: Permission[] = [];
    for (const userRole of user.roles) {
      if (userRole.role) {
        for (const permission of userRole.role.permissions) {
          if (!permissionsSet.has(permission.id)) {
            permissionsSet.add(permission.id);
            permissions.push(permission);
          }
        }
      }
    }
    return permissions;
  }
} 