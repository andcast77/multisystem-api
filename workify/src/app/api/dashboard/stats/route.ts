import { NextRequest } from 'next/server';
import { safeHandler, requireAuthFlexible } from '../../_helpers';
import { DashboardService } from '@/services/dashboard.service';
import { 
  validateRequestSize, 
  limitResponseSize,
  getSecurityHeaders 
} from '@/lib/utils/security';

export const GET = safeHandler(async (request: NextRequest) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  try {
    const user = await requireAuthFlexible(request);
    const companyId = user.roles?.[0]?.companyId;
    if (!companyId) throw { status: 400, message: 'Company ID not found' };

    // Usar DashboardService para obtener todas las estadísticas
    const dashboardData = await DashboardService.getDashboardStats(companyId);

    // Limitar tamaño de respuesta
    const limitedRecentActivity = limitResponseSize(dashboardData.recentActivity, 10);
    const limitedDepartmentStats = limitResponseSize(dashboardData.departmentStats, 20);

    const response = Response.json({
      stats: dashboardData.stats,
      departmentStats: limitedDepartmentStats,
      recentActivity: limitedRecentActivity,
      company: dashboardData.company
    });

    // Agregar headers de seguridad
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
      throw error;
    }
    if (error instanceof Error) {
      throw { status: 400, message: error.message };
    }
    throw { status: 500, message: 'Error interno del servidor' };
  }
}); 