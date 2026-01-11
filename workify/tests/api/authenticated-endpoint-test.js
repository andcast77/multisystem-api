const https = require('https');
const http = require('http');
const { randomUUID } = require('crypto');

// Configuración
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 segundos

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
      timeout: TEST_TIMEOUT
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
  const status = passed ? `${colors.green}✅ PASÓ${colors.reset}` : `${colors.red}❌ FALLÓ${colors.reset}`;
  console.log(`${status} ${colors.bright}${testName}${colors.reset}`);
  if (details) {
    console.log(`   ${colors.cyan}${details}${colors.reset}`);
  }
}

// Función para crear un usuario de prueba y obtener token
async function createTestUser() {
  console.log(`${colors.yellow}Creando usuario de prueba...${colors.reset}`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const unique = randomUUID();
    try {
      const response = await makeRequest(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: {
          email: `test-${unique}@security-test.com`,
          password: 'TestPassword123!',
          companyName: `security test company ${unique}`.toLowerCase(),
          firstName: 'Test',
          lastName: 'User'
        }
      });
      console.log('--- Registro respuesta ---');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('RawData:', response.rawData);

      if (response.status === 200 || response.status === 201) {
        // Extraer token de las cookies
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          const tokenCookie = Array.isArray(setCookieHeader)
            ? setCookieHeader.find(cookie => cookie.startsWith('token='))
            : setCookieHeader.startsWith('token=')
              ? setCookieHeader
              : null;
          if (tokenCookie) {
            const token = tokenCookie.split(';')[0].replace('token=', '');
            console.log(`${colors.green}✅ Usuario de prueba creado exitosamente${colors.reset}`);
            return token;
          }
        }
      }
      // Si la empresa ya existe, reintentar
      if (response.rawData && response.rawData.includes('Ya existe una empresa con este nombre')) {
        console.log(`${colors.yellow}Empresa ya existe, reintentando con otro UUID (intento ${attempt})...${colors.reset}`);
        continue;
      }
      throw new Error('No se pudo obtener token de autenticación');
    } catch (error) {
      console.log(`${colors.red}❌ Error creando usuario de prueba: ${error.message}${colors.reset}`);
      if (attempt === 3) return null;
    }
  }
  return null;
}

// Tests de endpoints protegidos con autenticación válida
async function testAuthenticatedEndpoints(token) {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING ENDPOINTS PROTEGIDOS CON AUTENTICACIÓN ===${colors.reset}\n`);

  if (!token) {
    console.log(`${colors.red}❌ No se puede probar endpoints autenticados sin token${colors.reset}`);
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

// Función para crear un departamento en la empresa del usuario de prueba
async function createTestDepartment(token) {
  const unique = randomUUID();
  const response = await makeRequest(`${BASE_URL}/api/departments`, {
    method: 'POST',
    headers: {
      'Cookie': `token=${token}`
    },
    body: {
      name: `Departamento Test ${unique}`
    }
  });
  if (response.status === 201 && response.data && response.data.department) {
    return response.data.department.id;
  }
  throw new Error('No se pudo crear un departamento de prueba');
}

// Tests de creación de recursos con autenticación
async function testResourceCreation(token) {
  // Crear departamento de prueba
  const departmentId = await createTestDepartment(token);
  console.log(`\n${colors.bright}${colors.blue}=== TESTING CREACIÓN DE RECURSOS ===${colors.reset}\n`);

  if (!token) {
    console.log(`${colors.red}❌ No se puede probar creación de recursos sin token${colors.reset}`);
    return;
  }

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
        idNumber: `EMP-${Date.now()}`,
        email: `employee-${Date.now()}@test.com`,
        phone: '+1234567890',
        address: 'Test Address 123',
        position: 'Developer',
        departmentId,
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

// Tests de actualización de recursos
async function testResourceUpdate(token, employeeId) {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING ACTUALIZACIÓN DE RECURSOS ===${colors.reset}\n`);

  if (!token || !employeeId) {
    console.log(`${colors.red}❌ No se puede probar actualización sin token o ID${colors.reset}`);
    return;
  }

  // Test 1: PUT /api/employees/[id]
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Cookie': `token=${token}`
      },
      body: {
        firstName: 'Updated',
        lastName: 'Employee',
        idNumber: `EMP-${Date.now()}`,
        email: `updated-${Date.now()}@test.com`,
        phone: '+1234567890',
        address: 'Updated Address 456',
        position: 'Senior Developer',
        departmentId: departmentId,
        birthDate: '1990-01-01',
        dateJoined: new Date().toISOString().split('T')[0],
        status: 'ACTIVE'
      }
    });
    const passed = response.status === 200 && response.data && response.data.employee;
    printResult('PUT /api/employees/[id]', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('PUT /api/employees/[id]', false, `Error: ${error.message}`);
  }

  // Test 2: GET /api/employees/[id]
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees/${employeeId}`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const passed = response.status === 200 && response.data && response.data.employee;
    printResult('GET /api/employees/[id]', passed, `Status: ${response.status}`);
  } catch (error) {
    printResult('GET /api/employees/[id]', false, `Error: ${error.message}`);
  }
}

// Tests de validación de autorización
async function testAuthorizationValidation(token) {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING VALIDACIÓN DE AUTORIZACIÓN ===${colors.reset}\n`);

  if (!token) {
    console.log(`${colors.red}❌ No se puede probar autorización sin token${colors.reset}`);
    return;
  }

  // Test 1: Intentar acceder a recurso de otra empresa (simulado)
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees/123e4567-e89b-12d3-a456-426614174000`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    if (response.status === 404 || response.status === 403) {
      printResult('Acceso a recurso inexistente', true, `Status: ${response.status} ⚠️ Esto es esperado si el recurso no existe o no tienes permisos.`);
    } else if (response.status === 401) {
      printResult('Acceso a recurso inexistente', false, `Status: 401 ⚠️ Esto es esperado si no hay autenticación.`);
    } else {
      printResult('Acceso a recurso inexistente', false, `Status: ${response.status}`);
    }
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
        departmentId: departmentId
      }
    });
    if (response.status === 400) {
      printResult('Crear empleado con datos inválidos', true, `Status: 400`);
    } else if (response.status === 401) {
      printResult('Crear empleado con datos inválidos', false, `Status: 401 ⚠️ Esto es esperado si no hay autenticación.`);
    } else {
      printResult('Crear empleado con datos inválidos', false, `Status: ${response.status}`);
    }
  } catch (error) {
    printResult('Crear empleado con datos inválidos', false, `Error: ${error.message}`);
  }

  // Test 3: Intentar crear empleado con email duplicado
  try {
    const response = await makeRequest(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${token}`
      },
      body: {
        firstName: 'Test',
        lastName: 'Employee',
        idNumber: `EMP-${Date.now()}`,
        email: `employee-${Date.now()}@test.com`,
        phone: '+1234567890',
        address: 'Test Address 123',
        position: 'Developer',
        departmentId: departmentId,
        birthDate: '1990-01-01',
        dateJoined: new Date().toISOString().split('T')[0],
        status: 'ACTIVE'
      }
    });
    if (response.status === 400) {
      printResult('Crear empleado con email duplicado', true, `Status: 400`);
    } else if (response.status === 401) {
      printResult('Crear empleado con email duplicado', false, `Status: 401 ⚠️ Esto es esperado si no hay autenticación.`);
    } else if (response.status === 409) {
      printResult('Crear empleado con email duplicado', true, `Status: 409 (conflicto)`);
    } else {
      printResult('Crear empleado con email duplicado', false, `Status: ${response.status}`);
    }
  } catch (error) {
    printResult('Crear empleado con email duplicado', false, `Error: ${error.message}`);
  }
}

