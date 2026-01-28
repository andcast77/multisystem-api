#!/usr/bin/env node
/**
 * Script mejorado para testear los endpoints de la API
 * Uso: node scripts/test-endpoints.js [API_URL] [--verbose]
 * 
 * Opciones:
 *   API_URL: URL base de la API (default: http://localhost:3000)
 *   --verbose: Mostrar información detallada de cada test
 */

const API_URL = process.argv.find(arg => !arg.startsWith('--')) || process.env.API_URL || 'http://localhost:3000'
const VERBOSE = process.argv.includes('--verbose') || process.env.VERBOSE === 'true'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

let testsPassed = 0
let testsFailed = 0
const testResults = []

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logVerbose(message) {
  if (VERBOSE) {
    log(`     ${message}`, colors.cyan)
  }
}

async function testEndpoint(name, options = {}) {
  const {
    url,
    method = 'GET',
    expectedStatus = 200,
    validator = null,
    headers = {},
    maxDuration = null,
    description = null
  } = options

  const testStart = Date.now()
  
  try {
    const start = Date.now()
    const response = await fetch(url, {
      method,
      headers: {
        ...headers
      }
    })
    const duration = Date.now() - start
    const contentType = response.headers.get('content-type')
    
    let data = null
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch (e) {
        data = await response.text()
      }
    } else {
      data = await response.text()
    }

    // Validar status code
    if (response.status !== expectedStatus) {
      log(`  ❌ FAIL: ${name}`, colors.red)
      log(`     Expected status ${expectedStatus}, got ${response.status}`, colors.red)
      if (description) log(`     ${description}`, colors.yellow)
      logVerbose(`     URL: ${url}`)
      logVerbose(`     Method: ${method}`)
      logVerbose(`     Response: ${JSON.stringify(data).substring(0, 200)}`)
      testsFailed++
      testResults.push({ name, status: 'FAIL', duration, error: `Status ${response.status} !== ${expectedStatus}` })
      return false
    }

    // Validar tiempo de respuesta si se especifica
    if (maxDuration && duration > maxDuration) {
      log(`  ❌ FAIL: ${name}`, colors.red)
      log(`     Response time ${duration}ms exceeds maximum ${maxDuration}ms`, colors.red)
      testsFailed++
      testResults.push({ name, status: 'FAIL', duration, error: `Duration ${duration}ms > ${maxDuration}ms` })
      return false
    }

    // Validar datos si se proporciona validator
    if (validator) {
      const validationResult = validator(data, response)
      if (!validationResult) {
        log(`  ❌ FAIL: ${name}`, colors.red)
        log(`     Validation failed`, colors.red)
        if (description) log(`     ${description}`, colors.yellow)
        logVerbose(`     Response: ${JSON.stringify(data).substring(0, 200)}`)
        testsFailed++
        testResults.push({ name, status: 'FAIL', duration, error: 'Validation failed' })
        return false
      }
    }

    log(`  ✅ PASS: ${name} (${duration}ms)`, colors.green)
    if (description) log(`     ${description}`, colors.blue)
    logVerbose(`     Status: ${response.status}`)
    logVerbose(`     Content-Type: ${contentType}`)
    if (data && typeof data === 'object' && VERBOSE) {
      logVerbose(`     Response: ${JSON.stringify(data)}`)
    }
    testsPassed++
    testResults.push({ name, status: 'PASS', duration })
    return true
  } catch (error) {
    const duration = Date.now() - testStart
    log(`  ❌ FAIL: ${name}`, colors.red)
    log(`     Error: ${error.message}`, colors.red)
    if (description) log(`     ${description}`, colors.yellow)
    logVerbose(`     URL: ${url}`)
    logVerbose(`     Method: ${method}`)
    testsFailed++
    testResults.push({ name, status: 'FAIL', duration, error: error.message })
    return false
  }
}

async function testConcurrentRequests(url, count = 10) {
  log(`\n🔄 Testing concurrent requests (${count} requests)`)
  const start = Date.now()
  const requests = Array.from({ length: count }, () => fetch(url))
  
  try {
    const responses = await Promise.all(requests)
    const duration = Date.now() - start
    const allOk = responses.every(r => r.status === 200)
    
    if (allOk) {
      log(`  ✅ PASS: All ${count} concurrent requests succeeded (${duration}ms)`, colors.green)
      logVerbose(`     Average: ${(duration / count).toFixed(2)}ms per request`)
      testsPassed++
      testResults.push({ name: `Concurrent requests (${count})`, status: 'PASS', duration })
      return true
    } else {
      const failed = responses.filter(r => r.status !== 200).length
      log(`  ❌ FAIL: ${failed} out of ${count} requests failed`, colors.red)
      testsFailed++
      testResults.push({ name: `Concurrent requests (${count})`, status: 'FAIL', duration, error: `${failed} failed` })
      return false
    }
  } catch (error) {
    log(`  ❌ FAIL: Concurrent requests test failed: ${error.message}`, colors.red)
    testsFailed++
    return false
  }
}

