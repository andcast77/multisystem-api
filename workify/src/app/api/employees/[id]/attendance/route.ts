import { NextRequest } from 'next/server';
import { safeHandler, requireAuth } from '../../../_helpers';
import { EmployeeService } from '@/services/employee.service';
import { employeeToDTO } from '@/lib/utils/dto';

export const GET = safeHandler(async (request: NextRequest, context?: { params?: { [key: string]: string } }) => {
  const id = context?.params?.id;
  
  try {
    if (!id) {
      throw { status: 400, message: 'ID de empleado requerido' };
    }
  } catch {
    throw { status: 400, message: 'ID de empleado requerido' };
  }
  
  const user = await requireAuth(request);
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  // Obtener parámetros de consulta
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  // Obtener empleado
  const employee = await EmployeeService.getById(id, companyId);
  if (!employee) {
    throw { status: 404, message: 'Empleado no encontrado' };
  }

  // Obtener estadísticas de asistencia
  const attendanceStats = await EmployeeService.getAttendanceStats(id, companyId);

  // Generar datos de asistencia para el mes
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr) || new Date().getFullYear();
  const monthNum = Number(monthStr) || new Date().getMonth() + 1;
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0);
  
  const attendance = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    const dayOfWeek = date.getDay();
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
    
    // Buscar entrada de tiempo para este día
    const timeEntry = attendanceStats.recentEntries.find(entry => 
      new Date(entry.date).toDateString() === date.toDateString()
    );

    attendance.push({
      date: date.toISOString(),
      dayOfWeek,
      dayName,
      scheduledStart: null, // TODO: Implementar horarios
      scheduledEnd: null,   // TODO: Implementar horarios
      clockIn: timeEntry?.clockIn || null,
      clockOut: timeEntry?.clockOut || null,
      status: timeEntry ? 'present' : 'not_scheduled',
      isLate: false, // TODO: Implementar lógica de tardanza
      hasIncident: false,
      notes: timeEntry?.notes || '',
      isWorkDay: dayOfWeek >= 1 && dayOfWeek <= 5 // Lunes a Viernes
    });
  }

  // Calcular KPIs
  const workDays = attendance.filter(day => day.isWorkDay).length;
  const presentDays = attendance.filter(day => day.status === 'present').length;
  const absentDays = workDays - presentDays;

  const kpis = {
    totalDays: attendance.length,
    workDays,
    presentDays,
    lateDays: 0, // TODO: Implementar
    absentDays,
    incidents: 0, // TODO: Implementar
    totalHours: attendanceStats.averageHours * presentDays
  };

  return Response.json({
    employee: employeeToDTO(employee),
    month,
    attendance,
    kpis
  });
}); 