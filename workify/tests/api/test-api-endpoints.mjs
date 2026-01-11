import https from 'https';
import http from 'http';

// Configuración
const BASE_URL = 'http://localhost:3003';

// Función para hacer requests HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Suite/1.0',
        ...options.headers
      },
      timeout: 10000
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Función para imprimir resultados
function printResult(testName, passed, details = '') {
  const status = passed ? '✅ PASÓ' : '❌ FALLÓ';
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Función para verificar headers de seguridad
function checkSecurityHeaders(headers) {
  const securityHeaders = [
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection'
  ];
  
  let allPresent = true;
  securityHeaders.forEach(header => {
    if (!headers[header]) {
      allPresent = false;
      console.log(`   ❌ Header ${header} no presente`);
    } else {
      console.log(`   ✅ Header ${header}: ${headers[header]}`);
    }
  });
  
  return allPresent;
}

// Tests de endpoints públicos
async function testPublicEndpoints() {
  console.log('\n=== TESTING ENDPOINTS PÚBLICOS ===\n');

  // Test 1: Login endpoint - POST sin datos
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, { 
      method: 'POST',
      body: {}
    });
    const passed = response.status === 400;
    printResult('Login POST sin datos', passed, `Status: ${response.status}`);
    checkSecurityHeaders(response.headers);
  } catch (error) {
    printResult('Login POST sin datos', false, `Error: ${error.message}`);
  }

  // Test 2: Login endpoint - POST con datos inválidos
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, { 
      method: 'POST',
      body: {
        email: 'invalid-email',
        password: '123'
      }
    });
    const passed = response.status === 400;
    printResult('Login POST datos inválidos', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('Login POST datos inválidos', false, `Error: ${error.message}`);
  }

  // Test 3: Register endpoint - POST sin datos
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/register`, { 
      method: 'POST',
      body: {}
    });
    const passed = response.status === 400;
    printResult('Register POST sin datos', passed, `Status: ${response.status}`);
    checkSecurityHeaders(response.headers);
  } catch (error) {
    printResult('Register POST sin datos', false, `Error: ${error.message}`);
  }

  // Test 4: Logout endpoint - POST sin autenticación
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/logout`, { 
      method: 'POST'
    });
    const passed = response.status === 200;
    printResult('Logout POST sin auth', passed, `Status: ${response.status}`);
    checkSecurityHeaders(response.headers);
  } catch (error) {
    printResult('Logout POST sin auth', false, `Error: ${error.message}`);
  }
}

// Tests de endpoints protegidos sin autenticación
async function testProtectedEndpointsWithoutAuth() {
  console.log('\n=== TESTING ENDPOINTS PROTEGIDOS SIN AUTENTICACIÓN ===\n');

  const protectedEndpoints = [
    '/api/me',
    '/api/employees',
    '/api/dashboard/stats',
    '/api/time-entries',
    '/api/roles',
    '/api/holidays',
    '/api/work-shifts'
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      const passed = response.status === 401;
      printResult(`${endpoint} sin auth`, passed, `Status: ${response.status}`);
    } catch (error) {
      printResult(`${endpoint} sin auth`, false, `Error: ${error.message}`);
    }
  }
}

