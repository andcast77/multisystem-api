#!/usr/bin/env node

/**
 * Script principal para ejecutar todas las pruebas
 * Uso: node scripts/run-tests.mjs [tipo]
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de pruebas
const tests = {
  database: [
    'tests/database/check-db.mjs',
    'tests/database/check-full-db.mjs'
  ],
  api: [
    'tests/api/test-login-simple.mjs',
    'tests/api/test-api-endpoints.mjs'
  ],
  security: [
    'scripts/verify-jwt-secret.mjs'
  ],
  all: [
    'scripts/verify-jwt-secret.mjs',
    'tests/database/check-db.mjs',
    'tests/api/test-login-simple.mjs'
  ]
};

// Función para ejecutar un comando
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Ejecutando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${command} completado exitosamente`);
        resolve();
      } else {
        console.log(`❌ ${command} falló con código ${code}`);
        reject(new Error(`Comando falló con código ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error ejecutando ${command}:`, error.message);
      reject(error);
    });
  });
}

// Función principal
async function runTests(testType = 'all') {
  console.log('🧪 EJECUTANDO PRUEBAS DEL PROYECTO');
  console.log('=====================================\n');

  const testFiles = tests[testType] || tests.all;
  
  if (testType === 'all') {
    console.log('📋 Ejecutando todas las pruebas...\n');
  } else {
    console.log(`📋 Ejecutando pruebas de: ${testType}\n`);
  }

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  for (const testFile of testFiles) {
    try {
      await runCommand('node', [testFile]);
      passed++;
    } catch (error) {
      failed++;
      console.error(`❌ Error en ${testFile}:`, error.message);
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n📊 RESUMEN DE PRUEBAS');
  console.log('=====================');
  console.log(`✅ Exitosas: ${passed}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`⏱️  Duración: ${duration.toFixed(2)} segundos`);
  console.log(`📁 Tipo: ${testType}`);

  if (failed === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.');
    process.exit(1);
  }
}

// Manejar argumentos de línea de comandos
const testType = process.argv[2] || 'all';

if (!tests[testType]) {
  console.log('❌ Tipo de prueba inválido');
  console.log('📋 Tipos disponibles:');
  Object.keys(tests).forEach(type => {
    console.log(`   • ${type}`);
  });
  process.exit(1);
}

// Ejecutar pruebas
runTests(testType).catch(error => {
  console.error('❌ Error ejecutando pruebas:', error.message);
  process.exit(1);
}); 