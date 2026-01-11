import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../../_helpers';
import { EmployeeService } from '@/services/employee.service';

export const GET = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } }) => {
  const id = context?.params?.id;
  
  if (!id) {
    throw { status: 400, message: 'ID de empleado requerido' };
  }
  
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const schedules = await EmployeeService.getSchedules(id, companyId);
  
  return Response.json({ schedules });
});

export const POST = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } }) => {
  const id = context?.params?.id;
  
  if (!id) {
    throw { status: 400, message: 'ID de empleado requerido' };
  }
  
  const user = await requireAuth(request);
  requireRole(user, ['admin', 'hr']);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  const body = await request.json();
  
  // Validar datos básicos
  if (body.dayOfWeek === undefined || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
    throw { status: 400, message: 'Día de la semana inválido' };
  }

  if (body.isWorkDay && !body.workShiftId) {
    throw { status: 400, message: 'Día laboral debe tener un turno de trabajo asignado' };
  }

  const schedule = await EmployeeService.updateSchedule(id, body.dayOfWeek, {
    isWorkDay: body.isWorkDay,
    workShiftId: body.workShiftId
  }, companyId);

  return Response.json({
    message: 'Horario actualizado exitosamente',
    schedule
  });
}); 