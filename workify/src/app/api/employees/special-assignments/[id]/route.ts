import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../../_helpers';
import { SpecialAssignmentService } from '@/services/specialAssignment.service';
import { validateUpdateSpecialAssignment } from '@/lib/utils/validation';

export const GET = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    throw { status: 400, message: 'ID de asignación requerido' };
  }
  const { id } = resolvedParams;
  
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const assignment = await SpecialAssignmentService.getById(id, companyId);
  
  if (!assignment) {
    throw { status: 404, message: 'Asignación especial no encontrada' };
  }

  return Response.json({ assignment });
});

export const PUT = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    throw { status: 400, message: 'ID de asignación requerido' };
  }
  const { id } = resolvedParams;
  
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos de entrada
    const validatedData = validateUpdateSpecialAssignment(body);
  
  // Filtrar campos undefined para cumplir con exactOptionalPropertyTypes
  const filteredData = Object.fromEntries(
    Object.entries(validatedData).filter(([, value]) => value !== undefined)
  );

  const updatedAssignment = await SpecialAssignmentService.update(id, filteredData, companyId);

  return Response.json({
    message: 'Asignación especial actualizada exitosamente',
    assignment: updatedAssignment
  });
});

export const DELETE = safeHandler(async (request: NextRequest, params?: Promise<{ [key: string]: string }>) => {
  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    throw { status: 400, message: 'ID de asignación requerido' };
  }
  const { id } = resolvedParams;
  
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  await SpecialAssignmentService.delete(id, companyId);

  return Response.json({
    message: 'Asignación eliminada exitosamente'
  });
}); 