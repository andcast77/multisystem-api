import { prisma } from '@/lib/prisma';

export interface DailyAttendanceStats {
  employeesWorking: number;
  employeesAbsent: number;
  employeesLate: number;
  employeesOnBreak: number;
  totalEmployees: number;
  isWorkDay: boolean;
  workDayReason?: string;
  employeesScheduled: number;
  specialDayType?: string;
}

export interface EmployeeAttendanceStatus {
  id: string;
  firstName: string;
  lastName: string;
  status: 'working' | 'absent' | 'late' | 'on_break' | 'not_scheduled';
  clockIn?: Date;
  clockOut?: Date | undefined;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  isLate: boolean;
  isOnBreak: boolean;
}

export interface WorkDayInfo {
  isWorkDay: boolean;
  reason?: string;
  holiday?: {
    name: string;
    description?: string;
  };
  specialDayType?: string;
}

export class AttendanceService {
  /**
   * Determina si una fecha es un día laborable para la empresa
   */
  static async isWorkDay(companyId: string, date: Date = new Date()): Promise<WorkDayInfo> {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];

    // 1. Verificar si es un feriado
    const holiday = await prisma.holidays.findFirst({
      where: {
        companyId,
        date: {
          gte: new Date(dateString + 'T00:00:00Z'),
          lt: new Date(dateString + 'T23:59:59Z')
        }
      }
    });
    if (holiday) {
      return {
        isWorkDay: false,
        reason: `Feriado: ${holiday.name}`,
        holiday: {
          name: holiday.name,
          ...(holiday.description && { description: holiday.description })
        },
        specialDayType: 'HOLIDAY'
      };
    }

