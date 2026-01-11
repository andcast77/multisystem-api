import { OvertimeType, SalaryType, UserWithRelations } from "@/types";
import { Employee, Role, User, Position, Department } from "@prisma/client";

// ========================================
// INTERFACES DE EMPRESA
// ========================================

export interface Company {
    id: string;
    name: string;
}

// Tipos extendidos con relaciones
export interface CompanyWithRelations extends Company {
    employees: Employee[];
    users: User[];
}

export interface EmployeeWithRelations extends Employee {
    company: Company;
    user: User | null;
    position?: Position | null;
    department?: Department | null;
}

// ========================================
// INTERFACES DE ROLES
// ========================================

export interface RoleWithRelations extends Role {
    users: UserRole[];
}

export interface UserRole {
    userId: string;
    roleId: string;
    companyId: string;
    user: User;
    role: Role;
}

// ========================================
// INTERFACES DE AUTENTICACIÓN
// ========================================

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    companyName: string;
    firstName: string;
    lastName: string;
}

export interface AuthContextType {
    user: UserWithRelations | null;
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
}

// ========================================
// INTERFACES DE API
// ========================================

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ========================================
// INTERFACES DE EMPLEADO
// ========================================

export interface EmployeePositionOverrides {
    customSalaryAmount?: number;
    customSalaryType?: SalaryType;
    customOvertimeEligible?: boolean;
    customOvertimeType?: OvertimeType;
    customOvertimeValue?: number;
    customAnnualVacationDays?: number;
    customHasAguinaldo?: boolean;
    customMonthlyBonus?: number;
}

// ========================================
// INTERFACES DE COMPONENTES
// ========================================

export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onClick?: () => void;
}

// ========================================
// RE-EXPORTAR INTERFACES DE POSICIÓN
// ========================================

export type { PositionData, Position } from "@/types";
