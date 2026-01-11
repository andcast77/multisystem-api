import { prisma } from '@/lib/prisma';
import { AttendanceService } from './attendance.service';

import { HolidayService } from './holiday.service';
import { WorkShiftService } from './workShift.service';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  suspendedEmployees: number;
  totalRoles: number;
  totalDepartments: number;
  todayScheduled: number;
  todayActive: number;
  isWorkDay: boolean;
  workDayReason: string;
  totalHolidays: number;
  activeWorkShifts: number;
  totalTimeEntries: number;
}

export interface DepartmentStats {
  name: string;
  count: number;
}

export interface RecentActivity {
  id: string;
  name: string;
  position: string;
  department: string | null;
  dateJoined: Date | null;
  createdAt: Date;
  type: string;
  message: string;
}

export interface DashboardData {
  stats: DashboardStats;
  departmentStats: DepartmentStats[];
  recentActivity: RecentActivity[];
  company: {
    name: string;
  };
}

export class DashboardService {
  /**
   * Obtener estadísticas completas del dashboard
   */
  static async getDashboardStats(companyId: string): Promise<DashboardData> {
    // Ejecutar todas las consultas en paralelo para optimizar rendimiento
    const [
      todayStats,
      employeeStats,
      roleStats,
      departmentStats,
      recentEmployees,
      company,
      holidayStats,
      workShiftStats,
      timeEntryStats
    ] = await Promise.all([
      // Estadísticas de asistencia del día
      AttendanceService.getTodayScheduledStats(companyId),
      
      // Estadísticas de empleados
      this.getEmployeeStats(companyId),
      
      // Estadísticas de roles
      prisma.role.count({ where: { companyId } }),
      
      // Estadísticas de departamentos
      this.getDepartmentStats(companyId),
      
      // Empleados recientes
      this.getRecentEmployees(companyId),
      
      // Información de la empresa
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true }
      }),
      
      // Estadísticas de días festivos
      this.getHolidayStats(companyId),
      
      // Estadísticas de turnos
      this.getWorkShiftStats(companyId),
      
