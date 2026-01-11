import { prisma } from '@/lib/prisma';
import { SpecialDayAssignment } from '@prisma/client';

export interface CreateSpecialAssignmentData {
  employeeId: string;
  date: string;
  type: string;
  isMandatory?: boolean;
}

export interface SpecialAssignmentFilters {
  employeeId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SpecialAssignmentWithRelations extends SpecialDayAssignment {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    department: string | null;
  };
}

export class SpecialAssignmentService {
  static async create(data: CreateSpecialAssignmentData, companyId: string): Promise<SpecialAssignmentWithRelations> {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, companyId },
      include: { department: true }
    });
    if (!employee) {
      throw new Error('Empleado no encontrado');
    }
    const assignmentDate = new Date(data.date);
    if (isNaN(assignmentDate.getTime())) {
      throw new Error('Fecha inválida');
    }
    const duplicateAssignment = await prisma.specialDayAssignment.findFirst({
      where: { employeeId: data.employeeId, date: assignmentDate, companyId }
    });
    if (duplicateAssignment) {
      throw new Error('Ya existe una asignación para este empleado en la fecha seleccionada');
    }
    const assignment = await prisma.specialDayAssignment.create({
      data: {
        employeeId: data.employeeId,
        date: assignmentDate,
        type: data.type,
        isMandatory: data.isMandatory ?? true,
        companyId
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: { select: { name: true } },
            department: { select: { name: true } }
          }
        }
      }
    });
    return {
      ...assignment,
      employee: {
        ...assignment.employee,
        position: assignment.employee.position?.name || null,
        department: assignment.employee.department?.name || null
      }
    };
  }

  static async getById(id: string, companyId: string): Promise<SpecialAssignmentWithRelations | null> {
    const assignment = await prisma.specialDayAssignment.findFirst({
      where: { id, companyId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: { select: { name: true } },
            department: { select: { name: true } }
          }
        }
      }
    });
    if (!assignment) return null;
    return {
      ...assignment,
      employee: {
        ...assignment.employee,
        position: assignment.employee.position?.name || null,
        department: assignment.employee.department?.name || null
      }
    };
  }

  static async getList(filters: SpecialAssignmentFilters, companyId: string) {
    const { employeeId, type, startDate, endDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { companyId };
    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    const [assignments, total] = await Promise.all([
      prisma.specialDayAssignment.findMany({
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
              position: { select: { name: true } },
              department: { select: { name: true } }
            }
          }
        }
      }),
      prisma.specialDayAssignment.count({ where })
    ]);
    const assignmentsWithRelations: SpecialAssignmentWithRelations[] = assignments.map(a => ({
      ...a,
      employee: {
        ...a.employee,
        position: a.employee.position?.name || null,
        department: a.employee.department?.name || null
      }
    }));
    return {
      assignments: assignmentsWithRelations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async update(id: string, data: Partial<CreateSpecialAssignmentData>, companyId: string): Promise<SpecialAssignmentWithRelations> {
    const existingAssignment = await prisma.specialDayAssignment.findFirst({ where: { id, companyId } });
    if (!existingAssignment) {
      throw new Error('Asignación especial no encontrada');
    }
    if (data.employeeId && data.employeeId !== existingAssignment.employeeId) {
      const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId } });
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }
    }
    if (data.date) {
      const assignmentDate = new Date(data.date);
      if (isNaN(assignmentDate.getTime())) {
        throw new Error('Fecha inválida');
      }
    }
    const updateData: Partial<CreateSpecialAssignmentData> = {};
    if (typeof data.employeeId === 'string') updateData.employeeId = data.employeeId;
    if (typeof data.date === 'string') updateData.date = data.date;
    if (typeof data.type === 'string') updateData.type = data.type;
    if (typeof data.isMandatory === 'boolean') updateData.isMandatory = data.isMandatory;
    const assignment = await prisma.specialDayAssignment.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: { select: { name: true } },
            department: { select: { name: true } }
          }
        }
      }
    });
    return {
      ...assignment,
      employee: {
        ...assignment.employee,
        position: assignment.employee.position?.name || null,
        department: assignment.employee.department?.name || null
      }
    };
  }

  static async delete(id: string, companyId: string): Promise<void> {
    const existingAssignment = await prisma.specialDayAssignment.findFirst({ where: { id, companyId } });
    if (!existingAssignment) {
      throw new Error('Asignación especial no encontrada');
    }
    await prisma.specialDayAssignment.delete({ where: { id } });
  }

  static async getByEmployee(employeeId: string, companyId: string): Promise<SpecialAssignmentWithRelations[]> {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) {
      throw new Error('Empleado no encontrado');
    }
    const assignments = await prisma.specialDayAssignment.findMany({
      where: { employeeId, companyId },
              include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: { select: { name: true } },
              department: { select: { name: true } }
            }
          }
        },
        orderBy: { date: 'desc' }
      });
      return assignments.map(a => ({
        ...a,
        employee: {
          ...a.employee,
          position: a.employee.position?.name || null,
          department: a.employee.department?.name || null
        }
      }));
  }

  static async getByDateRange(startDate: string, endDate: string, companyId: string): Promise<SpecialAssignmentWithRelations[]> {
    const assignments = await prisma.specialDayAssignment.findMany({
      where: {
        companyId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
              include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: { select: { name: true } },
              department: { select: { name: true } }
            }
          }
        },
        orderBy: { date: 'asc' }
      });
      return assignments.map(a => ({
        ...a,
        employee: {
          ...a.employee,
          position: a.employee.position?.name || null,
          department: a.employee.department?.name || null
        }
      }));
  }
} 