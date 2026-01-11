// Simple script to check if users exist in database
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany()
    console.log('Usuarios encontrados:', users.length)
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role})`)
    })
    
    if (users.length === 0) {
      console.log('\n⚠️  No hay usuarios en la base de datos.')
      console.log('Ejecuta: pnpm db:seed para crear usuarios iniciales')
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()

