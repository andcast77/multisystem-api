#!/usr/bin/env node
import 'dotenv/config';

// ========================================
// VERIFICACIÓN DE CONFIGURACIÓN DE SEGURIDAD
// ========================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verificando configuración de seguridad...\n');

// Función para verificar archivo .env
function verifyEnvFile() {
  console.log('📋 Verificando archivo .env...');
  
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    
    // Verificar JWT_SECRET
    const jwtSecretMatch = envContent.match(/JWT_SECRET=([^\r\n]+)/);
    if (jwtSecretMatch) {
      const jwtSecret = jwtSecretMatch[1];
      if (jwtSecret.length >= 64) {
        console.log('✅ JWT_SECRET: Configurado correctamente (longitud:', jwtSecret.length, 'caracteres)');
      } else {
        console.log('❌ JWT_SECRET: Demasiado corto (longitud:', jwtSecret.length, 'caracteres)');
        return false;
      }
    } else {
      console.log('❌ JWT_SECRET: No encontrado');
      return false;
    }
    
    // Verificar otras variables importantes
    const requiredVars = ['DATABASE_URL', 'JWT_EXPIRES_IN', 'NODE_ENV'];
    for (const varName of requiredVars) {
      if (envContent.includes(varName + '=')) {
        console.log(`✅ ${varName}: Configurado`);
      } else {
        console.log(`⚠️  ${varName}: No encontrado`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error leyendo archivo .env:', error.message);
    return false;
  }
}

// Función para verificar configuración de seguridad
function verifySecurityConfig() {
  console.log('\n🛡️ Verificando configuración de seguridad...');
  
  try {
    const configPath = join(__dirname, '..', 'src', 'lib', 'config', 'env.ts');
    const configContent = readFileSync(configPath, 'utf8');
    
    // Verificar que se importan las configuraciones de seguridad
    const securityChecks = [
      { name: 'JWT_CONFIG', pattern: /JWT_CONFIG/ },
      { name: 'RATE_LIMIT_CONFIG', pattern: /RATE_LIMIT_CONFIG/ },
      { name: 'SECURITY_CONFIG', pattern: /SECURITY_CONFIG/ },
    ];
    
    for (const check of securityChecks) {
      if (check.pattern.test(configContent)) {
        console.log(`✅ ${check.name}: Configurado`);
      } else {
        console.log(`⚠️  ${check.name}: No encontrado`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error verificando configuración:', error.message);
    return false;
  }
}

// Función para verificar middleware
function verifyMiddleware() {
  console.log('\n🔄 Verificando middleware de seguridad...');
  
  try {
    const middlewarePath = join(__dirname, '..', 'middleware.ts');
    const middlewareContent = readFileSync(middlewarePath, 'utf8');
    
    const securityChecks = [
      { name: 'JWT Verification', pattern: /jwtVerify/ },
      { name: 'Protected Routes', pattern: /protectedRoutes/ },
      { name: 'Public Routes', pattern: /publicRoutes/ },
      { name: 'Token Validation', pattern: /payload\.userId/ },
      { name: 'Security Headers', pattern: /x-user-id/ }
    ];
    
    for (const check of securityChecks) {
      if (check.pattern.test(middlewareContent)) {
        console.log(`✅ ${check.name}: Implementado`);
      } else {
        console.log(`⚠️  ${check.name}: No encontrado`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error verificando middleware:', error.message);
    return false;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando verificación de seguridad...\n');
  
  const results = {
    env: verifyEnvFile(),
    config: verifySecurityConfig(),
    middleware: verifyMiddleware()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Verificaciones pasadas: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 ¡TODAS LAS VERIFICACIONES PASARON!');
    console.log('🟢 La configuración de seguridad está correcta');
  } else {
    console.log('\n⚠️  Algunas verificaciones fallaron');
    console.log('🟡 Revisa los problemas identificados arriba');
  }
  
  console.log('\n🔧 Próximos pasos recomendados:');
  console.log('1. Reinicia el servidor de desarrollo');
  console.log('2. Prueba el login y registro');
  console.log('3. Verifica que el rate limiting funcione');
  console.log('4. Revisa los logs de seguridad');
  
  process.exit(passed === total ? 0 : 1);
}

// Ejecutar verificación
main().catch(error => {
  console.error('❌ Error durante la verificación:', error);
  process.exit(1);
}); 