    // 2. Verificar si es fin de semana
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isWorkDay: false,
        reason: dayOfWeek === 0 ? 'Domingo' : 'Sábado',
        specialDayType: 'WEEKEND'
      };
    }

    // 3. Por defecto, es laborable
    return { isWorkDay: true };
  }

  /**
   * Obtiene los empleados que deben trabajar en una fecha específica
   */
  static async getScheduledEmployees(companyId: string, date: Date = new Date()): Promise<{ id: string; firstName: string; lastName: string; schedule: { dayOfWeek: number; isWorkDay: boolean; workShift: { startTime: string; endTime: string } | null }[] }[]> {
    const dayOfWeek = date.getDay();
    // Empleados con todos sus horarios
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      include: {
        schedules: {
          include: {
            workShift: true
          }
        }
      }
    });
    // Filtrar los schedules por día en JS
    return employees.map(e => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      schedule: e.schedules.filter((s: { dayOfWeek: number; isWorkDay: boolean }) => s.dayOfWeek === dayOfWeek && s.isWorkDay).map((s: { dayOfWeek: number; isWorkDay: boolean; workShift: { startTime: string; endTime: string } | null }) => ({
        dayOfWeek: s.dayOfWeek,
        isWorkDay: s.isWorkDay,
        workShift: s.workShift ? { startTime: s.workShift.startTime, endTime: s.workShift.endTime } : null
      }))
    }));
  }

  /**
   * Obtiene las estadísticas de asistencia para una fecha específica
   */
  static async getDailyAttendanceStats(
    companyId: string,
    date: Date = new Date()
  ): Promise<DailyAttendanceStats> {
    const dateString = date.toISOString().split('T')[0];
    const workDayInfo = await this.isWorkDay(companyId, date);
    const scheduledEmployees = await this.getScheduledEmployees(companyId, date);
    const scheduledEmployeeIds = scheduledEmployees.map(e => e.id);

    // Obtener marcas de entrada/salida
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        companyId,
        date: {
          gte: new Date(dateString + 'T00:00:00Z'),
          lt: new Date(dateString + 'T23:59:59Z')
        },
        employeeId: { in: scheduledEmployeeIds }
      },
      select: {
        employeeId: true,
        clockIn: true,
        clockOut: true
      }
    });

    let employeesWorking = 0;
    let employeesLate = 0;
    const employeesOnBreak = 0;
    let employeesAbsent = 0;

    for (const emp of scheduledEmployees) {
      const entry = timeEntries.find((te: { employeeId: string }) => te.employeeId === emp.id);
      const schedule = emp.schedule[0];
      if (entry && entry.clockIn) {
        employeesWorking++;
        if (schedule && schedule.workShift && entry.clockIn) {
          const [h, m] = schedule.workShift.startTime.split(':').map(Number);
          if (typeof h === 'number' && typeof m === 'number') {
            const scheduledStart = new Date(dateString + `T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`);
            if (entry.clockIn > scheduledStart) {
              employeesLate++;
            }
          }
        }
      } else {
        employeesAbsent++;
      }
    }

    return {
      employeesWorking,
      employeesAbsent,
      employeesLate,
      employeesOnBreak,
      totalEmployees: scheduledEmployeeIds.length,
      isWorkDay: workDayInfo.isWorkDay,
      ...(workDayInfo.reason && { workDayReason: workDayInfo.reason }),
      employeesScheduled: scheduledEmployeeIds.length,
      ...(workDayInfo.specialDayType && { specialDayType: workDayInfo.specialDayType })
    };
  }

  /**
   * Obtiene el estado detallado de asistencia de cada empleado para una fecha
   */
  static async getEmployeeAttendanceStatus(
    companyId: string,
    date: Date = new Date()
  ): Promise<EmployeeAttendanceStatus[]> {
    const dateString = date.toISOString().split('T')[0];
    const scheduledEmployees = await this.getScheduledEmployees(companyId, date);
    const scheduledEmployeeIds = scheduledEmployees.map(e => e.id);

    // Obtener marcas de entrada/salida
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        companyId,
        date: {
          gte: new Date(dateString + 'T00:00:00Z'),
          lt: new Date(dateString + 'T23:59:59Z')
        },
        employeeId: { in: scheduledEmployeeIds }
      },
      select: {
        employeeId: true,
        clockIn: true,
        clockOut: true
      }
    });

    return scheduledEmployees.map(emp => {
      const entry = timeEntries.find((te: { employeeId: string }) => te.employeeId === emp.id);
      const schedule = emp.schedule[0];
      let isLate = false;
      let scheduledStart: string | null = null;
      let scheduledEnd: string | null = null;
      if (schedule && schedule.workShift) {
        scheduledStart = schedule.workShift.startTime;
        scheduledEnd = schedule.workShift.endTime;
        if (entry && entry.clockIn) {
          const [h, m] = schedule.workShift.startTime.split(':').map(Number);
          if (typeof h === 'number' && typeof m === 'number') {
            const scheduledStartDate = new Date(dateString + `T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`);
            if (entry.clockIn > scheduledStartDate) {
              isLate = true;
            }
          }
        }
      }
      if (!entry || !entry.clockIn) {
        return {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          status: 'absent',
          isLate: false,
          isOnBreak: false,
          scheduledStart,
          scheduledEnd
        };
      }
      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        status: isLate ? 'late' : 'working',
        clockIn: entry.clockIn,
        clockOut: entry.clockOut ?? undefined,
        isLate,
        isOnBreak: false,
        scheduledStart,
        scheduledEnd
      };
    });
  }

  /**
   * Obtiene estadísticas de empleados programados para trabajar hoy
   */
  static async getTodayScheduledStats(companyId: string): Promise<{
    totalScheduled: number;
    totalActive: number;
    isWorkDay: boolean;
    workDayReason?: string;
    specialDayType?: string;
  }> {
    const today = new Date();
    const workDayInfo = await this.isWorkDay(companyId, today);
    const scheduledEmployees = await this.getScheduledEmployees(companyId, today);
    const totalActive = await prisma.employee.count({
      where: {
        companyId,
        status: 'ACTIVE'
      }
    });
    return {
      totalScheduled: scheduledEmployees.length,
      totalActive,
      isWorkDay: workDayInfo.isWorkDay,
      ...(workDayInfo.reason && { workDayReason: workDayInfo.reason }),
      ...(workDayInfo.specialDayType && { specialDayType: workDayInfo.specialDayType })
    };
  }
} 