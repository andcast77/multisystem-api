import { UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

// Import prisma from the lib (which handles initialization correctly)
import { prisma } from '../src/lib/prisma'

async function createSuperAdmin() {
  try {
    const password = 'superadmin'
    const hashedPassword = await bcrypt.hash(password, 10)

    const superadmin = await prisma.user.upsert({
      where: { email: 'superadmin' },
      update: {
        password: hashedPassword,
        role: UserRole.ADMIN,
        active: true,
        name: 'Super Administrator',
      },
      create: {
        email: 'superadmin',
        password: hashedPassword,
        name: 'Super Administrator',
        role: UserRole.ADMIN,
        active: true,
      },
    })

    console.log('✅ Superadmin creado exitosamente!')
    console.log('📧 Email:', superadmin.email)
    console.log('🔑 Contraseña: superadmin')
    console.log('👤 Rol:', superadmin.role)
  } catch (error) {
    console.error('❌ Error al crear superadmin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmin()

