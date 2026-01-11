import { prisma } from '@/lib/prisma';
import { Holidays, Company } from '@prisma/client';

export interface HolidayWithRelations extends Holidays {
  company: Company;
}

export interface CreateHolidayData {
  name: string;
  date: string;
  description?: string | undefined;
  isRecurring?: boolean;
}

export interface HolidayFilters {
  year?: number | undefined;
  isRecurring?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class HolidayService {
  /**
   * Crear un nuevo día festivo
   */
  static async create(data: CreateHolidayData, companyId: string): Promise<Holidays> {
    // Verificar que el nombre no esté duplicado en la empresa para la misma fecha
    const existingHoliday = await prisma.holidays.findFirst({
      where: { 
        name: data.name, 
        date: new Date(data.date),
        companyId 
      }
    });

    if (existingHoliday) {
      throw new Error('Ya existe un día festivo con este nombre para esta fecha');
    }

    // Validar que la fecha sea válida
    const holidayDate = new Date(data.date);
    if (isNaN(holidayDate.getTime())) {
      throw new Error('Fecha inválida');
    }

    return prisma.holidays.create({
      data: {
        name: data.name,
        date: holidayDate,
        description: data.description || null,
        isRecurring: data.isRecurring ?? false,
        companyId,
      }
    });
  }

  /**
   * Obtener día festivo por ID
   */
  static async getById(id: string, companyId: string): Promise<Holidays | null> {
    return prisma.holidays.findFirst({
      where: { 
        id,
        companyId
      }
    });
  }

  /**
   * Obtener lista de días festivos con filtros
   */
  static async getList(filters: HolidayFilters, companyId: string) {
    const { year, isRecurring, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    // Construir condiciones de búsqueda
    const where: Record<string, unknown> = { companyId };
    
    if (year) {
      where.date = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      };
    }
    if (isRecurring !== undefined) where.isRecurring = isRecurring;

    // Ejecutar consultas en paralelo
    const [holidays, total] = await Promise.all([
      prisma.holidays.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' }
      }),
      prisma.holidays.count({ where })
    ]);

    return {
      holidays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: holidays.length,
        // Si necesitas más estadísticas, agrégalas aquí
      }
    };
  }

  /**
   * Actualizar día festivo
   */
  static async update(id: string, data: Partial<CreateHolidayData>, companyId: string): Promise<Holidays> {
    // Verificar que el día festivo existe y pertenece a la empresa
    const existingHoliday = await prisma.holidays.findFirst({
      where: { 
        id,
        companyId
      }
    });

    if (!existingHoliday) {
      throw new Error('Día festivo no encontrado');
    }

    // Verificar duplicados de nombre si se está cambiando
    if (data.name && data.name !== existingHoliday.name) {
      const duplicateHoliday = await prisma.holidays.findFirst({
        where: {
          name: data.name,
          companyId,
          id: { not: id }
        }
      });
      if (duplicateHoliday) {
        throw new Error('Ya existe un día festivo con este nombre');
      }
    }

    // Validar fecha si se está cambiando
    if (data.date) {
      const holidayDate = new Date(data.date);
      if (isNaN(holidayDate.getTime())) {
        throw new Error('Fecha inválida');
      }
    }

    // Preparar datos para actualización (solo claves válidas y tipos correctos)
    return prisma.holidays.update({
      where: { id },
      data: {
        ...(typeof data.name === 'string' ? { name: data.name.trim() } : {}),
        ...(typeof data.date === 'string' ? { date: data.date } : {}),
        ...(typeof data.description === 'string' ? { description: data.description.trim() } : {}),
        ...(typeof data.isRecurring === 'boolean' ? { isRecurring: data.isRecurring } : {})
      }
    });
  }

  /**
   * Eliminar día festivo
   */
  static async delete(id: string, companyId: string): Promise<void> {
    // Verificar que el día festivo existe y pertenece a la empresa
    const existingHoliday = await prisma.holidays.findFirst({
      where: { 
        id,
        companyId
      }
    });

    if (!existingHoliday) {
      throw new Error('Día festivo no encontrado');
    }

    // Verificar que no tenga asignaciones especiales asociadas
    // if (existingHoliday._count.specialAssignments > 0) { // This line is removed as per the edit hint
    //   throw new Error('No se puede eliminar un día festivo que tiene asignaciones especiales asociadas');
    // }

    await prisma.holidays.delete({
      where: { id }
    });
  }

  /**
   * Obtener días festivos para un año específico
   */
  static async getHolidaysByYear(year: number, companyId: string): Promise<Holidays[]> {
    return prisma.holidays.findMany({
      where: {
        companyId,
        date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      },
      orderBy: { date: 'asc' }
    });
  }

  /**
   * Obtener días festivos para un rango de fechas
   */
  static async getHolidaysByDateRange(startDate: string, endDate: string, companyId: string): Promise<Holidays[]> {
    return prisma.holidays.findMany({
      where: {
        companyId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: { date: 'asc' }
    });
  }

  /**
   * Verificar si una fecha es festiva
   */
  static async isHoliday(date: string, companyId: string): Promise<Holidays | null> {
    return prisma.holidays.findFirst({
      where: {
        companyId,
        date: new Date(date)
      }
    });
  }

  /**
   * Obtener próximos días festivos
   */
  static async getUpcomingHolidays(companyId: string, limit: number = 5): Promise<Holidays[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.holidays.findMany({
      where: {
        companyId,
        date: {
          gte: today
        }
      },
      orderBy: { date: 'asc' },
      take: limit
    });
  }

  /**
   * Generar días festivos recurrentes para un año
   */
  static async generateRecurringHolidays(year: number, companyId: string): Promise<Holidays[]> {
    const recurringHolidays = await prisma.holidays.findMany({
      where: {
        companyId,
        isRecurring: true
      }
    });

    const generatedHolidays: Holidays[] = [];

    for (const holiday of recurringHolidays) {
      const originalDate = new Date(holiday.date);
      const newDate = new Date(year, originalDate.getMonth(), originalDate.getDate());

      // Verificar si ya existe para este año
      const existingHoliday = await prisma.holidays.findFirst({
        where: {
          companyId,
          date: newDate,
          name: holiday.name
        }
      });

      if (!existingHoliday) {
        const newHoliday = await prisma.holidays.create({
          data: {
            name: holiday.name,
            date: newDate,
            description: holiday.description,
            isRecurring: true,
            companyId
          }
        });
        generatedHolidays.push(newHoliday);
      }
    }

    return generatedHolidays;
  }
} 