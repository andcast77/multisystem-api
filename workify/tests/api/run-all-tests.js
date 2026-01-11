#!/usr/bin/env node

const { runAllTests } = require('./endpoint-security-test');
const { runAuthenticatedTests } = require('./authenticated-endpoint-test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function runCompleteTestSuite() {
  console.log(`${colors.bright}${colors.magenta}🔒 SUITE COMPLETA DE PRUEBAS DE SEGURIDAD DE API${colors.reset}`);
  console.log(`${colors.cyan}================================================${colors.reset}\n`);

  const totalStartTime = Date.now();

  try {
    // Ejecutar pruebas de endpoints públicos y seguridad básica
    console.log(`${colors.bright}${colors.blue}📋 FASE 1: PRUEBAS DE SEGURIDAD BÁSICA${colors.reset}`);
    await runAllTests();

    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    // Ejecutar pruebas de endpoints autenticados
    console.log(`${colors.bright}${colors.blue}📋 FASE 2: PRUEBAS DE ENDPOINTS AUTENTICADOS${colors.reset}`);
    await runAuthenticatedTests();

    const totalEndTime = Date.now();
    const totalDuration = (totalEndTime - totalStartTime) / 1000;

    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.green}🎉 SUITE COMPLETA DE PRUEBAS FINALIZADA${colors.reset}`);
    console.log(`${colors.cyan}Tiempo total de ejecución: ${totalDuration.toFixed(2)} segundos${colors.reset}`);
    console.log(`${colors.yellow}Revisa todos los resultados arriba para verificar la seguridad completa de la API.${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error durante la ejecución de la suite completa: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Ejecutar suite completa si el script se ejecuta directamente
if (require.main === module) {
  runCompleteTestSuite();
}

module.exports = {
  runCompleteTestSuite
}; 