export const runtime = "nodejs";
import { NextRequest } from 'next/server';
import { safeHandler, requireAuth, requireRole } from '../../_helpers';
import { EmployeeService } from '@/services/employee.service';
import { ROLES } from '@/lib/constants';
import { 
  validateRequestSize, 
  getSecurityHeaders 
} from '@/lib/utils/security';
import { 
  applyRateLimit, 
  getRateLimitHeaders, 
  detectSuspiciousActivity 
} from '@/lib/utils/rateLimit';
import { SecurityLogger } from '@/lib/utils/securityLogger';
import { validateEmployeeImport } from '@/lib/utils/validation';

export const POST = safeHandler(async (request: NextRequest) => {
  // Validar tamaño de request
  validateRequestSize(request);
  
  // Aplicar rate limiting específico para importaciones
  await applyRateLimit(request, 'import');
  
  // Detectar actividad sospechosa
  if (detectSuspiciousActivity(request)) {
    SecurityLogger.suspiciousActivity(request, {
      reason: 'Actividad sospechosa en importación',
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      path: request.nextUrl.pathname
    });
  }
  
  const user = await requireAuth(request);
  requireRole(user, [ROLES.ADMIN, ROLES.HR]);
  
  const companyId = user.roles?.[0]?.companyId;
  if (!companyId) throw { status: 400, message: 'Company ID not found' };

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      SecurityLogger.fileUploadFailed(request, '', 'No se proporcionó archivo');
      throw { status: 400, message: 'No se proporcionó archivo' };
    }

    // Validar archivo usando el validador centralizado
    await validateEmployeeImport(file);

    const fileSize = file.size;
    const fileName = file.name;

    // Procesar archivo CSV usando EmployeeService
    const fileContent = await file.text();
    const importResult = await EmployeeService.importFromFile(fileContent, companyId);

    const response = Response.json({
      message: 'Importación completada exitosamente',
      imported: importResult.success,
      errors: importResult.errors.map((error, index) => ({ 
        row: index + 1, 
        error 
      })),
      fileName: fileName,
      fileSize: fileSize,
      timestamp: new Date().toISOString()
    });

    // Agregar headers de seguridad
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Agregar headers de rate limit
    Object.entries(getRateLimitHeaders(request, 'import')).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Log de importación exitosa
    SecurityLogger.fileUploadSuccess(request, fileName, fileSize);

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