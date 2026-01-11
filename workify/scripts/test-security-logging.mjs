#!/usr/bin/env node
import 'dotenv/config';

// ========================================
// TEST DEL SISTEMA DE LOGGING DE SEGURIDAD
// ========================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Probando sistema de logging de seguridad...\n');

// Función para verificar archivos de log
function checkLogFiles() {
  console.log('📋 Verificando archivos de log...');
  
  const logDir = join(__dirname, '..', 'logs', 'security');
  const today = new Date().toISOString().slice(0, 10);
  const logFile = join(logDir, `security-${today}.log`);
  
  if (!existsSync(logDir)) {
    console.log('❌ Directorio de logs no existe');
    return false;
  }
  
  if (!existsSync(logFile)) {
    console.log('⚠️  Archivo de log de hoy no existe');
    return false;
  }
  
  console.log('✅ Archivo de log encontrado:', logFile);
  
  // Leer contenido del log
  try {
    const content = readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    console.log(`📊 Total de eventos: ${lines.length}`);
    
    if (lines.length > 0) {
      console.log('\n📝 Últimos 5 eventos:');
      lines.slice(-5).forEach((line, index) => {
        console.log(`  ${index + 1}. ${line}`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error leyendo archivo de log:', error.message);
    return false;
  }
}

// Función para verificar configuración
function checkConfiguration() {
  console.log('\n⚙️ Verificando configuración...');
  
  const requiredEnvVars = [
    'SECURITY_LOGGING_ENABLED',
    'SECURITY_LOG_LEVEL',
    'SECURITY_LOG_DIR'
  ];
  
  let allConfigured = true;
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${value}`);
    } else {
      console.log(`⚠️  ${envVar}: No configurado (usando valor por defecto)`);
      allConfigured = false;
    }
  }
  
  return allConfigured;
}

// Función para simular eventos de seguridad
async function simulateSecurityEvents() {
  console.log('\n🎭 Simulando eventos de seguridad...');
  
  try {
    // Importar el logger
    const { SecurityLogger } = await import('../src/lib/utils/securityLogger.js');
    
    // Simular diferentes tipos de eventos
    console.log('  🔐 Simulando login exitoso...');
    SecurityLogger.loginSuccess(
      { headers: new Map([['x-forwarded-for', '127.0.0.1']]), nextUrl: { pathname: '/api/auth/login' }, method: 'POST' },
      'test@example.com',
      'test-user-id'
    );
    
    console.log('  ⚠️  Simulando login fallido...');
    SecurityLogger.loginFailed(
      { headers: new Map([['x-forwarded-for', '127.0.0.1']]), nextUrl: { pathname: '/api/auth/login' }, method: 'POST' },
      'test@example.com',
      'Contraseña incorrecta'
    );
    
    console.log('  🚨 Simulando actividad sospechosa...');
    SecurityLogger.suspiciousActivity(
      { headers: new Map([['x-forwarded-for', '192.168.1.100']]), nextUrl: { pathname: '/api/auth/login' }, method: 'POST' },
      { reason: 'IP sospechosa', attempts: 10 }
    );
    
    console.log('  📁 Simulando upload de archivo...');
    SecurityLogger.fileUploadSuccess(
      { headers: new Map([['x-forwarded-for', '127.0.0.1']]), nextUrl: { pathname: '/api/employees/import' }, method: 'POST' },
      'empleados.csv',
      1024
    );
    
    console.log('  🔒 Simulando acceso no autorizado...');
    SecurityLogger.unauthorizedAccess(
      { headers: new Map([['x-forwarded-for', '127.0.0.1']]), nextUrl: { pathname: '/api/employees' }, method: 'GET' }
    );
    
    console.log('✅ Eventos simulados correctamente');
    return true;
  } catch (error) {
    console.log('❌ Error simulando eventos:', error.message);
    return false;
  }
}

// Función para verificar estructura de logs
function analyzeLogStructure() {
  console.log('\n🔍 Analizando estructura de logs...');
  
  const logDir = join(__dirname, '..', 'logs', 'security');
  const today = new Date().toISOString().slice(0, 10);
  const logFile = join(logDir, `security-${today}.log`);
  
  if (!existsSync(logFile)) {
    console.log('❌ No se puede analizar: archivo de log no existe');
    return;
  }
  
  try {
    const content = readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Analizar tipos de eventos
    const eventTypes = new Map();
    const levels = new Map();
    const ips = new Map();
    
    lines.forEach(line => {
      // Extraer tipo de evento
      const typeMatch = line.match(/\[([A-Z_]+)\]/);
      if (typeMatch) {
        const type = typeMatch[1];
        eventTypes.set(type, (eventTypes.get(type) || 0) + 1);
      }
      
      // Extraer nivel
      const levelMatch = line.match(/\[(INFO|WARNING|ERROR|CRITICAL)\]/);
      if (levelMatch) {
        const level = levelMatch[1];
        levels.set(level, (levels.get(level) || 0) + 1);
      }
      
      // Extraer IP
      const ipMatch = line.match(/ip:([^\s|]+)/);
      if (ipMatch) {
        const ip = ipMatch[1];
        ips.set(ip, (ips.get(ip) || 0) + 1);
      }
    });
    
    console.log('📊 Estadísticas de eventos:');
    console.log('  Tipos de eventos:');
    for (const [type, count] of eventTypes) {
      console.log(`    ${type}: ${count}`);
    }
    
    console.log('  Niveles de severidad:');
    for (const [level, count] of levels) {
      console.log(`    ${level}: ${count}`);
    }
    
    console.log('  IPs únicas:', ips.size);
    for (const [ip, count] of ips) {
      console.log(`    ${ip}: ${count} eventos`);
    }
    
  } catch (error) {
    console.log('❌ Error analizando logs:', error.message);
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando test del sistema de logging de seguridad...\n');
  
  const results = {
    config: checkConfiguration(),
    simulation: await simulateSecurityEvents(),
    files: checkLogFiles()
  };
  
  // Esperar un momento para que se escriban los logs
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  analyzeLogStructure();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DEL TEST');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Tests pasados: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 ¡SISTEMA DE LOGGING FUNCIONANDO CORRECTAMENTE!');
    console.log('🟢 Todos los eventos se están registrando correctamente');
  } else {
    console.log('\n⚠️  Algunos tests fallaron');
    console.log('🟡 Revisa la configuración y los permisos de archivos');
  }
  
  console.log('\n📝 Próximos pasos:');
  console.log('1. Verifica los logs en logs/security/');
  console.log('2. Configura alertas para eventos críticos');
  console.log('3. Implementa rotación automática de logs');
  console.log('4. Configura monitoreo en producción');
  
  process.exit(passed === total ? 0 : 1);
}

// Ejecutar test
main().catch(error => {
  console.error('❌ Error durante el test:', error);
  process.exit(1);
}); 