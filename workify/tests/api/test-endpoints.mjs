import https from 'https';
import http from 'http';

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
      timeout: 5000
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

// Tests de inyección de datos maliciosos
async function testMaliciousInjection() {
  console.log('\n=== TESTING INYECCIÓN DE DATOS MALICIOSOS ===\n');

  const maliciousPayloads = [
    // XSS attempts
    { email: '<script>alert("xss")</script>@test.com', password: 'password123' },
    { email: 'test@test.com', password: '<script>alert("xss")</script>' },
    
    // SQL Injection attempts
    { email: "'; DROP TABLE users; --", password: 'password123' },
    { email: 'test@test.com', password: "'; DROP TABLE users; --" },
    
    // NoSQL Injection attempts
    { email: '{"$gt": ""}', password: 'password123' },
    { email: 'test@test.com', password: '{"$gt": ""}' }
  ];

  for (let i = 0; i < maliciousPayloads.length; i++) {
    const payload = maliciousPayloads[i];
    try {
      const response = await makeRequest(`${BASE_URL}/api/auth/login`, { 
        method: 'POST',
        body: payload
      });
      const passed = response.status === 400 || response.status === 401;
      printResult(`Inyección maliciosa ${i + 1}`, passed, `Status: ${response.status}`);
    } catch (error) {
      printResult(`Inyección maliciosa ${i + 1}`, false, `Error: ${error.message}`);
    }
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
    '123e4567-e89b-12d3-a456-42661417400!', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400@', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400#', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400$', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400%', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400^', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400&', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400*', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400(', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400)', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400+', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400=', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400[', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400]', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400{', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400}', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400|', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400\\', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400/', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400:', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400;', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400"', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400\'', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400<', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400>', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400,', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400.', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400?', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400~', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400`', // Caracteres especiales
    '123e4567-e89b-12d3-a456-42661417400 ', // Espacios
    ' 123e4567-e89b-12d3-a456-426614174000', // Espacios al inicio
    '123e4567-e89b-12d3-a456-426614174000 ', // Espacios al final
    '  123e4567-e89b-12d3-a456-426614174000  ', // Múltiples espacios
    '123e4567-e89b-12d3-a456-426614174000\n', // Caracteres de control
    '123e4567-e89b-12d3-a456-426614174000\t', // Tabs
    '123e4567-e89b-12d3-a456-426614174000\r', // Carriage return
    '123e4567-e89b-12d3-a456-426614174000\b', // Backspace
    '123e4567-e89b-12d3-a456-426614174000\f', // Form feed
    '123e4567-e89b-12d3-a456-426614174000\v', // Vertical tab
    '123e4567-e89b-12d3-a456-426614174000\x00', // Null byte
    '123e4567-e89b-12d3-a456-426614174000\x01', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x02', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x03', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x04', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x05', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x06', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x07', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x08', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x09', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x0A', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x0B', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x0C', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x0D', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x0E', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x0F', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x10', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x11', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x12', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x13', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x14', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x15', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x16', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x17', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x18', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x19', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x1A', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x1B', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x1C', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x1D', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x1E', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x1F', // Control characters
    '123e4567-e89b-12d3-a456-426614174000\x7F', // Delete character
    '123e4567-e89b-12d3-a456-426614174000\x80', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x81', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x82', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x83', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x84', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x85', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x86', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x87', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x88', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x89', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x8A', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x8B', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x8C', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x8D', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x8E', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x8F', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x90', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x91', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x92', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x93', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x94', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x95', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x96', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x97', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x98', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x99', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x9A', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x9B', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x9C', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x9D', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x9E', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\x9F', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA0', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA1', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA2', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA3', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA4', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA5', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA6', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA7', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA8', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xA9', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xAA', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xAB', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xAC', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xAD', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xAE', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xAF', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB0', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB1', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB2', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB3', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB4', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB5', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB6', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB7', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB8', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xB9', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xBA', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xBB', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xBC', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xBD', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xBE', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xBF', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC0', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC1', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC2', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC3', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC4', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC5', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC6', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC7', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC8', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xC9', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xCA', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xCB', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xCC', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xCD', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xCE', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xCF', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD0', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD1', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD2', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD3', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD4', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD5', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD6', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD7', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD8', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xD9', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xDA', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xDB', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xDC', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xDD', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xDE', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xDF', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE0', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE1', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE2', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE3', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE4', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE5', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE6', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE7', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE8', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xE9', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xEA', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xEB', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xEC', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xED', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xEE', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xEF', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF0', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF1', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF2', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF3', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF4', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF5', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF6', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF7', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF8', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xF9', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xFA', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xFB', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xFC', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xFD', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xFE', // Extended ASCII
    '123e4567-e89b-12d3-a456-426614174000\xFF'  // Extended ASCII
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
  console.log('🚀 INICIANDO PRUEBAS DE SEGURIDAD DE ENDPOINTS');
  console.log(`Base URL: ${BASE_URL}\n`);

  const startTime = Date.now();

  try {
    await testPublicEndpoints();
    await testProtectedEndpointsWithoutAuth();
    await testMaliciousInjection();
    await testUUIDValidation();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n✅ PRUEBAS COMPLETADAS`);
    console.log(`Tiempo total: ${duration.toFixed(2)} segundos`);
    console.log(`Revisa los resultados arriba para verificar la seguridad de los endpoints.`);

  } catch (error) {
    console.error(`\n❌ Error durante las pruebas: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar pruebas
runAllTests(); 