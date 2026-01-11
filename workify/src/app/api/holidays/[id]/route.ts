import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../_helpers';
import { HolidayService } from '@/services/holiday.service';
import { 
  validateRequestSize, 
  validateUUID,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateUpdateHoliday,
  validateHolidayId
} from '@/lib/utils/validation';

export const GET = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  let id: string; 
  
  try {
    const resolvedParams = await params;
    if (!resolvedParams || !resolvedParams.id) {
      throw { status: 400, message: 'ID de día festivo requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de día festivo requerido' };
  }
  
  // Validar UUID y ID usando el validador centralizado
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de día festivo inválido' };
  }
  validateHolidayId(id);
  
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  // Usar HolidayService para obtener el día festivo
  const holiday = await HolidayService.getById(id, companyId);
  
  if (!holiday) {
    throw { status: 404, message: 'Día festivo no encontrado' };
  }

  const response = Response.json({ holiday });

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
      throw { status: 400, message: 'ID de día festivo requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de día festivo requerido' };
  }
  
  // Validar UUID y ID usando el validador centralizado
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de día festivo inválido' };
  }
  validateHolidayId(id);
  
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos de entrada usando el validador centralizado
  const validatedData = validateUpdateHoliday(body);

  // Usar HolidayService para actualizar el día festivo
  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filteredData = Object.fromEntries(
    Object.entries(validatedData).filter(([, value]) => value !== undefined)
  );
  const updatedHoliday = await HolidayService.update(id, filteredData, companyId);

  const response = Response.json({
    message: 'Día festivo actualizado exitosamente',
    holiday: updatedHoliday
  });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  return response;
});

export const DELETE = safeHandler(async (request: NextRequest, ...args: unknown[]) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  const { id } = (args[0] as { params: { id: string } }).params;
  
  // Validar UUID y ID usando el validador centralizado
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de día festivo inválido' };
  }
  validateHolidayId(id);
  
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  // Usar HolidayService para eliminar el día festivo
  await HolidayService.delete(id, companyId);

  const response = Response.json({
    message: 'Día festivo eliminado exitosamente'
  });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  return response;
}); 