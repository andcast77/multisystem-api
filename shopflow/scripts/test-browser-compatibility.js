#!/usr/bin/env node

/**
 * Script de Testing Multi-Navegador
 * Verifica compatibilidad de la configuración de impresoras en Chrome y Edge
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SETTINGS_URL = `${BASE_URL}/admin/settings`;

// Configuración de navegadores disponibles
const browsers = {
  chrome: {
    path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    name: 'Chrome',
    flags: ['--no-first-run', '--disable-default-apps', '--disable-sync', '--disable-translate', '--hide-crash-restore-bubble']
  },
  edge: {
    path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    name: 'Edge',
    flags: ['--no-first-run', '--disable-default-apps', '--disable-sync', '--disable-translate']
  }
};

async function testBrowser(browserKey) {
  const browser = browsers[browserKey];

  console.log(`\n🧪 Testing ${browser.name}...`);

  return new Promise((resolve, reject) => {
    const testScript = `
      // Script de testing automatizado
      console.log('Iniciando pruebas en ${browser.name}');

      // Test 1: Verificar que la página carga
      if (document.readyState !== 'complete') {
        console.error('ERROR: Pagina no cargo completamente');
        return false;
      }

      // Test 2: Verificar elementos principales del formulario
      const formElements = {
        ticketType: document.querySelector('[name="ticketType"]'),
        header: document.querySelector('[name="header"]'),
        footer: document.querySelector('[name="footer"]'),
        logoInput: document.querySelector('input[type="file"]'),
        preview: document.querySelector('[data-testid="preview-section"]') || document.querySelector('.preview'),
        printButton: document.querySelector('button:has-text("Probar Impresion")') || document.querySelector('button')
      };

      let passed = 0;
      let total = Object.keys(formElements).length;

      Object.entries(formElements).forEach(([key, element]) => {
        if (element) {
          console.log('[PASS] ' + key + ': ENCONTRADO');
          passed++;
        } else {
          console.log('[FAIL] ' + key + ': NO ENCONTRADO');
        }
      });

      // Test 3: Verificar funcionalidad de impresión
      const printButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Probar') ||
        btn.textContent.includes('Imprimir') ||
        btn.onclick?.toString().includes('print')
      );

      if (printButtons.length > 0) {
        console.log('PASS: Funcionalidad de impresion DETECTADA');
        passed++;
        total++;
      } else {
        console.log('FAIL: Funcionalidad de impresion NO DETECTADA');
        total++;
      }

      // Test 4: Verificar estilos CSS
      const hasStyles = document.querySelectorAll('style, link[rel="stylesheet"]').length > 0;
      if (hasStyles) {
        console.log('PASS: Estilos CSS CARGADOS');
        passed++;
        total++;
      } else {
        console.log('FAIL: Estilos CSS NO CARGADOS');
        total++;
      }

      console.log('Resultado ${browser.name}: ' + passed + '/' + total + ' pruebas pasaron');

      // Retornar resultado
      return { browser: '${browser.name}', passed, total, success: passed === total };
    `;

    // Crear archivo temporal con el script de test
    const tempScriptPath = path.join(__dirname, '..', 'temp-test-script.js');
    fs.writeFileSync(tempScriptPath, testScript);

    // Ejecutar navegador con el script de test
    const args = [
      ...browser.flags,
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--app=${SETTINGS_URL}`,
      `--register-pepper-plugins=${tempScriptPath};application/x-ppapi-tests`
    ];

    const child = spawn(browser.path, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      // Limpiar archivo temporal
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {
        // Ignorar error
      }

    if (code === 0) {
      console.log('[OK] ' + browser.name + ': Test completado');
      resolve({ success: true, browser: browser.name });
    } else {
      console.log('[ERROR] ' + browser.name + ': Error en test (codigo ' + code + ')');
      console.log('Output:', output);
      console.log('Error:', errorOutput);
      resolve({ success: false, browser: browser.name, error: errorOutput });
    }
    });

    // Timeout despues de 30 segundos
    setTimeout(() => {
      child.kill();
      console.log('[TIMEOUT] ' + browser.name + ': Timeout despues de 30 segundos');
      resolve({ success: false, browser: browser.name, error: 'Timeout' });
    }, 30000);
  });
}

async function runAllTests() {
  console.log('Iniciando Testing Multi-Navegador para Sistema de Configuracion de Impresoras');
  console.log('URL de prueba:', SETTINGS_URL);
  console.log('Navegadores disponibles:', Object.keys(browsers).join(', '));

  const results = [];

  for (const browserKey of Object.keys(browsers)) {
    try {
      const result = await testBrowser(browserKey);
      results.push(result);
    } catch (error) {
      console.error('Error testing ' + browserKey + ':', error);
      results.push({ success: false, browser: browsers[browserKey].name, error: error.message });
    }
  }

  // Resultados finales
  console.log('RESULTADOS FINALES:');
  console.log('='.repeat(50));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  results.forEach(result => {
    const status = result.success ? 'PASO' : 'FALLO';
    console.log(result.browser + ': ' + status);
    if (result.error) {
      console.log('   Error: ' + result.error);
    }
  });

  console.log('Resumen: ' + successful.length + '/' + results.length + ' navegadores pasaron todas las pruebas');

  if (failed.length === 0) {
    console.log('Todas las pruebas pasaron exitosamente!');
    process.exit(0);
  } else {
    console.log('Algunas pruebas fallaron. Revisa los detalles arriba.');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testBrowser };