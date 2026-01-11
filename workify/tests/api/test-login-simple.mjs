import https from 'https';
import http from 'http';

const BASE_URL = 'http://localhost:3003';

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
        'User-Agent': 'Test-Login-Simple/1.0',
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

async function testLoginSimple() {
  console.log('🔐 Probando login simple sin safeHandler...\n');

  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/login-simple`, { 
      method: 'POST',
      body: {
        email: 'admin@techcorp.com',
        password: 'admin123'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data?.token) {
      console.log('\n✅ Login exitoso! Token obtenido.');
      return response.data.token;
    } else {
      console.log('\n❌ Login falló.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  return null;
}

testLoginSimple(); 