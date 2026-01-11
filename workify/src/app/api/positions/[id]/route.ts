import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../_helpers';
import { PositionService } from '@/services/position.service';
import { validateUpdatePosition } from '@/lib/utils/validation';
import { ROLES } from '@/lib/constants';

export const GET = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } }) => {
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  const id = context?.params?.id;
  if (!id) throw { status: 400, message: 'ID requerido' };
  const position = await PositionService.getById(id, companyId);
  if (!position) throw { status: 404, message: 'Cargo no encontrado' };
  return Response.json({ position });
});

export const PUT = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } }) => {
  const user = await requireAuth(request);
  requireRole(user, [ROLES.ADMIN, ROLES.HR]);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  const id = context?.params?.id;
  if (!id) throw { status: 400, message: 'ID requerido' };
  const body = await request.json();
  const validated = validateUpdatePosition(body);
  const filteredData = Object.fromEntries(Object.entries(validated).filter(([, value]) => value !== undefined));
  const position = await PositionService.update(id, filteredData, companyId);
  return Response.json({ message: 'Cargo actualizado exitosamente', position });
});

export const DELETE = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } }) => {
  const user = await requireAuth(request);
  requireRole(user, [ROLES.ADMIN, ROLES.HR]);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  const id = context?.params?.id;
  if (!id) throw { status: 400, message: 'ID requerido' };
  await PositionService.delete(id);
  return Response.json({ message: 'Cargo eliminado exitosamente' });
}); 