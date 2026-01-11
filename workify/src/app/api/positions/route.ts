import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../_helpers';
import { PositionService } from '@/services/position.service';
import { validateCreatePosition } from '@/lib/utils/validation';
import { ROLES } from '@/lib/constants';

export const GET = safeHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  const positions = await PositionService.getAll(companyId);
  return Response.json({ positions });
});

export const POST = safeHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  requireRole(user, [ROLES.ADMIN, ROLES.HR]);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };
  const body = await request.json();
  const validated = validateCreatePosition(body);
  const filteredData = Object.fromEntries(Object.entries(validated).filter(([, value]) => value !== undefined));
  const position = await PositionService.create(filteredData, companyId);
  return Response.json({ message: 'Cargo creado exitosamente', position }, { status: 201 });
}); 