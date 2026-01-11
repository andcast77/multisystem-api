import { prisma } from '@/lib/prisma';
import { EmployeeStatus, Employee as PrismaEmployee } from '@prisma/client';
import type { EmployeeWithRelations } from '@/interfaces';

export interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  phone?: string | undefined;
  address?: string | undefined;
  positionId: string;
  departmentId: string; // Cambiado de department a departmentId
  birthDate?: string | undefined;
  dateJoined?: string | undefined;
  status?: EmployeeStatus | undefined;
}

export interface EmployeeFilters {
  search?: string | undefined;
  status?: EmployeeStatus | undefined;
  departmentId?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export type EmployeeListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
  departmentId: string | null;
  status: EmployeeStatus;
  dateJoined: Date | null;
  idNumber: string;
};

export class EmployeeService {
  /**
   * Crear un nuevo empleado
   */
  static async create(data: CreateEmployeeData, companyId: string): Promise<PrismaEmployee> {
    // Verificar duplicados
    const [existingEmail, existingIdNumber] = await Promise.all([
      prisma.employee.findFirst({ where: { email: data.email, companyId } }),
      prisma.employee.findFirst({ where: { idNumber: data.idNumber, companyId } }),
    ]);

    if (existingEmail) {
      throw new Error('Ya existe un empleado con este email en la empresa');
    }
    if (existingIdNumber) {
      throw new Error('Ya existe un empleado con este número de identificación');
    }

    if (!data.email || data.email.trim().length === 0) {
      throw new Error('Email es requerido');
    }
    if (!data.positionId || data.positionId.trim().length === 0) {
      throw new Error('Posición es requerida');
    }
    if (!data.departmentId || data.departmentId.trim().length === 0) {
      throw new Error('Departamento es requerido');
    }

    const employeeData = {
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      positionId: data.positionId,
      companyId: companyId,
      departmentId: data.departmentId || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      dateJoined: data.dateJoined ? new Date(data.dateJoined) : new Date(),
      status: data.status || 'ACTIVE'
    };
    return prisma.employee.create({ data: employeeData });
  }

