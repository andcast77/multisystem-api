import { prisma } from '@/lib/prisma';
import { TimeEntry } from '@prisma/client';

export interface CreateTimeEntryData {
  employeeId: string;
  date: string;
  clockIn?: string | undefined;
  clockOut?: string | undefined;
}

export interface TimeEntryFilters {
  employeeId?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface TimeEntryWithRelations extends TimeEntry {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    department: string | null;
  };
}

export class TimeEntryService {
  static async create(data: CreateTimeEntryData, companyId: string): Promise<TimeEntry> {
    const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) {
      throw new Error('Empleado no encontrado');
    }
    const existingEntry = await prisma.timeEntry.findFirst({
      where: { employeeId: data.employeeId, date: new Date(data.date) }
    });
    if (existingEntry) {
      throw new Error('Ya existe una entrada de tiempo para esta fecha');
    }
    return prisma.timeEntry.create({
      data: {
        employeeId: data.employeeId,
        companyId,
        date: new Date(data.date),
        clockIn: data.clockIn ? new Date(data.clockIn) : null,
        clockOut: data.clockOut ? new Date(data.clockOut) : null
      },
    });
  }

  static async getById(id: string, companyId: string): Promise<TimeEntryWithRelations | null> {
    const entry = await prisma.timeEntry.findFirst({
      where: { id, employee: { companyId } },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } }
          },
        },
      },
    });
    if (!entry) return null;
    return {
      ...entry,
      employee: {
        ...entry.employee,
        department: entry.employee.department?.name || null
      }
    };
  }

  static async getList(filters: TimeEntryFilters, companyId: string) {
    const { employeeId, startDate, endDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { employee: { companyId } };
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }
    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: { select: { name: true } }
            },
          },
        },
      }),
      prisma.timeEntry.count({ where })
    ]);
    const entriesWithRelations: TimeEntryWithRelations[] = timeEntries.map(e => ({
      ...e,
      employee: {
        ...e.employee,
        department: e.employee.department?.name || null
      }
    }));
    return {
      timeEntries: entriesWithRelations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: entriesWithRelations.length
      }
    };
  }

  static async update(id: string, data: Partial<CreateTimeEntryData>, companyId: string): Promise<TimeEntryWithRelations> {
    const existingEntry = await prisma.timeEntry.findFirst({ where: { id, employee: { companyId } } });
    if (!existingEntry) {
      throw new Error('Entrada de tiempo no encontrada');
    }
    if (data.date && data.date !== existingEntry.date.toISOString().split('T')[0]) {
      const duplicateEntry = await prisma.timeEntry.findFirst({
        where: {
          employeeId: existingEntry.employeeId,
          date: new Date(data.date),
          id: { not: id }
        }
      });
      if (duplicateEntry) {
        throw new Error('Ya existe una entrada de tiempo para esta fecha');
      }
    }
    const updateData: { date?: Date; clockIn?: Date | null; clockOut?: Date | null } = {};
    if (typeof data.date === 'string') updateData.date = new Date(data.date);
    if (typeof data.clockIn === 'string') updateData.clockIn = new Date(data.clockIn);
    if (typeof data.clockOut === 'string') updateData.clockOut = new Date(data.clockOut);
    const entry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } }
          },
        },
      },
    });
    if (!entry.employee) return entry as TimeEntryWithRelations;
    return {
      ...entry,
      employee: {
        ...entry.employee,
        department: entry.employee.department?.name || null
      }
    };
  }

  static async delete(id: string, companyId: string): Promise<void> {
    const existingEntry = await prisma.timeEntry.findFirst({ where: { id, employee: { companyId } } });
    if (!existingEntry) {
      throw new Error('Entrada de tiempo no encontrada');
    }
    await prisma.timeEntry.delete({ where: { id } });
  }

  static async importFromFile(fileContent: string, companyId: string): Promise<{ success: number; errors: string[] }> {
    const lines = fileContent.split('\n').filter(line => line.trim());
    const errors: string[] = [];
    let successCount = 0;
    for (let i = 1; i < lines.length; i++) { // Saltar header
      const line = lines[i];
      if (!line) continue;
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      try {
        if (columns.length < 4) {
          errors.push(`Línea ${i + 1}: Datos insuficientes`);
          continue;
        }
        const [employeeEmail, date, clockIn, clockOut] = columns;
        if (!employeeEmail || !date || !clockIn) {
          errors.push(`Línea ${i + 1}: Campos requeridos faltantes`);
          continue;
        }
        const employee = await prisma.employee.findFirst({ where: { email: employeeEmail, companyId } });
        if (!employee) {
          errors.push(`Línea ${i + 1}: Empleado no encontrado`);
          continue;
        }
        const existingEntry = await prisma.timeEntry.findFirst({ where: { employeeId: employee.id, date: new Date(date) } });
        if (existingEntry) {
          errors.push(`Línea ${i + 1}: Ya existe entrada para esta fecha`);
          continue;
        }
        await prisma.timeEntry.create({
          data: {
            employeeId: employee.id,
            companyId,
            date: new Date(date),
            clockIn: new Date(`${date}T${clockIn}`),
            clockOut: clockOut ? new Date(`${date}T${clockOut}`) : null
          },
        });
        successCount++;
      } catch (error) {
        errors.push(`Línea ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
    return { success: successCount, errors };
  }

  static async getEmployeeStats(employeeId: string, companyId: string, startDate?: string, endDate?: string) {
    const where: Record<string, unknown> = {
      employeeId,
      employee: { companyId }
    };
    if (startDate || endDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }
    const entryCount = await prisma.timeEntry.count({ where });
    return {
      entryCount
    };
  }
} 