import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../_helpers';
import { TimeEntryService } from '@/services/timeEntry.service';
import { 
  validateRequestSize, 
  validateUUID,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateUpdateTimeEntry
} from '@/lib/utils/validation';

export const GET = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  let id: string;
  
  try {
    const resolvedParams = await params;
    if (!resolvedParams || !resolvedParams.id) {
      throw { status: 400, message: 'ID de registro requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de registro requerido' };
  }
  
  // Validar UUID
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de registro inválido' };
  }
  
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  // Usar TimeEntryService para obtener el registro
  const timeEntry = await TimeEntryService.getById(id, companyId);
  
  if (!timeEntry) {
    throw { status: 404, message: 'Registro de tiempo no encontrado' };
  }

  const response = Response.json({ timeEntry });

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
      throw { status: 400, message: 'ID de registro requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de registro requerido' };
  }
  
  // Validar UUID
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de registro inválido' };
  }
  
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos de entrada usando el validador centralizado
  const validatedData = validateUpdateTimeEntry(body);

  // Usar TimeEntryService para actualizar el registro
  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filteredData = Object.fromEntries(
    Object.entries(validatedData).filter(([, value]) => value !== undefined)
  );
  const updatedTimeEntry = await TimeEntryService.update(id, filteredData, companyId);

  const response = Response.json({
    message: 'Registro de tiempo actualizado exitosamente',
    timeEntry: updatedTimeEntry
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
      throw { status: 400, message: 'ID de registro requerido' };
    }
    id = resolvedParams.id;
  } catch {
    throw { status: 400, message: 'ID de registro requerido' };
  }
  
  // Validar UUID
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID de registro inválido' };
  }
  
  const user = await requireAuth(request);
  requireRole(user, ['admin']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  // Usar TimeEntryService para eliminar el registro
  await TimeEntryService.delete(id, companyId);

  const response = Response.json({
    message: 'Registro de tiempo eliminado exitosamente'
  });

  // Agregar headers de seguridad
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  return response;
}); 