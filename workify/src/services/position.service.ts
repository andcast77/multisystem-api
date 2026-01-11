import { prisma } from '@/lib/prisma';
import { PositionData } from '@/types';

export class PositionService {
  static async getAll(companyId: string) {
    return prisma.position.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  static async getById(id: string, companyId: string) {
    return prisma.position.findFirst({
      where: { id, companyId },
    });
  }

  static async create(data: Record<string, unknown>, companyId: string) {
    return prisma.position.create({
      data: {
        name: data.name as string,
        description: (data.description as string) ?? null,
        salaryAmount: data.salaryAmount as number,
        salaryType: data.salaryType as 'hour' | 'day' | 'week' | 'biweek' | 'month',
        overtimeEligible: (data.overtimeEligible as boolean) ?? false,
        overtimeType: (data.overtimeType as 'multiplier' | 'fixed') ?? null,
        overtimeValue: (data.overtimeValue as number) ?? null,
        annualVacationDays: (data.annualVacationDays as number) ?? null,
        hasAguinaldo: (data.hasAguinaldo as boolean) ?? true,
        monthlyBonus: (data.monthlyBonus as number) ?? null,
        level: (data.level as string) ?? null,
        isActive: (data.isActive as boolean) ?? true,
        notes: (data.notes as string) ?? null,
        companyId,
      },
    });
  }

  static async update(id: string, data: Partial<PositionData>, companyId: string) {
    // Solo incluir campos definidos en el update
    const updateData: Record<string, unknown> = { companyId };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.salaryAmount !== undefined) updateData.salaryAmount = data.salaryAmount;
    if (data.salaryType !== undefined) updateData.salaryType = data.salaryType;
    if (data.overtimeEligible !== undefined) updateData.overtimeEligible = data.overtimeEligible;
    if (data.overtimeType !== undefined) updateData.overtimeType = data.overtimeType;
    if (data.overtimeValue !== undefined) updateData.overtimeValue = data.overtimeValue;
    if (data.annualVacationDays !== undefined) updateData.annualVacationDays = data.annualVacationDays;
    if (data.hasAguinaldo !== undefined) updateData.hasAguinaldo = data.hasAguinaldo;
    if (data.monthlyBonus !== undefined) updateData.monthlyBonus = data.monthlyBonus;
    if (data.level !== undefined) updateData.level = data.level;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.notes !== undefined) updateData.notes = data.notes;
    return prisma.position.update({
      where: { id },
      data: updateData,
    });
  }

  static async delete(id: string) {
    return prisma.position.delete({
      where: { id },
    });
  }
} 