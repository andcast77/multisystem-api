import { NextRequest } from 'next/server';
import { safeHandler, requireAuthFlexible, requireRole } from '../_helpers';
import { HolidayService } from '@/services/holiday.service';
import { 
  validateRequestSize, 
  sanitizeSearchParams, 
  validatePagination, 
  limitResponseSize,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateCreateHoliday,
  validateHolidayFilters
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
    year: searchParams.get('year'),
    type: searchParams.get('type'),
    isActive: searchParams.get('isActive'),
  });
  
  const { page, limit } = validatePagination(sanitizedParams.page, sanitizedParams.limit);
  const { year, type, isActive } = sanitizedParams;

  // Validar filtros usando el validador centralizado
  const validatedFilters = validateHolidayFilters({
    year: year ? parseInt(year) : undefined,
    type: type || undefined,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    page,
    limit
  });

  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filters = Object.fromEntries(
    Object.entries(validatedFilters).filter(([, value]) => value !== undefined)
  );

  // Usar HolidayService para obtener la lista
  const result = await HolidayService.getList(filters, companyId);

  // Limitar tamaño de respuesta
  const limitedHolidays = limitResponseSize(result.holidays);

  const response = Response.json({
    holidays: limitedHolidays,
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
  const validatedData = validateCreateHoliday(body);

  // Usar HolidayService para crear el día festivo
  const holiday = await HolidayService.create(validatedData, companyId);

  const response = Response.json({ message: 'Día festivo creado exitosamente', holiday }, { status: 201 });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}); 