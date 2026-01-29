// Script simple para probar la API localmente
const testUrl = process.argv[2] || 'http://localhost:3000'

async function testEndpoint(name, url) {
  try {
    console.log(`\n🧪 Probando ${name}...`)
    console.log(`   URL: ${url}`)
    
    const response = await fetch(url)
    const data = await response.json()
    
    console.log(`   ✅ Status: ${response.status}`)
    console.log(`   📦 Response:`, JSON.stringify(data, null, 2))
  } catch (error) {
    console.log(`   ❌ Error:`, error.message)
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de API...')
  console.log(`📍 Base URL: ${testUrl}`)
  
  await testEndpoint('Health Check', `${testUrl}/health`)
  await testEndpoint('Users', `${testUrl}/api/users`)
  
  console.log('\n✅ Pruebas completadas')
}

runTests()