  /**
   * Obtener empleado por ID con relaciones
   */
  static async getById(id: string, companyId: string): Promise<EmployeeWithRelations | null> {
    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        user: true,
        department: true,
      },
    });
    if (!employee) return null;
    return {
      ...employee,
      company: employee.company,
      user: employee.user,
    };
  }

  /**
   * Obtener lista de empleados con filtros y paginación
   */
  static async getList(filters: EmployeeFilters, companyId: string): Promise<{ employees: EmployeeWithRelations[]; pagination: { page: number; limit: number; total: number; totalPages: number }; stats: { total: number; active: number; inactive: number; suspended: number } }> {
    const { search, status, departmentId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    // Construir condiciones de búsqueda
    const where: Record<string, unknown> = { companyId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { idNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Ejecutar consultas en paralelo
    const [employees, total, stats] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          user: true,
          department: true,
        },
      }),
      prisma.employee.count({ where }),
      prisma.employee.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { status: true },
      }),
    ]);

    const employeesWithRelations: EmployeeWithRelations[] = employees.map(e => ({
      ...e,
      company: e.company,
      user: e.user,
    }));

    return {
      employees: employeesWithRelations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: stats.reduce((acc, stat) => acc + stat._count.status, 0),
        active: stats.find(s => s.status === 'ACTIVE')?._count.status || 0,
        inactive: stats.find(s => s.status === 'INACTIVE')?._count.status || 0,
        suspended: stats.find(s => s.status === 'SUSPENDED')?._count.status || 0,
      },
    };
  }

  /**
   * Actualizar empleado
   */
  static async update(id: string, data: Partial<CreateEmployeeData>, companyId: string): Promise<EmployeeWithRelations> {
    // Verificar que el empleado existe y pertenece a la empresa
    const existingEmployee = await prisma.employee.findFirst({
      where: { id, companyId },
    });

    if (!existingEmployee) {
      throw new Error('Empleado no encontrado');
    }

    // Verificar duplicados de email (excluyendo el empleado actual)
    if (data.email) {
      const duplicateEmail = await prisma.employee.findFirst({
        where: {
          email: data.email,
          companyId,
          id: { not: id },
        },
      });
      if (duplicateEmail) {
        throw new Error('El email ya está en uso por otro empleado');
      }
    }

    if (!data.email || data.email.trim().length === 0) {
      throw new Error('Email es requerido');
    }
    if (!data.positionId || data.positionId.trim().length === 0) {
      throw new Error('Posición es requerida');
    }
    if (!data.departmentId || data.departmentId.trim().length === 0) {
      throw new Error('Departamento es requerido');
    }

    // Preparar datos para actualización (solo claves válidas y tipos correctos)
    const updateData: Record<string, unknown> = {};
    if (typeof data.firstName === 'string') updateData.firstName = data.firstName.trim();
    if (typeof data.lastName === 'string') updateData.lastName = data.lastName.trim();
    if (typeof data.email === 'string') updateData.email = data.email.toLowerCase().trim();
    if (typeof data.idNumber === 'string') updateData.idNumber = data.idNumber.trim();
    if (typeof data.phone === 'string') updateData.phone = data.phone.trim();
    if (typeof data.address === 'string') updateData.address = data.address.trim();
    if (typeof data.positionId === 'string') updateData.positionId = data.positionId.trim();
    if (typeof data.departmentId === 'string') updateData.departmentId = data.departmentId.trim();
    if (typeof data.birthDate === 'string') updateData.birthDate = new Date(data.birthDate);
    if (typeof data.dateJoined === 'string') updateData.dateJoined = new Date(data.dateJoined);
    if (data.status) updateData.status = data.status;

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        user: true,
        department: true,
      },
    });
    return {
      ...updated,
      company: updated.company,
      user: updated.user,
    };
  }

  /**
   * Eliminar empleado
   */
  static async delete(id: string, companyId: string): Promise<void> {
    // Verificar que el empleado existe y pertenece a la empresa
    const existingEmployee = await prisma.employee.findFirst({
      where: { id, companyId },
    });

    if (!existingEmployee) {
      throw new Error('Empleado no encontrado');
    }

    // Verificar que no tenga registros de tiempo asociados
    const timeEntriesCount = await prisma.timeEntry.count({
      where: { employeeId: id },
    });

    if (timeEntriesCount > 0) {
      throw new Error('No se puede eliminar un empleado con registros de tiempo asociados');
    }

    await prisma.employee.delete({
      where: { id },
    });
  }

  /**
   * Importar empleados desde archivo
   */
  static async importFromFile(fileContent: string, companyId: string): Promise<{ success: number; errors: string[] }> {
    const lines = fileContent.split('\n').filter(line => line.trim());
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 1; i < lines.length; i++) { // Saltar header
      const line = lines[i];
      if (!line) continue;
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));

      try {
        if (columns.length < 6) {
          errors.push(`Línea ${i + 1}: Datos insuficientes`);
          continue;
        }

        const [firstName, lastName, email, position, departmentName, idNumber] = columns;

        // Validaciones básicas
        if (!firstName || !lastName || !email || !position || !departmentName || !idNumber) {
          errors.push(`Línea ${i + 1}: Campos requeridos faltantes`);
          continue;
        }

        // Buscar departamento por nombre
        const department = await prisma.department.findFirst({ where: { name: departmentName, companyId } });
        if (!department) {
          errors.push(`Línea ${i + 1}: Departamento no encontrado`);
          continue;
        }

        // Verificar duplicados
        const [existingEmail, existingIdNumber] = await Promise.all([
          prisma.employee.findFirst({ where: { email, companyId } }),
          prisma.employee.findFirst({ where: { idNumber, companyId } }),
        ]);

        if (existingEmail) {
          errors.push(`Línea ${i + 1}: Email ya existe`);
          continue;
        }
        if (existingIdNumber) {
          errors.push(`Línea ${i + 1}: Número de identificación ya existe`);
          continue;
        }

        // Crear empleado
        await prisma.employee.create({
          data: {
            firstName,
            lastName,
            email,
            positionId: position,
            departmentId: department.id,
            idNumber,
            companyId: companyId,
            status: 'ACTIVE',
            dateJoined: new Date(),
          },
        });

        successCount++;
      } catch (error) {
        errors.push(`Línea ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return { success: successCount, errors };
  }

  /**
   * Obtener estadísticas de asistencia del empleado
   */
  static async getAttendanceStats(employeeId: string, companyId: string) {
    // Verificar que el empleado existe y pertenece a la empresa
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId }
    });

    if (!employee) {
      throw new Error('Empleado no encontrado');
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: { 
        employeeId,
        employee: { companyId }
      },
      orderBy: { date: 'desc' },
      take: 30
    });

    return {
      totalEntries: timeEntries.length,
      recentEntries: timeEntries.slice(0, 10),
      averageHours: 0 // No se puede calcular sin campo hoursWorked
    };
  }

  /**
   * Obtener horarios del empleado
   */
  static async getSchedules(employeeId: string, companyId: string) {
    // Verificar que el empleado existe y pertenece a la empresa
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId }
    });

    if (!employee) {
      throw new Error('Empleado no encontrado');
    }

    return prisma.schedule.findMany({
      where: { employeeId },
      include: { workShift: true },
      orderBy: { dayOfWeek: 'asc' }
    });
  }

  /**
   * Actualizar horario del empleado
   */
  static async updateSchedule(employeeId: string, dayOfWeek: number, data: { isWorkDay: boolean; workShiftId?: string }, companyId: string) {
    // Verificar que el empleado existe y pertenece a la empresa
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId }
    });

    if (!employee) {
      throw new Error('Empleado no encontrado');
    }

    // Verificar que el turno de trabajo existe y pertenece a la empresa
    if (data.workShiftId) {
      const workShift = await prisma.workShift.findFirst({
        where: { id: data.workShiftId, companyId }
      });
      if (!workShift) {
        throw new Error('Turno de trabajo no encontrado');
      }
    }

    return prisma.schedule.upsert({
      where: {
        employeeId_dayOfWeek: { employeeId, dayOfWeek }
      },
      update: {
        isWorkDay: data.isWorkDay,
        workShiftId: data.isWorkDay ? data.workShiftId || null : null
      },
      create: {
        companyId,
        employeeId,
        dayOfWeek,
        isWorkDay: data.isWorkDay,
        workShiftId: data.isWorkDay ? data.workShiftId || null : null
      },
      include: { workShift: true }
    });
  }
} 