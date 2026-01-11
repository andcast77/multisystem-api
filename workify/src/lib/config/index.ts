// ========================================
// CONFIGURACIÓN CENTRALIZADA DEL SISTEMA
// ========================================

// Cargar variables de entorno desde archivo .env
import dotenv from 'dotenv';
dotenv.config();

// ========================================
// FUNCIONES AUXILIARES DE CONFIGURACIÓN
// ========================================

// Función para validar que una variable de entorno existe
function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable de entorno requerida no encontrada: ${name}`);
  }
  return value;
}

// Función para obtener una variable de entorno con valor por defecto
function getEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// Función para obtener una variable de entorno numérica
function getEnvVarNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

// Función para obtener una variable de entorno booleana
function getEnvVarBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// ========================================
// CONFIGURACIÓN DE SEGURIDAD Y AUTENTICACIÓN
// ========================================

export const JWT_CONFIG = {
  // Clave secreta para JWT (OBLIGATORIO en producción)
  SECRET: requireEnvVar('JWT_SECRET'),
  
  // Tiempo de expiración del token JWT (en segundos)
  EXPIRES_IN: getEnvVarNumber('JWT_EXPIRES_IN', 7 * 24 * 60 * 60), // 7 días por defecto
  
  // Opciones adicionales para JWT
  ISSUER: 'workify',
  AUDIENCE: 'workify-users',
} as const;

// ========================================
// CONFIGURACIÓN DE BASE DE DATOS
// ========================================

export const DATABASE_CONFIG = {
  // URL de conexión a la base de datos
  URL: requireEnvVar('DATABASE_URL'),
} as const;

// ========================================
// CONFIGURACIÓN DE SERVIDOR Y RED
// ========================================

export const SERVER_CONFIG = {
  // Puerto del servidor
  PORT: getEnvVarNumber('PORT', 3000),
  
  // URL base de la aplicación
  APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  
  // Entorno de ejecución
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  
  // Verificar si estamos en producción
  IS_PRODUCTION: getEnvVar('NODE_ENV', 'development') === 'production',
  
  // Verificar si estamos en desarrollo
  IS_DEVELOPMENT: getEnvVar('NODE_ENV', 'development') === 'development',
} as const;

// ========================================
// CONFIGURACIÓN DE RATE LIMITING
// ========================================

export const RATE_LIMIT_CONFIG = {
  // Ventana de tiempo general (en milisegundos)
  WINDOW_MS: getEnvVarNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutos
  
  // Máximo de requests por ventana
  MAX_REQUESTS: getEnvVarNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  
  // Ventana de tiempo para login (en milisegundos)
  LOGIN_WINDOW_MS: getEnvVarNumber('RATE_LIMIT_LOGIN_WINDOW_MS', 5 * 60 * 1000), // 5 minutos
  
  // Máximo de intentos de login
  LOGIN_MAX_ATTEMPTS: getEnvVarNumber('RATE_LIMIT_LOGIN_MAX_ATTEMPTS', 5),
  
  // Ventana de tiempo para importaciones (en milisegundos)
  IMPORT_WINDOW_MS: getEnvVarNumber('RATE_LIMIT_IMPORT_WINDOW_MS', 60 * 60 * 1000), // 1 hora
  
  // Máximo de importaciones por ventana
  IMPORT_MAX_ATTEMPTS: getEnvVarNumber('RATE_LIMIT_IMPORT_MAX_ATTEMPTS', 3),
} as const;

// ========================================
// CONFIGURACIÓN DE SEGURIDAD ADICIONAL
// ========================================

export const SECURITY_CONFIG = {
  // Tamaño máximo de request (en bytes)
  MAX_REQUEST_SIZE: getEnvVarNumber('MAX_REQUEST_SIZE', 1024 * 1024), // 1MB
  
  // Tamaño máximo de respuesta
  MAX_RESPONSE_SIZE: getEnvVarNumber('MAX_RESPONSE_SIZE', 1000),
  
  // Tiempo de sesión (en milisegundos)
  SESSION_TIMEOUT: getEnvVarNumber('SESSION_TIMEOUT', 7 * 24 * 60 * 60 * 1000), // 7 días
} as const;

// ========================================
// CONFIGURACIÓN DE LOGGING Y MONITOREO
// ========================================

export const LOGGING_CONFIG = {
  // Nivel de logging
  LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  
  // Habilitar logs detallados
  ENABLE_DETAILED_LOGS: getEnvVarBoolean('ENABLE_DETAILED_LOGS', !SERVER_CONFIG.IS_PRODUCTION),
} as const;

// ========================================
// CONFIGURACIÓN DE BACKUP
// ========================================

export const BACKUP_CONFIG = {
  // Frecuencia de backup automático (en horas)
  INTERVAL_HOURS: getEnvVarNumber('BACKUP_INTERVAL_HOURS', 24),
  
  // Ruta para almacenar backups
  PATH: getEnvVar('BACKUP_PATH', './backups'),
  
  // Habilitar backup automático
  ENABLED: getEnvVarBoolean('BACKUP_ENABLED', false),
} as const;

// ========================================
// CONFIGURACIÓN COMPLETA
// ========================================

export const CONFIG = {
  JWT: JWT_CONFIG,
  DATABASE: DATABASE_CONFIG,
  SERVER: SERVER_CONFIG,
  RATE_LIMIT: RATE_LIMIT_CONFIG,
  SECURITY: SECURITY_CONFIG,
  LOGGING: LOGGING_CONFIG,
  BACKUP: BACKUP_CONFIG,
} as const;

// ========================================
// FUNCIONES DE VALIDACIÓN E INICIALIZACIÓN
// ========================================

// Función para validar la configuración al inicio
export function validateConfig(): void {
  // Validar JWT_SECRET en producción
  if (SERVER_CONFIG.IS_PRODUCTION) {
    if (JWT_CONFIG.SECRET === 'your-super-secret-jwt-key-here-minimum-32-characters-long' ||
        JWT_CONFIG.SECRET === 'dev-secret-key' ||
        JWT_CONFIG.SECRET.length < 32) {
      throw new Error('JWT_SECRET debe ser una clave segura de al menos 32 caracteres en producción');
    }
  }
  
  // Validar DATABASE_URL
  if (!DATABASE_CONFIG.URL) {
    throw new Error('DATABASE_URL es requerida');
  }
  
  // Validar configuración de rate limiting
  if (RATE_LIMIT_CONFIG.MAX_REQUESTS <= 0) {
    throw new Error('RATE_LIMIT_MAX_REQUESTS debe ser mayor a 0');
  }
  
  if (RATE_LIMIT_CONFIG.LOGIN_MAX_ATTEMPTS <= 0) {
    throw new Error('RATE_LIMIT_LOGIN_MAX_ATTEMPTS debe ser mayor a 0');
  }
  
  console.log('✅ Configuración validada correctamente');
}

// Función para verificar configuración de producción
export function checkProductionConfig(): void {
  if (SERVER_CONFIG.IS_PRODUCTION) {
    console.log('🚀 Verificando configuración de producción...');
    
    // Verificar JWT_SECRET
    if (CONFIG.JWT.SECRET.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }
    
    // Verificar que no estamos usando valores por defecto inseguros
    if (CONFIG.JWT.SECRET === 'dev-secret-key' || 
        CONFIG.JWT.SECRET === 'your-super-secret-jwt-key-here-minimum-32-characters-long') {
      throw new Error('JWT_SECRET no puede usar valores por defecto en producción');
    }
    
    // Verificar DATABASE_URL
    if (!CONFIG.DATABASE.URL || CONFIG.DATABASE.URL.includes('dev.db')) {
      throw new Error('DATABASE_URL debe apuntar a una base de datos de producción');
    }
    
    console.log('✅ Configuración de producción verificada correctamente');
  }
}

// Función para mostrar advertencias de desarrollo
export function showDevelopmentWarnings(): void {
  if (SERVER_CONFIG.IS_DEVELOPMENT) {
    console.log('\n⚠️  ADVERTENCIAS DE DESARROLLO:');
    console.log('• JWT_SECRET está usando valor por defecto (solo para desarrollo)');
    console.log('• Rate limiting está usando almacenamiento en memoria');
    console.log('• Logs detallados están habilitados');
    console.log('• Base de datos PostgreSQL en Docker');
    console.log('\n🔒 Para producción, asegúrate de:');
    console.log('• Configurar JWT_SECRET seguro');
    console.log('• Configurar base de datos de producción');
    console.log('• Configurar HTTPS');
    console.log('• Configurar monitoreo de logs');
    console.log('• Configurar backup automático');
  }
}

// Función para inicializar la configuración
export function initializeConfig(): void {
  try {
    console.log('🔧 Inicializando configuración...');
    
    // Validar configuración
    validateConfig();
    
    // Mostrar información de configuración (solo en desarrollo)
    if (CONFIG.SERVER.IS_DEVELOPMENT) {
      console.log('📋 Configuración cargada:');
      console.log(`   • Entorno: ${CONFIG.SERVER.NODE_ENV}`);
      console.log(`   • Puerto: ${CONFIG.SERVER.PORT}`);
      console.log(`   • JWT Expiración: ${CONFIG.JWT.EXPIRES_IN} segundos`);
      console.log(`   • Rate Limit: ${CONFIG.RATE_LIMIT.MAX_REQUESTS} requests/${CONFIG.RATE_LIMIT.WINDOW_MS / 1000}s`);
      console.log(`   • Backup: ${CONFIG.BACKUP.ENABLED ? 'Habilitado' : 'Deshabilitado'}`);
    }
    
    console.log('✅ Configuración inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error al inicializar configuración:', error);
    process.exit(1);
  }
}

// Función principal de inicialización
export function initialize(): void {
  initializeConfig();
  checkProductionConfig();
  showDevelopmentWarnings();
}

// Exportar configuración por defecto
export default CONFIG; 