import { prisma } from '@/lib/prisma';
import { WorkShift } from '@prisma/client';

export interface CreateWorkShiftData {
  name: string;
  startTime: string;
  endTime: string;
  description?: string | null; // Permitir null
  isActive?: boolean;
  breakDuration?: number;
  isNightShift?: boolean;
}

export interface WorkShiftFilters {
  isActive?: boolean | undefined;
  isNightShift?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface WorkShiftWithRelations extends WorkShift {
  _count: {
    employees: number;
  };
}

export class WorkShiftService {
  /**
   * Crear un nuevo turno de trabajo
   */
  static async create(data: CreateWorkShiftData, companyId: string): Promise<WorkShiftWithRelations> {
    // Verificar que el nombre no esté duplicado en la empresa
    const existingWorkShift = await prisma.workShift.findFirst({
      where: { 
        name: data.name, 
        companyId 
      }
    });

    if (existingWorkShift) {
      throw new Error('Ya existe un turno con este nombre');
    }

    // Validar que los horarios sean válidos
    const startTime = this.parseTime(data.startTime);
    const endTime = this.parseTime(data.endTime);
    
    if (!startTime || !endTime) {
      throw new Error('Formato de hora inválido. Use HH:MM');
    }

    // Validar que el horario de fin sea posterior al de inicio
    if (startTime >= endTime && !data.isNightShift) {
      throw new Error('El horario de fin debe ser posterior al de inicio');
    }

    const workShift = await prisma.workShift.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description || null,
        isActive: data.isActive ?? true,
        isNightShift: data.isNightShift ?? false,
        companyId,
      }
    });
    // Contar empleados únicos asociados a este turno por Schedule
    const scheduleRecords = await prisma.schedule.findMany({
      where: { workShiftId: workShift.id },
      select: { employeeId: true }
    });
    const employeesCount = new Set(scheduleRecords.map(r => r.employeeId)).size;
    return { ...workShift, _count: { employees: employeesCount } };
  }

  /**
   * Obtener turno por ID
   */
  static async getById(id: string, companyId: string): Promise<WorkShiftWithRelations | null> {
    const workShift = await prisma.workShift.findFirst({
      where: { id, companyId }
    });
    if (!workShift) return null;
    const scheduleRecords = await prisma.schedule.findMany({
      where: { workShiftId: workShift.id },
      select: { employeeId: true }
    });
    const employeesCount = new Set(scheduleRecords.map(r => r.employeeId)).size;
    return { ...workShift, _count: { employees: employeesCount } };
  }

  /**
   * Obtener lista de turnos con filtros
   */
  static async getList(filters: WorkShiftFilters, companyId: string) {
    const { isActive, isNightShift, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { companyId };
    if (isActive !== undefined) where.isActive = isActive;
    if (isNightShift !== undefined) where.isNightShift = isNightShift;
    const [workShifts, total] = await Promise.all([
      prisma.workShift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.workShift.count({ where })
    ]);
    // Para cada turno, contar empleados únicos asociados por Schedule
    const workShiftsWithCount: WorkShiftWithRelations[] = await Promise.all(
      workShifts.map(async ws => {
        const scheduleRecords = await prisma.schedule.findMany({
          where: { workShiftId: ws.id },
          select: { employeeId: true }
        });
        const employeesCount = new Set(scheduleRecords.map(r => r.employeeId)).size;
        return { ...ws, _count: { employees: employeesCount } };
      })
    );
    return {
      workShifts: workShiftsWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: workShiftsWithCount.length,
        active: workShiftsWithCount.filter(ws => ws.isActive).length,
        inactive: workShiftsWithCount.filter(ws => !ws.isActive).length,
        dayShifts: workShiftsWithCount.filter(ws => ws.isActive && !ws.isNightShift).length,
        nightShifts: workShiftsWithCount.filter(ws => ws.isActive && ws.isNightShift).length
      }
    };
  }

  /**
   * Actualizar turno
   */
  static async update(id: string, data: Partial<CreateWorkShiftData>, companyId: string): Promise<WorkShiftWithRelations> {
    // Verificar que el turno existe y pertenece a la empresa
    const existingWorkShift = await prisma.workShift.findFirst({
      where: { 
        id,
        companyId
      }
    });

    if (!existingWorkShift) {
      throw new Error('Turno no encontrado');
    }

    // Verificar duplicados de nombre si se está cambiando
    if (data.name && data.name !== existingWorkShift.name) {
      const duplicateWorkShift = await prisma.workShift.findFirst({
        where: {
          name: data.name,
          companyId,
          id: { not: id }
        }
      });
      if (duplicateWorkShift) {
        throw new Error('Ya existe un turno con este nombre');
      }
    }

    // Validar horarios si se están cambiando
    if (data.startTime || data.endTime) {
      const startTime = data.startTime ? this.parseTime(data.startTime) : this.parseTime(existingWorkShift.startTime);
      const endTime = data.endTime ? this.parseTime(data.endTime) : this.parseTime(existingWorkShift.endTime);
      
      if (!startTime || !endTime) {
        throw new Error('Formato de hora inválido. Use HH:MM');
      }

      const isNightShift = data.isNightShift !== undefined ? data.isNightShift : existingWorkShift.isNightShift;
      
      if (startTime >= endTime && !isNightShift) {
        throw new Error('El horario de fin debe ser posterior al de inicio');
      }
    }

    // Preparar datos para actualización (solo claves válidas y tipos correctos)
    const updateData: Partial<Omit<CreateWorkShiftData, 'breakDuration'>> & { description: string | null } = { description: null };
    if (typeof data.name === 'string') updateData.name = data.name.trim();
    if (typeof data.startTime === 'string') updateData.startTime = data.startTime;
    if (typeof data.endTime === 'string') updateData.endTime = data.endTime;
    if (typeof data.description === 'string') updateData.description = data.description.trim();
    else if (data.description === null) updateData.description = null;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
    if (typeof data.isNightShift === 'boolean') updateData.isNightShift = data.isNightShift;

    const workShift = await prisma.workShift.update({
      where: { id },
      data: updateData
    });
    const scheduleRecords = await prisma.schedule.findMany({
      where: { workShiftId: workShift.id },
      select: { employeeId: true }
    });
    const employeesCount = new Set(scheduleRecords.map(r => r.employeeId)).size;
    return { ...workShift, _count: { employees: employeesCount } };
  }

  /**
   * Eliminar turno
   */
  static async delete(id: string, companyId: string): Promise<void> {
    const existingWorkShift = await prisma.workShift.findFirst({
      where: { id, companyId }
    });

    if (!existingWorkShift) {
      throw new Error('Turno no encontrado');
    }

    const scheduleRecords = await prisma.schedule.findMany({
      where: { workShiftId: existingWorkShift.id },
      select: { employeeId: true }
    });
    const employeesCount = new Set(scheduleRecords.map(r => r.employeeId)).size;
    if (employeesCount > 0) {
      throw new Error('No se puede eliminar un turno que tiene empleados asignados');
    }

    await prisma.workShift.delete({
      where: { id }
    });
  }

  /**
   * Obtener turnos activos
   */
  static async getActiveWorkShifts(companyId: string): Promise<WorkShift[]> {
    return prisma.workShift.findMany({
      where: {
        companyId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Obtener turnos por tipo (día/noche)
   */
  static async getWorkShiftsByType(isNightShift: boolean, companyId: string): Promise<WorkShift[]> {
    return prisma.workShift.findMany({
      where: {
        companyId,
        isActive: true,
        isNightShift
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Verificar si un horario está dentro de un turno
   */
  static async isTimeInWorkShift(time: string, workShiftId: string, companyId: string): Promise<boolean> {
    const workShift = await prisma.workShift.findFirst({
      where: {
        id: workShiftId,
        companyId
      }
    });

    if (!workShift) {
      return false;
    }

    const checkTime = this.parseTime(time);
    const startTime = this.parseTime(workShift.startTime);
    const endTime = this.parseTime(workShift.endTime);

    if (!checkTime || !startTime || !endTime) {
      return false;
    }

    if (workShift.isNightShift) {
      // Para turnos nocturnos, el horario puede cruzar la medianoche
      return checkTime >= startTime || checkTime <= endTime;
    } else {
      // Para turnos diurnos, el horario debe estar entre inicio y fin
      return checkTime >= startTime && checkTime <= endTime;
    }
  }

  /**
   * Calcular duración del turno en minutos
   */
  static calculateShiftDuration(startTime: string, endTime: string, isNightShift: boolean): number {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);

    if (!start || !end) {
      return 0;
    }

    let duration = end - start;

    if (isNightShift && end < start) {
      // Para turnos nocturnos que cruzan la medianoche
      duration = (24 * 60 - start) + end;
    }

    return duration;
  }

  /**
   * Obtener estadísticas de uso de turnos
   */
  static async getWorkShiftStats(companyId: string) {
    const workShifts = await prisma.workShift.findMany({
      where: { companyId }
    });
    // Para cada turno, contar empleados únicos asociados por Schedule
    const workShiftsWithCount: (WorkShift & { employeesCount: number })[] = await Promise.all(
      workShifts.map(async ws => {
        const scheduleRecords = await prisma.schedule.findMany({
          where: { workShiftId: ws.id },
          select: { employeeId: true }
        });
        const employeesCount = new Set(scheduleRecords.map(r => r.employeeId)).size;
        return { ...ws, employeesCount };
      })
    );
    return {
      totalWorkShifts: workShiftsWithCount.length,
      activeWorkShifts: workShiftsWithCount.filter(ws => ws.isActive).length,
      totalEmployees: workShiftsWithCount.reduce((acc, ws) => acc + ws.employeesCount, 0),
      averageEmployeesPerShift: workShiftsWithCount.length > 0 ? workShiftsWithCount.reduce((acc, ws) => acc + ws.employeesCount, 0) / workShiftsWithCount.length : 0,
      mostUsedShift: workShiftsWithCount.length > 0 ? workShiftsWithCount.reduce((max, ws) => (max && ws.employeesCount > max.employeesCount ? ws : max), workShiftsWithCount[0]) : null
    };
  }

  /**
   * Función auxiliar para parsear tiempo
   */
  private static parseTime(timeString: string): number | null {
    if (typeof timeString !== 'string') return null;
    const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (!match || typeof match[1] !== 'string' || typeof match[2] !== 'string') return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    return hours * 60 + minutes;
  }
} 