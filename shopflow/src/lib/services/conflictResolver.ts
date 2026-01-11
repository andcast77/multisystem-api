/**
 * Conflict Resolver Service
 * Detects and resolves conflicts between local and server data
 */

export type ConflictResolutionStrategy = 'last-write-wins' | 'merge' | 'manual' | 'server-wins' | 'client-wins'

export interface Conflict<T = unknown> {
  id: string
  type: 'product' | 'category' | 'customer' | 'supplier'
  local: T
  server: T
  localModifiedAt: number
  serverModifiedAt: number
  strategy: ConflictResolutionStrategy
}

export interface ConflictResolutionResult<T = unknown> {
  resolved: T
  strategy: ConflictResolutionStrategy
  merged?: boolean
}

class ConflictResolver {
  /**
   * Detect if there's a conflict between local and server data
   */
  detectConflict<T extends { id: string; updatedAt: string; lastSyncedAt?: number; localModifiedAt?: number }>(
    local: T,
    server: T & { updatedAt: string | Date }
  ): boolean {
    // No conflict if local was never modified
    if (!local.localModifiedAt) {
      return false
    }

    // No conflict if server wasn't modified since last sync
    // Convert server.updatedAt to timestamp
    const serverUpdatedAtValue: string | Date = server.updatedAt
    const serverUpdatedAt: number = typeof serverUpdatedAtValue === 'string'
      ? new Date(serverUpdatedAtValue).getTime()
      : serverUpdatedAtValue.getTime()
    
    const lastSyncedAt = local.lastSyncedAt || 0

    // Conflict if both were modified after last sync
    return local.localModifiedAt > lastSyncedAt && serverUpdatedAt > lastSyncedAt
  }

  /**
   * Resolve conflict using specified strategy
   */
  resolveConflict<T extends { id: string; updatedAt: string }>(
    conflict: Conflict<T>,
    strategy?: ConflictResolutionStrategy
  ): ConflictResolutionResult<T> {
    const resolutionStrategy = strategy || conflict.strategy || 'last-write-wins'

    switch (resolutionStrategy) {
      case 'last-write-wins':
        return this.resolveLastWriteWins(conflict)
      
      case 'server-wins':
        return {
          resolved: conflict.server,
          strategy: 'server-wins',
        }
      
      case 'client-wins':
        return {
          resolved: conflict.local,
          strategy: 'client-wins',
        }
      
      case 'merge':
        return this.resolveMerge(conflict)
      
      case 'manual':
        // Manual resolution requires UI - return local as default
        return {
          resolved: conflict.local,
          strategy: 'manual',
        }
      
      default:
        return this.resolveLastWriteWins(conflict)
    }
  }

  /**
   * Last write wins: Use the version with the most recent updatedAt
   */
  private resolveLastWriteWins<T extends { id: string; updatedAt: string }>(
    conflict: Conflict<T>
  ): ConflictResolutionResult<T> {
    const localTime = new Date(conflict.local.updatedAt).getTime()
    const serverTime = new Date(conflict.server.updatedAt).getTime()

    if (serverTime > localTime) {
      return {
        resolved: conflict.server,
        strategy: 'last-write-wins',
      }
    }

    return {
      resolved: conflict.local,
      strategy: 'last-write-wins',
    }
  }