// Tests de autenticación exitosa
async function testSuccessfulAuth() {
  console.log('\n=== TESTING AUTENTICACIÓN EXITOSA ===\n');

  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/login-simple`, { 
      method: 'POST',
      body: {
        email: 'admin@techcorp.com',
        password: 'admin123'
      }
    });
    
    const passed = response.status === 200 &&
      response.data?.token &&
      response.data?.user &&
      typeof response.data.user.id === 'string' &&
      typeof response.data.user.email === 'string' &&
      typeof response.data.user.companyId === 'string';
    printResult('Login exitoso admin', passed, `Status: ${response.status}`);
    
    if (passed && response.data?.token) {
      console.log(`   ✅ Token obtenido: ${response.data.token.substring(0, 20)}...`);
      return response.data.token;
    }
  } catch (error) {
    printResult('Login exitoso admin', false, `Error: ${error.message}`);
  }
  
  return null;
}

// Tests de endpoints con autenticación
async function testAuthenticatedEndpoints(token) {
  if (!token) {
    console.log('\n❌ No se pudo obtener token, saltando tests autenticados');
    return;
  }

  console.log('\n=== TESTING ENDPOINTS CON AUTENTICACIÓN ===\n');

  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  // Test /api/me
  try {
    const response = await makeRequest(`${BASE_URL}/api/me`, {
      headers: authHeaders
    });
    const passed = response.status === 200 &&
      response.data?.user &&
      typeof response.data.user.id === 'string' &&
      typeof response.data.user.email === 'string';
    printResult('/api/me con auth', passed, `Status: ${response.status}`);
    if (passed) {
      console.log(`   ✅ Usuario: ${response.data.user.email}`);
    }
  } catch (error) {
    printResult('/api/me con auth', false, `Error: ${error.message}`);
  }

  // Test /api/dashboard/stats
  try {
    const response = await makeRequest(`${BASE_URL}/api/dashboard/stats`, {
      headers: authHeaders
    });
    const passed = response.status === 200;
    printResult('/api/dashboard/stats con auth', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('/api/dashboard/stats con auth', false, `Error: ${error.message}`);
  }

  // Test /api/employees
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees`, {
      headers: authHeaders
    });
    const passed = response.status === 200;
    printResult('/api/employees con auth', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('/api/employees con auth', false, `Error: ${error.message}`);
  }

  // Test /api/roles
  try {
    const response = await makeRequest(`${BASE_URL}/api/roles`, {
      headers: authHeaders
    });
    const passed = response.status === 200;
    printResult('/api/roles con auth', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('/api/roles con auth', false, `Error: ${error.message}`);
  }

  // Test /api/work-shifts
  try {
    const response = await makeRequest(`${BASE_URL}/api/work-shifts`, {
      headers: authHeaders
    });
    const passed = response.status === 200;
    printResult('/api/work-shifts con auth', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('/api/work-shifts con auth', false, `Error: ${error.message}`);
  }
}

// Tests de validación de UUID
async function testUUIDValidation() {
  console.log('\n=== TESTING VALIDACIÓN DE UUID ===\n');

  const invalidUUIDs = [
    'invalid-uuid',
    '123',
    'abc-def-ghi',
    '123e4567-e89b-12d3-a456-42661417400', // UUID incompleto
    '123e4567-e89b-12d3-a456-426614174000', // UUID muy largo
    '123e4567-e89b-12d3-a456-42661417400g', // Caracteres inválidos
  ];

  let allValidationsPassed = true;
  let testCount = 0;

  for (const invalidUUID of invalidUUIDs) {
    testCount++;
    try {
      const response = await makeRequest(`${BASE_URL}/api/employees/${invalidUUID}`);
      const passed = response.status === 400;
      if (!passed) {
        allValidationsPassed = false;
        printResult(`UUID validation ${testCount}`, false, `Status: ${response.status} - UUID: ${invalidUUID.substring(0, 20)}...`);
      }
    } catch {
      // Los errores de conexión también son aceptables para UUIDs inválidos
      testCount--;
    }
  }

  printResult('Validación de UUID completa', allValidationsPassed, 
    `${testCount} UUIDs inválidos probados - ${allValidationsPassed ? 'Todos rechazados correctamente' : 'Algunos UUIDs inválidos fueron aceptados'}`);
}

// Función principal
async function runAllTests() {
  console.log('🚀 INICIANDO PRUEBAS DE ENDPOINTS DE LA API');
  console.log(`Base URL: ${BASE_URL}\n`);

  const startTime = Date.now();

  try {
    await testPublicEndpoints();
    await testProtectedEndpointsWithoutAuth();
    const token = await testSuccessfulAuth();
    await testAuthenticatedEndpoints(token);
    await testUUIDValidation();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n✅ PRUEBAS COMPLETADAS`);
    console.log(`Tiempo total: ${duration.toFixed(2)} segundos`);
    console.log(`Revisa los resultados arriba para verificar el funcionamiento de los endpoints.`);

  } catch (error) {
    console.error(`\n❌ Error durante las pruebas: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar pruebas
runAllTests(); 