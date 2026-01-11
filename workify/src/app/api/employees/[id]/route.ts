export const runtime = "nodejs";
import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../_helpers';
import { EmployeeService } from '@/services/employee.service';
import { 
  validateRequestSize, 
  validateUUID,
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateUpdateEmployee
} from '@/lib/utils/validation';
import { employeeToDTO } from '@/lib/utils/dto';

export const GET = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } | Promise<{ [key: string]: string }> }) => {
  validateRequestSize(request);
  let id: string | undefined;
  if (context?.params) {
    const maybePromise = context.params;
    if (typeof (maybePromise as Promise<unknown>).then === 'function') {
      const resolved = await maybePromise;
      id = resolved?.id;
    } else {
      id = (maybePromise as { id: string })?.id;
    }
  }
  if (!id) throw { status: 400, message: 'ID de empleado requerido' };
  if (!validateUUID(id)) throw { status: 400, message: 'ID de empleado inválido' };
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  const employee = await EmployeeService.getById(id, companyId);
  if (!employee) throw { status: 404, message: 'Empleado no encontrado' };
  const response = Response.json({ employee: employeeToDTO(employee) });
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });
  return response;
});

export const PUT = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } | Promise<{ [key: string]: string }> }) => {
  validateRequestSize(request);
  let id: string | undefined;
  if (context?.params) {
    const maybePromise = context.params;
    if (typeof (maybePromise as Promise<unknown>).then === 'function') {
      const resolved = await maybePromise;
      id = resolved?.id;
    } else {
      id = (maybePromise as { id: string })?.id;
    }
  }
  if (!id) throw { status: 400, message: 'ID de empleado requerido' };
  if (!validateUUID(id)) throw { status: 400, message: 'ID de empleado inválido' };
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  const body = await request.json();
  const validatedData = validateUpdateEmployee(body);
  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filteredData = Object.fromEntries(
    Object.entries(validatedData).filter(([, value]) => value !== undefined)
  );
  await EmployeeService.update(id, filteredData, companyId);
  const updatedEmployee = await EmployeeService.getById(id, companyId);
  const response = Response.json({
    message: 'Empleado actualizado exitosamente',
    employee: updatedEmployee ? employeeToDTO(updatedEmployee) : null
  });
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });
  return response;
});

export const DELETE = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } | Promise<{ [key: string]: string }> }) => {
  validateRequestSize(request);
  let id: string | undefined;
  if (context?.params) {
    const maybePromise = context.params;
    if (typeof (maybePromise as Promise<unknown>).then === 'function') {
      const resolved = await maybePromise;
      id = resolved?.id;
    } else {
      id = (maybePromise as { id: string })?.id;
    }
  }
  if (!id) throw { status: 400, message: 'ID de empleado requerido' };
  if (!validateUUID(id)) throw { status: 400, message: 'ID de empleado inválido' };
  const user = await requireAuth(request);
  requireRole(user, ['admin']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  await EmployeeService.delete(id, companyId);
  const response = Response.json({
    message: 'Empleado eliminado exitosamente'
  });
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });
  return response;
}); 