  /**
   * Merge: Combine non-conflicting fields, handle stock conflicts specially
   */
  private resolveMerge<T extends { id: string; updatedAt: string }>(
    conflict: Conflict<T>
  ): ConflictResolutionResult<T> {
    // Special handling for product stock conflicts
    if (conflict.type === 'product') {
      const local = conflict.local as { stock?: number; lastSyncedAt?: number; lastSyncedStock?: number }
      const server = conflict.server as { stock?: number; updatedAt: string }
      
      if (local.stock !== undefined && server.stock !== undefined && local.stock !== server.stock) {
        // Try to get last synced version from local (if available)
        const lastSyncedStock = local.lastSyncedStock
        
        // Resolve stock conflict - ensure stock is defined before calling
        const resolvedStock = this.resolveStockConflict(
          { stock: local.stock, lastSyncedAt: local.lastSyncedAt },
          { stock: server.stock, updatedAt: server.updatedAt },
          lastSyncedStock !== undefined ? { stock: lastSyncedStock } : undefined
        )
        
        // Merge other fields, use server as base
        const merged = { ...conflict.server, ...conflict.local, stock: resolvedStock } as T
        
        // Use server's updatedAt if it's newer
        const localTime = new Date(conflict.local.updatedAt).getTime()
        const serverTime = new Date(conflict.server.updatedAt).getTime()
        
        if (serverTime > localTime) {
          merged.updatedAt = conflict.server.updatedAt
        }

        return {
          resolved: merged,
          strategy: 'merge',
          merged: true,
        }
      }
    }
    
    // For other cases, use server as base and add local fields that don't conflict
    const merged = { ...conflict.server, ...conflict.local }
    
    // Use server's updatedAt if it's newer
    const localTime = new Date(conflict.local.updatedAt).getTime()
    const serverTime = new Date(conflict.server.updatedAt).getTime()
    
    if (serverTime > localTime) {
      merged.updatedAt = conflict.server.updatedAt
    }

    return {
      resolved: merged as T,
      strategy: 'merge',
      merged: true,
    }
  }

  /**
   * Resolve stock conflict using difference calculation
   * This handles cases where stock changes happened on both local and server
   */
  resolveStockConflict(
    local: { stock: number; lastSyncedAt?: number },
    server: { stock: number; updatedAt: string },
    lastSynced?: { stock: number }
  ): number {
    // If we have last synced stock, calculate differences
    if (lastSynced && lastSynced.stock !== undefined) {
      const localDiff = local.stock - lastSynced.stock
      const serverDiff = server.stock - lastSynced.stock
      
      // If both changed in the same direction, use the larger change
      if (localDiff > 0 && serverDiff > 0) {
        return lastSynced.stock + Math.max(localDiff, serverDiff)
      }
      if (localDiff < 0 && serverDiff < 0) {
        return lastSynced.stock + Math.min(localDiff, serverDiff)
      }
      
      // If changes are in opposite directions, sum them (one added, one subtracted)
      return lastSynced.stock + localDiff + serverDiff
    }
    
    // No last synced data, use last-write-wins
    const localTime = local.lastSyncedAt || 0
    const serverTime = new Date(server.updatedAt).getTime()
    
    return serverTime > localTime ? server.stock : local.stock
  }

  /**
   * Determine appropriate strategy based on entity type and conflict severity
   */
  getDefaultStrategy(
    type: 'product' | 'category' | 'customer' | 'supplier',
    conflict: Conflict
  ): ConflictResolutionStrategy {
    // Critical entities (products with stock changes) might need manual resolution
    if (type === 'product') {
      const local = conflict.local as { stock?: number }
      const server = conflict.server as { stock?: number }
      
      // If stock changed in both, use merge strategy to calculate difference
      if (local.stock !== undefined && server.stock !== undefined && local.stock !== server.stock) {
        // Check if other fields also changed - if only stock changed, we can auto-resolve
        const localKeys = Object.keys(local).filter(k => k !== 'stock' && k !== 'lastSyncedAt' && k !== 'localModifiedAt' && k !== 'updatedAt' && k !== 'lastSyncedStock')
        const hasOtherChanges = localKeys.some(key => {
          const localVal = (local as Record<string, unknown>)[key]
          const serverVal = (server as Record<string, unknown>)[key]
          return localVal !== serverVal
        })
        
        // If only stock changed, use merge strategy (auto-resolve)
        // If other fields changed too, require manual resolution
        return hasOtherChanges ? 'manual' : 'merge'
      }
    }

    // Default: last write wins
    return 'last-write-wins'
  }

  /**
   * Check if conflict requires manual resolution
   */
  requiresManualResolution(conflict: Conflict): boolean {
    return conflict.strategy === 'manual' || this.getDefaultStrategy(conflict.type, conflict) === 'manual'
  }
}

export const conflictResolver = new ConflictResolver()
