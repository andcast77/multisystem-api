import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

const execAsync = promisify(exec)

const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), 'backups')

export interface BackupMetadata {
  id: string
  filename: string
  createdAt: Date
  size: number
  type: 'database' | 'data_export'
  format: 'sql' | 'json' | 'csv'
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await access(BACKUP_DIR)
  } catch {
    await mkdir(BACKUP_DIR, { recursive: true })
  }
}

/**
 * Create a PostgreSQL database backup using pg_dump
 */
export async function createDatabaseBackup(): Promise<BackupMetadata> {
  await ensureBackupDir()

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL not configured')
  }

  // Parse connection string
  const url = new URL(connectionString)
  const dbName = url.pathname.slice(1) // Remove leading /
  const dbUser = url.username
  const dbHost = url.hostname
  const dbPort = url.port || '5432'
  const dbPassword = url.password

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
  const filename = `backup_${timestamp}.sql`
  const filepath = join(BACKUP_DIR, filename)

  // Set PGPASSWORD environment variable for pg_dump
  const env = { ...process.env, PGPASSWORD: dbPassword }

  try {
    // Use pg_dump to create backup
    const { stderr } = await execAsync(
      `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${filepath}"`,
      { env }
    )

    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`pg_dump error: ${stderr}`)
    }

    // Get file size
    const stats = await import('fs/promises').then((fs) => fs.stat(filepath))
    const size = stats.size

    return {
      id: timestamp,
      filename,
      createdAt: new Date(),
      size,
      type: 'database',
      format: 'sql',
    }
  } catch (error) {
    throw new Error(`Failed to create database backup: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Restore database from backup file
 */
export async function restoreDatabaseBackup(filename: string): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL not configured')
  }

  const filepath = join(BACKUP_DIR, filename)

  // Verify file exists
  try {
    await access(filepath)
  } catch {
    throw new Error(`Backup file not found: ${filename}`)
  }

  // Parse connection string
  const url = new URL(connectionString)
  const dbName = url.pathname.slice(1)
  const dbUser = url.username
  const dbHost = url.hostname
  const dbPort = url.port || '5432'
  const dbPassword = url.password

  const env = { ...process.env, PGPASSWORD: dbPassword }

  try {
    // Drop and recreate database (destructive operation!)
    // In production, you might want to restore to a temporary database first
    await execAsync(
      `pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists "${filepath}"`,
      { env }
    )
  } catch (error) {
    throw new Error(`Failed to restore database: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Export all data to JSON format
 */
export async function exportDataToJson(): Promise<BackupMetadata> {
  await ensureBackupDir()

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
  const filename = `data_export_${timestamp}.json`
  const filepath = join(BACKUP_DIR, filename)

  // Export all data
  const data = {
    users: await prisma.user.findMany({
      include: {
        sales: false,
        actionHistory: false,
        sessions: false,
        notifications: false,
        notificationPreferences: true,
        pushSubscriptions: false, // Don't export push subscriptions
      },
    }),
    products: await prisma.product.findMany({
      include: {
        category: true,
        supplier: true,
      },
    }),
    categories: await prisma.category.findMany(),
    suppliers: await prisma.supplier.findMany(),
    customers: await prisma.customer.findMany(),
    sales: await prisma.sale.findMany({
      include: {
        items: true,
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    storeConfig: await prisma.storeConfig.findMany(),
    loyaltyConfig: await prisma.loyaltyConfig.findMany(),
    loyaltyPoints: await prisma.loyaltyPoint.findMany(),
    actionHistory: await prisma.actionHistory.findMany({
      take: 10000, // Limit to last 10k actions
      orderBy: { createdAt: 'desc' },
    }),
  }

  const jsonData = JSON.stringify(data, null, 2)
  await writeFile(filepath, jsonData, 'utf-8')

  const stats = await import('fs/promises').then((fs) => fs.stat(filepath))
  const size = stats.size

  return {
    id: timestamp,
    filename,
    createdAt: new Date(),
    size,
    type: 'data_export',
    format: 'json',
  }
}

/**
 * Export specific table to CSV
 */
export async function exportTableToCsv(tableName: string): Promise<BackupMetadata> {
  await ensureBackupDir()

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
  const filename = `export_${tableName}_${timestamp}.csv`
  const filepath = join(BACKUP_DIR, filename)

  // Map table names to Prisma models
  let data: unknown[] = []
  let headers: string[] = []

  switch (tableName) {
    case 'products':
      data = await prisma.product.findMany({
        include: { category: true, supplier: true },
      })
      headers = ['id', 'name', 'sku', 'barcode', 'price', 'cost', 'stock', 'minStock', 'category', 'supplier', 'active']
      break
    case 'sales':
      data = await prisma.sale.findMany({
        include: { customer: true, user: { select: { name: true, email: true } } },
      })
      headers = ['id', 'invoiceNumber', 'customer', 'user', 'status', 'subtotal', 'tax', 'discount', 'total', 'createdAt']
      break
    case 'customers':
      data = await prisma.customer.findMany()
      headers = ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'country', 'createdAt']
      break
    default:
      throw new Error(`Unsupported table: ${tableName}`)
  }

  // Convert to CSV
  const csvRows: string[] = []
  
  // Add headers
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = (row as Record<string, unknown>)[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') {
        return JSON.stringify(value).replace(/"/g, '""')
      }
      return String(value).replace(/"/g, '""').replace(/,/g, ';')
    })
    csvRows.push(`"${values.join('","')}"`)
  }

  const csvContent = csvRows.join('\n')
  await writeFile(filepath, csvContent, 'utf-8')

  const stats = await import('fs/promises').then((fs) => fs.stat(filepath))
  const size = stats.size

  return {
    id: timestamp,
    filename,
    createdAt: new Date(),
    size,
    type: 'data_export',
    format: 'csv',
  }
}

/**
 * List all backup files
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  await ensureBackupDir()

  const { readdir, stat } = await import('fs/promises')
  const files = await readdir(BACKUP_DIR)

  const backups: BackupMetadata[] = []

  for (const file of files) {
    if (file.endsWith('.sql') || file.endsWith('.json') || file.endsWith('.csv')) {
      const filepath = join(BACKUP_DIR, file)
      const stats = await stat(filepath)
      
      const type = file.startsWith('backup_') ? 'database' : 'data_export'
      const format = file.endsWith('.sql') ? 'sql' : file.endsWith('.json') ? 'json' : 'csv'
      const id = file.replace(/\.(sql|json|csv)$/, '').split('_').pop() || ''

      backups.push({
        id,
        filename: file,
        createdAt: stats.birthtime,
        size: stats.size,
        type,
        format,
      })
    }
  }

  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Delete a backup file
 */
export async function deleteBackup(filename: string): Promise<void> {
  const filepath = join(BACKUP_DIR, filename)
  const { unlink } = await import('fs/promises')
  
  try {
    await unlink(filepath)
  } catch (error) {
    throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`)
  }
}

