import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../_helpers';
import { AttendanceService } from '@/services/attendance.service';
import { 
  validateRequestSize, 
  sanitizeSearchParams,
  getSecurityHeaders 
} from '@/lib/utils/security';

export const GET = async (request: NextRequest) => {
  try {
    // Validar tamaño de request
    validateRequestSize(request);
    
    const user = await requireAuth(request);
    // Obtener companyId desde el primer UserRole
    const companyId = user.roles?.[0]?.companyId;
    if (!companyId) throw { status: 400, message: 'Company ID not found' };

    const { searchParams } = new URL(request.url);
    
    // Sanitizar parámetros de búsqueda
    const sanitizedParams = sanitizeSearchParams({
      date: searchParams.get('date'),
    });
    
    const { date } = sanitizedParams;
    
    // Validar fecha
    let targetDate: Date;
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        throw { status: 400, message: 'Fecha inválida' };
      }
      
      // Validar que la fecha esté en un rango razonable
      const currentYear = new Date().getFullYear();
      if (targetDate.getFullYear() < currentYear - 1 || targetDate.getFullYear() > currentYear + 1) {
        throw { status: 400, message: 'La fecha debe estar dentro de un rango razonable' };
      }
    } else {
      targetDate = new Date();
    }

    const stats = await AttendanceService.getDailyAttendanceStats(companyId, targetDate);

    const response = NextResponse.json({ stats });

    // Agregar headers de seguridad
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
      const { status, message } = error as { status: number; message: string };
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}; 