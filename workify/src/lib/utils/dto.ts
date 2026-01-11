import type { UserWithRelations } from '@/types';
import type { EmployeeWithRelations } from '@/interfaces';
import type { HolidayWithRelations } from '@/services/holiday.service';
import type { Role } from '@/types';
import type { TimeEntryWithRelations } from '@/services/timeEntry.service';
import type { WorkShiftWithRelations } from '@/services/workShift.service';

export function userToDTO(user: UserWithRelations) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    // Agrega aquí solo los campos seguros y necesarios
  };
}

export function employeeToDTO(employee: EmployeeWithRelations) {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    address: employee.address,
    position: employee.position?.name || null,
    department: employee.department?.name || null,
    birthDate: employee.birthDate,
    dateJoined: employee.dateJoined,
    status: employee.status,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    user: employee.user ? {
      id: employee.user.id,
      email: employee.user.email
    } : null,
    // Agrega aquí solo los campos seguros y necesarios
  };
}

export function holidayToDTO(holiday: HolidayWithRelations) {
  return {
    id: holiday.id,
    name: holiday.name,
    date: holiday.date,
    description: holiday.description,
    isRecurring: holiday.isRecurring,
    // isActive eliminado porque no existe en el modelo
  };
}

export function roleToDTO(role: Role & { permissions?: { id: string; name: string }[] }) {
  return {
    id: role.id,
    name: role.name,
    isTemplate: role.isTemplate,
    permissions: Array.isArray(role.permissions) ? role.permissions.map((p) => ({ id: p.id, name: p.name })) : [],
  };
}

export function timeEntryToDTO(timeEntry: TimeEntryWithRelations) {
  return {
    id: timeEntry.id,
    employeeId: timeEntry.employeeId,
    date: timeEntry.date,
    clockIn: timeEntry.clockIn,
    clockOut: timeEntry.clockOut,
    notes: timeEntry.notes,
  };
}

export function workShiftToDTO(workShift: WorkShiftWithRelations) {
  return {
    id: workShift.id,
    name: workShift.name,
    startTime: workShift.startTime,
    endTime: workShift.endTime,
    description: workShift.description,
    isActive: workShift.isActive,
    isNightShift: workShift.isNightShift,
  };
} 