      // Estadísticas de entradas de tiempo
      this.getTimeEntryStats(companyId)
    ]);

    // Procesar actividad reciente
    const recentActivity = this.processRecentActivity(recentEmployees);

    // Construir estadísticas completas
    const stats: DashboardStats = {
      ...employeeStats,
      totalRoles: roleStats,
      totalDepartments: departmentStats.length,
      todayScheduled: todayStats.totalScheduled,
      todayActive: todayStats.totalActive,
      isWorkDay: todayStats.isWorkDay,
      workDayReason: todayStats.workDayReason || '',
      totalHolidays: holidayStats.total,
      activeWorkShifts: workShiftStats.active,
      totalTimeEntries: timeEntryStats.total
    };

    return {
      stats,
      departmentStats,
      recentActivity,
      company: {
        name: company?.name || 'Empresa'
      }
    };
  }

  /**
   * Obtener estadísticas de empleados
   */
  private static async getEmployeeStats(companyId: string) {
    const [total, active, inactive, suspended] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.employee.count({ where: { companyId, status: 'INACTIVE' } }),
      prisma.employee.count({ where: { companyId, status: 'SUSPENDED' } })
    ]);

    return {
      totalEmployees: total,
      activeEmployees: active,
      inactiveEmployees: inactive,
      suspendedEmployees: suspended
    };
  }

  /**
   * Obtener estadísticas de departamentos
   */
  private static async getDepartmentStats(companyId: string): Promise<DepartmentStats[]> {
    const departments = await prisma.employee.groupBy({
      by: ['departmentId'],
      where: { companyId, departmentId: { not: null } },
      _count: { departmentId: true }
    });
    // Obtener nombres de departamentos
    const departmentIds = departments.map(d => d.departmentId).filter((id): id is string => !!id);
    const departmentNames = await prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true }
    });
    return departments.map(dept => ({
      name: departmentNames.find(d => d.id === dept.departmentId)?.name || '',
      count: dept._count?.departmentId || 0
    }));
  }

  /**
   * Obtener empleados recientes
   */
  private static async getRecentEmployees(companyId: string) {
    const employees = await prisma.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        dateJoined: true,
        createdAt: true,
        department: { select: { name: true } }
      }
    });
    // Mapea department y position a string
    return employees.map(e => ({
      ...e,
      department: e.department ? e.department.name : null,
      position: e.position ? e.position.name : null
    }));
  }

  /**
   * Obtener estadísticas de días festivos
   */
  private static async getHolidayStats(companyId: string) {
    const holidays = await HolidayService.getList({}, companyId);
    return {
      total: holidays.stats.total
    };
  }

  /**
   * Obtener estadísticas de turnos
   */
  private static async getWorkShiftStats(companyId: string) {
    const workShifts = await WorkShiftService.getList({}, companyId);
    return {
      total: workShifts.stats.total,
      active: workShifts.stats.active,
      dayShifts: workShifts.stats.dayShifts,
      nightShifts: workShifts.stats.nightShifts
    };
  }

  /**
   * Obtener estadísticas de entradas de tiempo
   */
  private static async getTimeEntryStats(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, todayEntries, thisWeekEntries, thisMonthEntries] = await Promise.all([
      prisma.timeEntry.count({ where: { companyId } }),
      prisma.timeEntry.count({
        where: {
          companyId,
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      prisma.timeEntry.count({
        where: {
          companyId,
          date: {
            gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.timeEntry.count({
        where: {
          companyId,
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1)
          }
        }
      })
    ]);

    return {
      total,
      today: todayEntries,
      thisWeek: thisWeekEntries,
      thisMonth: thisMonthEntries
    };
  }

  /**
   * Procesar actividad reciente
   */
  private static processRecentActivity(employees: Array<{ id: string; firstName: string; lastName: string; position: string | null; department: string | null; dateJoined: Date | null; createdAt: Date }>): RecentActivity[] {
    return employees.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      position: emp.position || '',
      department: emp.department,
      dateJoined: emp.dateJoined,
      createdAt: emp.createdAt,
      type: 'new_employee',
      message: `Se unió como ${emp.position || ''}`
    }));
  }

  /**
   * Obtener estadísticas de rendimiento
   */
  static async getPerformanceStats(companyId: string, period: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    const [timeEntries, employees] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          companyId,
          date: { gte: startDate }
        },
        select: {
          date: true
        }
      }),
      prisma.employee.count({
        where: {
          companyId,
          status: 'ACTIVE'
        }
      })
    ]);

    // No se puede calcular totalHours ni averageHoursPerEmployee sin hoursWorked
    return {
      totalHours: 0,
      averageHoursPerEmployee: 0,
      totalEntries: timeEntries.length,
      activeEmployees: employees,
      period
    };
  }

  /**
   * Obtener alertas del dashboard
   */
  static async getDashboardAlerts(companyId: string) {
    const alerts = [];

    // Verificar empleados sin departamento asignado
    const employeesWithoutDepartment = await prisma.employee.count({
      where: {
        companyId,
        status: 'ACTIVE',
        departmentId: null
      }
    });

    if (employeesWithoutDepartment > 0) {
      alerts.push({
        type: 'warning',
        message: `${employeesWithoutDepartment} empleado(s) sin departamento asignado`,
        action: 'assign_departments'
      });
    }

    // Verificar días festivos próximos
    const upcomingHolidays = await HolidayService.getUpcomingHolidays(companyId, 3);
    if (upcomingHolidays.length > 0) {
      alerts.push({
        type: 'info',
        message: `${upcomingHolidays.length} día(s) festivo(s) próximo(s)`,
        action: 'view_holidays',
        data: upcomingHolidays
      });
    }

    // Verificar turnos inactivos
    const inactiveShifts = await prisma.workShift.count({
      where: {
        companyId,
        isActive: false
      }
    });

    if (inactiveShifts > 0) {
      alerts.push({
        type: 'warning',
        message: `${inactiveShifts} turno(s) inactivo(s)`,
        action: 'manage_shifts'
      });
    }

    return alerts;
  }
} 