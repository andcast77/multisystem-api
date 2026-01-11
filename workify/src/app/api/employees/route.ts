export const runtime = "nodejs";
import { NextRequest } from 'next/server';
import { safeHandler, requireAuthFlexible, requireRole } from '../_helpers';
import { EmployeeService } from '@/services/employee.service';
import { ROLES } from '@/lib/constants';
import { 
  validateRequestSize, 
  sanitizeSearchParams, 
  validatePagination, 
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  validateCreateEmployee
} from '@/lib/utils/validation';
import { employeeToDTO } from '@/lib/utils/dto';
import type { EmployeeStatus } from '@/types';

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
    search: searchParams.get('search'),
    status: searchParams.get('status'),
    departmentId: searchParams.get('department'),
  });
  
  const { page, limit } = validatePagination(sanitizedParams.page, sanitizedParams.limit);
  const { search, status, departmentId } = sanitizedParams;

  // Usar EmployeeService para obtener la lista
  try {
    const result = await EmployeeService.getList({
      search,
      status: status as EmployeeStatus | undefined,
      departmentId,
      page,
      limit,
    }, companyId);

    const { employees, pagination } = result;
    const employeesDTO = employees.map(employeeToDTO);

    const response = Response.json({
      employees: employeesDTO,
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit
    });

    // Agregar headers de seguridad
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
      throw error;
    }
    if (error instanceof Error) {
      throw { status: 400, message: error.message };
    }
    throw { status: 500, message: 'Error interno del servidor' };
  }
});

export const POST = safeHandler(async (request: NextRequest) => {
  validateRequestSize(request);
  const user = await requireAuthFlexible(request);
  requireRole(user, [ROLES.ADMIN]);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  try {
    const body = await request.json();
    // Validar datos de entrada usando el validador
    const validatedData = validateCreateEmployee(body);
    // Usar EmployeeService para crear el empleado
    const created = await EmployeeService.create(validatedData, companyId);
    const employee = await EmployeeService.getById(created.id, companyId);
    const response = Response.json({ 
      message: 'Empleado creado exitosamente', 
      employee: employee ? employeeToDTO(employee) : null
    }, { status: 201 });
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error: unknown) {
    // Prisma unique constraint error
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
      throw { status: 409, message: 'Ya existe un empleado con este email o número de identificación en la empresa' };
    }
    // Validación de duplicado por lógica de servicio
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string' && (error as { message: string }).message.includes('Ya existe un empleado con este email')) {
      throw { status: 409, message: (error as { message: string }).message };
    }
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
      throw error;
    }
    if (error instanceof Error) {
      throw { status: 400, message: error.message };
    }
    throw { status: 500, message: 'Error interno del servidor' };
  }
}); 