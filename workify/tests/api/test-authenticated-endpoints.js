const https = require('https');
const http = require('http');

// Configuración
const BASE_URL = 'http://localhost:3000';

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
        'User-Agent': 'Security-Test-Suite/1.0',
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
        } catch (e) {
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

// Función para crear un usuario de prueba y obtener token
async function createTestUser() {
  console.log('🔧 Creando usuario de prueba...');
  const unique = Date.now() + '-' + Math.floor(Math.random() * 1000000) + '-' + Math.random().toString(36).substring(2, 8);
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: {
        email: `test-${unique}@security-test.com`,
        password: 'TestPassword123!', // Cumple requisitos de seguridad
        companyName: `security test company ${unique}`.toLowerCase(),
        firstName: 'Test',
        lastName: 'User'
      }
    });

    if (response.status === 200 || response.status === 201) {
      // Extraer token de las cookies
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
        if (tokenCookie) {
          const token = tokenCookie.split(';')[0].replace('token=', '');
          console.log('✅ Usuario de prueba creado exitosamente');
          return token;
        }
      }
    }
    
    throw new Error('No se pudo obtener token de autenticación');
  } catch (error) {
    console.log(`❌ Error creando usuario de prueba: ${error.message}`);
    return null;
  }
}

// Tests de endpoints autenticados
async function testAuthenticatedEndpoints(token) {
  console.log('\n=== TESTING ENDPOINTS AUTENTICADOS ===\n');

  if (!token) {
    console.log('❌ No se puede probar endpoints autenticados sin token');
    return;
  }

  // Test 1: GET /api/me
  try {
    const response = await makeRequest(`${BASE_URL}/api/me`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data && response.data.user;
    printResult('GET /api/me', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/me', false, `Error: ${error.message}`);
  }

  // Test 2: GET /api/employees
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data && response.data.employees;
    printResult('GET /api/employees', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/employees', false, `Error: ${error.message}`);
  }

  // Test 3: GET /api/dashboard/stats
  try {
    const response = await makeRequest(`${BASE_URL}/api/dashboard/stats`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data && response.data.stats;
    printResult('GET /api/dashboard/stats', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/dashboard/stats', false, `Error: ${error.message}`);
  }

  // Test 4: GET /api/time-entries
  try {
    const response = await makeRequest(`${BASE_URL}/api/time-entries`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data;
    printResult('GET /api/time-entries', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/time-entries', false, `Error: ${error.message}`);
  }

  // Test 5: GET /api/roles
  try {
    const response = await makeRequest(`${BASE_URL}/api/roles`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data;
    printResult('GET /api/roles', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/roles', false, `Error: ${error.message}`);
  }

  // Test 6: GET /api/holidays
  try {
    const response = await makeRequest(`${BASE_URL}/api/holidays`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data;
    printResult('GET /api/holidays', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/holidays', false, `Error: ${error.message}`);
  }

  // Test 7: GET /api/work-shifts
  try {
    const response = await makeRequest(`${BASE_URL}/api/work-shifts`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data;
    printResult('GET /api/work-shifts', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/work-shifts', false, `Error: ${error.message}`);
  }
}

// Tests de creación de recursos
async function testResourceCreation(token) {
  console.log('\n=== TESTING CREACIÓN DE RECURSOS ===\n');

  if (!token) {
    console.log('❌ No se puede probar creación de recursos sin token');
    return;
  }

  const unique = Date.now() + '-' + Math.floor(Math.random() * 10000);

  // Test 1: POST /api/employees
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${token}`
      },
      body: {
        firstName: 'Test',
        lastName: 'Employee',
        idNumber: `EMP-${unique}`,
        email: `employee-${unique}@test.com`,
        phone: '+1234567890',
        address: 'Test Address 123',
        position: 'Developer',
        department: 'IT',
        birthDate: '1990-01-01',
        dateJoined: new Date().toISOString().split('T')[0],
        status: 'ACTIVE'
      }
    });
    const passed = response.status === 201 && response.data && response.data.employee;
    printResult('POST /api/employees', passed, `Status: ${response.status}`);
    
    if (passed && response.data.employee) {
      return response.data.employee.id; // Retornar ID para pruebas posteriores
    }
  } catch (error) {
    printResult('POST /api/employees', false, `Error: ${error.message}`);
  }

  return null;
}

// Tests de validación de autorización
async function testAuthorizationValidation(token) {
  console.log('\n=== TESTING VALIDACIÓN DE AUTORIZACIÓN ===\n');

  if (!token) {
    console.log('❌ No se puede probar autorización sin token');
    return;
  }

  const unique = Date.now() + '-' + Math.floor(Math.random() * 10000);

  // Test 1: Intentar acceder a recurso inexistente
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees/123e4567-e89b-12d3-a456-426614174000`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 404 || response.status === 403;
    printResult('Acceso a recurso inexistente', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('Acceso a recurso inexistente', false, `Error: ${error.message}`);
  }

  // Test 2: Intentar crear empleado con datos inválidos
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${token}`
      },
      body: {
        firstName: '', // Campo requerido vacío
        lastName: '',
        idNumber: '',
        email: 'invalid-email',
        position: '',
        department: ''
      }
    });
    const passed = response.status === 400;
    printResult('Crear empleado con datos inválidos', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('Crear empleado con datos inválidos', false, `Error: ${error.message}`);
  }
}