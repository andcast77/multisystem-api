import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../_helpers';
import { RoleService } from '@/services/role.service';
import { 
  validateRequestSize, 
  validateUUID,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateUpdateRole,
  validateRoleId
} from '@/lib/utils/validation';
import { roleToDTO } from '@/lib/utils/dto';

export const GET = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  let id: string;
  
  try {
    const resolvedParams = await params;
    if (!resolvedParams || !resolvedParams.id) {
      throw { status: 400, message: 'ID de rol requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de rol requerido' };
  }
  
  // Validar UUID
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de rol inválido' };
  }
  
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  // Validar ID usando el validador centralizado
  validateRoleId(id);

  // Usar RoleService para obtener el rol
  const role = await RoleService.getById(id, companyId);
  
  if (!role) {
    throw { status: 404, message: 'Rol no encontrado' };
  }

  const response = Response.json({ role: roleToDTO(role) });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  return response;
});

export const PUT = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  let id: string;
  
  try {
    const resolvedParams = await params;
    if (!resolvedParams || !resolvedParams.id) {
      throw { status: 400, message: 'ID de rol requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de rol requerido' };
  }
  
  // Validar UUID
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de rol inválido' };
  }
  
  const user = await requireAuth(request);
  requireRole(user, ['admin']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos de entrada usando el validador centralizado
  const validatedData = validateUpdateRole(body);

  // Usar RoleService para actualizar el rol
  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filteredData = Object.fromEntries(
    Object.entries(validatedData).filter(([, value]) => value !== undefined)
  );
  const updatedRole = await RoleService.update(id, filteredData, companyId);

  const response = Response.json({
    message: 'Rol actualizado exitosamente',
    role: roleToDTO(updatedRole)
  });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  return response;
});

export const DELETE = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  let id: string;
  
  try {
    const resolvedParams = await params;
    if (!resolvedParams || !resolvedParams.id) {
      throw { status: 400, message: 'ID de rol requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de rol requerido' };
  }
  
  // Validar UUID
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de rol inválido' };
  }
  
  const user = await requireAuth(request);
  requireRole(user, ['admin']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  // Usar RoleService para eliminar el rol
  await RoleService.delete(id, companyId);

  const response = Response.json({
    message: 'Rol eliminado exitosamente'
  });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  return response;
}); 