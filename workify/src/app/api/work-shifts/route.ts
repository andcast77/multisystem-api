import { NextRequest } from 'next/server';
import { safeHandler, requireAuthFlexible, requireRole } from '../_helpers';
import { WorkShiftService } from '@/services/workShift.service';
import { 
  validateRequestSize, 
  sanitizeSearchParams, 
  validatePagination, 
  limitResponseSize,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateCreateWorkShift,
  validateWorkShiftFilters
} from '@/lib/utils/validation';

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
    isNightShift: searchParams.get('isNightShift'),
  });
  
  const { page, limit } = validatePagination(sanitizedParams.page, sanitizedParams.limit);
  const { isActive, isNightShift } = sanitizedParams;

  // Validar filtros usando el validador centralizado
  const validatedFilters = validateWorkShiftFilters({
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    isNightShift: isNightShift === 'true' ? true : isNightShift === 'false' ? false : undefined,
    page,
    limit
  });

  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filters = Object.fromEntries(
    Object.entries(validatedFilters).filter(([, value]) => value !== undefined)
  );

  // Usar WorkShiftService para obtener la lista
  const result = await WorkShiftService.getList(filters, companyId);

  // Limitar tamaño de respuesta
  const limitedWorkShifts = limitResponseSize(result.workShifts);

  const response = Response.json({
    workShifts: limitedWorkShifts,
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
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos de entrada usando el validador centralizado
  const validatedData = validateCreateWorkShift(body);

  // Convertir undefined a null para cumplir con CreateWorkShiftData
  const workShiftData = {
    ...validatedData,
    description: validatedData.description || null,
    breakStart: validatedData.breakStart || null,
    breakEnd: validatedData.breakEnd || null,
  };

  // Usar WorkShiftService para crear el turno
  const workShift = await WorkShiftService.create(workShiftData, companyId);

  const response = Response.json({ 
    message: 'Turno de trabajo creado exitosamente', 
    workShift 
  }, { status: 201 });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}); 