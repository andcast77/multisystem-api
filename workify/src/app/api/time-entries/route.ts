import { NextRequest } from 'next/server';
import { safeHandler, requireAuthFlexible, requireRole } from '../_helpers';
import { TimeEntryService } from '@/services/timeEntry.service';
import { 
  validateRequestSize, 
  sanitizeSearchParams, 
  validatePagination, 
  validateDateRange,
  limitResponseSize,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateCreateTimeEntry
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
    employeeId: searchParams.get('employeeId'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    source: searchParams.get('source'),
  });
  
  const { page, limit } = validatePagination(sanitizedParams.page, sanitizedParams.limit);
  const { employeeId, startDate, endDate, source } = sanitizedParams;

  // Validar rango de fechas
  const { start, end } = validateDateRange(startDate, endDate);

  // Usar TimeEntryService para obtener la lista
  const filters = {
    employeeId: employeeId || undefined,
    startDate: start?.toISOString(),
    endDate: end?.toISOString(),
    source: source || undefined,
    page,
    limit
  };

  const result = await TimeEntryService.getList(filters, companyId);

  // Limitar tamaño de respuesta
  const limitedTimeEntries = limitResponseSize(result.timeEntries);

  const response = Response.json({
    timeEntries: limitedTimeEntries,
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
  const validatedData = validateCreateTimeEntry(body);

  // Usar TimeEntryService para crear la entrada de tiempo
  const timeEntry = await TimeEntryService.create(validatedData, companyId);

  const response = Response.json({ 
    message: 'Entrada de tiempo creada exitosamente', 
    timeEntry 
  }, { status: 201 });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}); 