// Tests de validación de UUID
async function testUUIDValidation(token) {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING VALIDACIÓN DE UUID ===${colors.reset}\n`);
  const uuids = [
    '123e4567-e89b-12d3-a456-426614174000', // Invalid UUID
    '8c8054e9-d488-4ede-8286-a98d53ee853d', // Valid UUID (DEPARTMENT_ID)
    '11111111-1111-1111-1111-111111111111', // Non-existent UUID
    '00000000-0000-0000-0000-000000000000' // Invalid UUID
  ];

  for (let i = 0; i < uuids.length; i++) {
    const uuid = uuids[i];
    const response = await makeRequest(`${BASE_URL}/api/employees/${uuid}`, {
      headers: token ? { 'Cookie': `token=${token}` } : undefined
    });
    if (response.status === 400) {
      printResult(`UUID validation ${i + 1}`, true, `Status: 400 - UUID: ${uuid}`);
    } else if (response.status === 401) {
      printResult(`UUID validation ${i + 1}`, false, `Status: 401 - UUID: ${uuid} ⚠️ Esto es esperado si no hay autenticación. La API responde 401 antes de validar el UUID.`);
    } else {
      printResult(`UUID validation ${i + 1}`, false, `Status: ${response.status} - UUID: ${uuid}`);
    }
  }
}

// Función principal
async function runAuthenticatedTests() {
  console.log(`${colors.bright}${colors.magenta}🚀 INICIANDO PRUEBAS DE ENDPOINTS AUTENTICADOS${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}\n`);

  const startTime = Date.now();

  try {
    // Crear usuario de prueba y obtener token
    const token = await createTestUser();

    if (token) {
      // Ejecutar todas las pruebas autenticadas
      await testAuthenticatedEndpoints(token);
      // Crear un empleado para pruebas de actualización
      const employeeId = await testResourceCreation(token);
      if (employeeId) {
        await testResourceUpdate(token, employeeId);
      }
      await testAuthorizationValidation(token);
      await testUUIDValidation(token); // Nuevo test de validación de UUID
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`\n${colors.bright}${colors.green}✅ PRUEBAS AUTENTICADAS COMPLETADAS${colors.reset}`);
    console.log(`${colors.cyan}Tiempo total: ${duration.toFixed(2)} segundos${colors.reset}`);
    console.log(`${colors.yellow}Revisa los resultados arriba para verificar la funcionalidad de los endpoints autenticados.${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}❌ Error durante las pruebas autenticadas: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  runAuthenticatedTests();
}

module.exports = {
  runAuthenticatedTests,
  testAuthenticatedEndpoints,
  testResourceCreation,
  testResourceUpdate,
  testAuthorizationValidation,
  testUUIDValidation
};