import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'

// Create a test database URL
const generateDatabaseURL = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  // For tests, use a separate test database
  return process.env.DATABASE_URL.replace(/\.db$/, '.test.db')
}

const prismaBinary = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'prisma')

export const setupTestDatabase = async () => {
  const databaseUrl = generateDatabaseURL()
  process.env.DATABASE_URL = databaseUrl

  // Run migrations on test database
  execSync(`${prismaBinary} migrate deploy`, {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  })

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

  return prisma
}

export const cleanupTestDatabase = async (prisma: PrismaClient) => {
  // Clean up all tables
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()
  await prisma.storeConfig.deleteMany()
  
  await prisma.$disconnect()
}

