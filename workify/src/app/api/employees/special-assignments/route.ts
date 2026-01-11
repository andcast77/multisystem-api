import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../_helpers';
import { SpecialAssignmentService } from '@/services/specialAssignment.service';
import { validateCreateSpecialAssignment, validateSpecialAssignmentFilters } from '@/lib/utils/validation';

export const GET = safeHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const { searchParams } = new URL(request.url);
  
  // Validar filtros
  const validatedFilters = validateSpecialAssignmentFilters({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    employeeId: searchParams.get('employeeId'),
    type: searchParams.get('type'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
  });

  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filters = Object.fromEntries(
    Object.entries(validatedFilters).filter(([, value]) => value !== undefined)
  );

  const result = await SpecialAssignmentService.getList(filters, companyId);
  
  return Response.json(result);
});

export const POST = safeHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos de entrada
  const validatedData = validateCreateSpecialAssignment(body);
  
  const assignment = await SpecialAssignmentService.create(validatedData, companyId);

  return Response.json({ 
    message: 'Asignación creada exitosamente', 
    assignment 
  }, { status: 201 });
}); 