async function runTests() {
  log(`\n🧪 Testing API endpoints at ${API_URL}`, colors.blue)
  if (VERBOSE) log(`   Verbose mode: ON`, colors.cyan)
  log('─'.repeat(60))

  // Test 1: Health endpoint - Basic
  log(`\n📋 Testing GET /health - Basic`)
  await testEndpoint('GET /health - Status 200', {
    url: `${API_URL}/health`,
    expectedStatus: 200,
    validator: (data) => data && data.status === 'ok',
    description: 'Should return { status: "ok" }'
  })

  // Test 2: Health endpoint - Performance
  log(`\n⏱️  Testing GET /health - Performance`)
  await testEndpoint('GET /health - Response time < 100ms', {
    url: `${API_URL}/health`,
    expectedStatus: 200,
    maxDuration: 100,
    validator: (data) => data && data.status === 'ok',
    description: 'Should respond quickly'
  })

  // Test 3: Health endpoint - Content-Type
  log(`\n📄 Testing GET /health - Content-Type`)
  await testEndpoint('GET /health - Content-Type JSON', {
    url: `${API_URL}/health`,
    expectedStatus: 200,
    validator: (data, response) => {
      const contentType = response.headers.get('content-type')
      return contentType && contentType.includes('application/json') && data && data.status === 'ok'
    },
    description: 'Should return JSON content type'
  })

  // Test 4: Non-existent endpoint
  log(`\n🚫 Testing GET /non-existent - 404`)
  await testEndpoint('GET /non-existent - Status 404', {
    url: `${API_URL}/non-existent`,
    expectedStatus: 404,
    description: 'Should return 404 for non-existent routes'
  })

  // Test 5: CORS - GET request with Origin
  log(`\n🌐 Testing CORS - GET with Origin header`)
  await testEndpoint('GET /health - CORS headers', {
    url: `${API_URL}/health`,
    expectedStatus: 200,
    headers: {
      'Origin': 'http://localhost:3003'
    },
    validator: (data, response) => {
      const corsHeader = response.headers.get('access-control-allow-origin')
      return corsHeader === 'http://localhost:3003' && data && data.status === 'ok'
    },
    description: 'Should include CORS headers'
  })

  // Test 6: CORS - OPTIONS preflight
  log(`\n🌐 Testing CORS - OPTIONS preflight`)
  await testEndpoint('OPTIONS /health - CORS preflight', {
    url: `${API_URL}/health`,
    method: 'OPTIONS',
    expectedStatus: 204,
    headers: {
      'Origin': 'http://localhost:3003',
      'Access-Control-Request-Method': 'GET'
    },
    validator: (data, response) => {
      const corsHeader = response.headers.get('access-control-allow-origin')
      return corsHeader === 'http://localhost:3003'
    },
    description: 'Should handle CORS preflight requests'
  })

  // Test 7: Multiple CORS origins
  log(`\n🌐 Testing CORS - Multiple origins`)
  const origins = ['http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005']
  for (const origin of origins) {
    await testEndpoint(`GET /health - CORS origin ${origin}`, {
      url: `${API_URL}/health`,
      expectedStatus: 200,
      headers: {
        'Origin': origin
      },
      validator: (data, response) => {
        const corsHeader = response.headers.get('access-control-allow-origin')
        return corsHeader === origin && data && data.status === 'ok'
      },
      description: `Should allow origin ${origin}`
    })
  }

  // Test 8: Concurrent requests
  await testConcurrentRequests(`${API_URL}/health`, 20)

  // Test 9: Invalid methods
  log(`\n🚫 Testing invalid HTTP methods`)
  await testEndpoint('POST /health - Method not allowed', {
    url: `${API_URL}/health`,
    method: 'POST',
    expectedStatus: 404,
    description: 'Should return 404 for unsupported methods'
  })

  // Summary
  log(`\n${'─'.repeat(60)}`)
  log(`\n📊 Test Summary:`, colors.blue)
  log(`   ✅ Passed: ${testsPassed}`, colors.green)
  log(`   ❌ Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.reset)
  
  const total = testsPassed + testsFailed
  const successRate = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : 0
  log(`   📈 Success rate: ${successRate}%`, colors.blue)

  // Performance summary
  if (VERBOSE && testResults.length > 0) {
    const avgDuration = testResults
      .filter(t => t.status === 'PASS')
      .reduce((sum, t) => sum + t.duration, 0) / testsPassed
    log(`\n⏱️  Performance:`, colors.cyan)
    log(`   Average response time: ${avgDuration.toFixed(2)}ms`, colors.cyan)
    const slowest = testResults
      .filter(t => t.status === 'PASS')
      .sort((a, b) => b.duration - a.duration)[0]
    if (slowest) {
      log(`   Slowest test: ${slowest.name} (${slowest.duration}ms)`, colors.cyan)
    }
  }
  
  if (testsFailed > 0) {
    log(`\n⚠️  Some tests failed. Please check the API server.`, colors.red)
    log(`   Make sure the server is running at ${API_URL}`, colors.yellow)
    process.exit(1)
  } else {
    log(`\n🎉 All tests passed!`, colors.green)
    process.exit(0)
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  log('❌ Error: fetch is not available. Please use Node.js 18+ or install node-fetch', colors.red)
  process.exit(1)
}

runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, colors.red)
  console.error(error)
  process.exit(1)
})
