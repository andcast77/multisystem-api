import { NextRequest } from 'next/server';
import { safeHandler, requireAuthFlexible, requireRole } from '../_helpers';
import { RoleService } from '@/services/role.service';
import { 
  validateRequestSize, 
  sanitizeSearchParams, 
  validatePagination, 
  limitResponseSize,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateCreateRole,
  validateRoleFilters
} from '@/lib/utils/validation';
import { roleToDTO } from '@/lib/utils/dto';

export const GET = safeHandler(async (request: NextRequest) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  const user = await requireAuthFlexible(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const { searchParams } = new URL(request.url);
  
  // Sanitizar y validar parámetros de búsqueda
  const sanitizedParams = sanitizeSearchParams({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    isActive: searchParams.get('isActive'),
  });
  
  const { page, limit } = validatePagination(sanitizedParams.page, sanitizedParams.limit);
  const { isActive } = sanitizedParams;

  // Validar filtros usando el validador centralizado
  const validatedFilters = validateRoleFilters({
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    page,
    limit
  });

  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filters = Object.fromEntries(
    Object.entries(validatedFilters).filter(([, value]) => value !== undefined)
  );

  // Usar RoleService para obtener la lista
  const result = await RoleService.getList(filters, companyId);

  // Transformar roles usando DTO y limitar tamaño de respuesta
  const rolesDTO = result.roles.map(roleToDTO);
  const limitedRoles = limitResponseSize(rolesDTO);

  const response = Response.json({
    roles: limitedRoles,
    pagination: result.pagination,
    stats: result.stats
  });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

export const POST = safeHandler(async (request: NextRequest) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  const user = await requireAuthFlexible(request);
  requireRole(user, ['admin']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos de entrada usando el validador centralizado
  const validatedData = validateCreateRole(body);

  // Usar RoleService para crear el rol
  const role = await RoleService.create(validatedData, companyId);

  const response = Response.json({ message: 'Rol creado exitosamente', role: roleToDTO(role) }, { status: 201 });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}); 