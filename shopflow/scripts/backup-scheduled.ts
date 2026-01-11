#!/usr/bin/env tsx
/**
 * Scheduled backup script
 * Run this via cron or task scheduler for automatic backups
 * 
 * Example cron (daily at 2 AM):
 * 0 2 * * * cd /path/to/project && pnpm tsx scripts/backup-scheduled.ts
 */

import { createDatabaseBackup, listBackups, deleteBackup } from '../src/lib/services/backupService'
import { format, subDays } from 'date-fns'

const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30', 10) // Keep last 30 backups by default

async function main() {
  try {
    console.log('Starting scheduled backup...')
    
    // Create new backup
    const backup = await createDatabaseBackup()
    console.log(`Backup created: ${backup.filename} (${(backup.size / 1024 / 1024).toFixed(2)} MB)`)

    // List all backups
    const backups = await listBackups()

    // Keep only database backups (not data exports)
    const databaseBackups = backups.filter((b) => b.type === 'database')

    // Delete old backups if we exceed the limit
    if (databaseBackups.length > MAX_BACKUPS) {
      const backupsToDelete = databaseBackups.slice(MAX_BACKUPS)
      console.log(`Deleting ${backupsToDelete.length} old backup(s)...`)

      for (const backupToDelete of backupsToDelete) {
        await deleteBackup(backupToDelete.filename)
        console.log(`Deleted: ${backupToDelete.filename}`)
      }
    }

    console.log('Scheduled backup completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('Scheduled backup failed:', error)
    process.exit(1)
  }
}

main()

