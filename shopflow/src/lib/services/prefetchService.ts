/**
 * Prefetch Service
 * Intelligently prefetches data when online to improve offline experience
 */

import { offlineStorage } from './offlineStorage'

export interface PrefetchConfig {
  enabled: boolean
  maxConcurrent: number
  prefetchInterval: number // minutes
  dataTypes: {
    products: boolean
    categories: boolean
    customers: boolean
    suppliers: boolean
  }
  userBehavior: {
    enablePatternAnalysis: boolean
    prefetchRecentItems: boolean
    prefetchFrequentlyUsed: boolean
  }
}

export interface UserPattern {
  frequentlyViewedProducts: string[]
  frequentlyViewedCustomers: string[]
  frequentlyViewedCategories: string[]
  lastViewedItems: Array<{ type: string; id: string; timestamp: number }>
  usagePatterns: {
    timeOfDay: number[]
    dayOfWeek: number[]
    sessionDuration: number[]
  }
}

class PrefetchService {
  private config: PrefetchConfig = {
    enabled: true,
    maxConcurrent: 3,
    prefetchInterval: 30, // 30 minutes
    dataTypes: {
      products: true,
      categories: true,
      customers: true,
      suppliers: true,
    },
    userBehavior: {
      enablePatternAnalysis: true,
      prefetchRecentItems: true,
      prefetchFrequentlyUsed: true,
    },
  }

  private isPrefetching = false
  private userPatterns: UserPattern = {
    frequentlyViewedProducts: [],
    frequentlyViewedCustomers: [],
    frequentlyViewedCategories: [],
    lastViewedItems: [],
    usagePatterns: {
      timeOfDay: [],
      dayOfWeek: [],
      sessionDuration: [],
    },
  }

  private prefetchInterval: number | null = null

  /**
   * Start prefetching service
   */
  start(): void {
    if (!this.config.enabled) return

    this.loadUserPatterns()
    this.startPeriodicPrefetch()
  }

  /**
   * Stop prefetching service
   */
  stop(): void {
    if (this.prefetchInterval) {
      clearInterval(this.prefetchInterval)
      this.prefetchInterval = null
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PrefetchConfig>): void {
    this.config = { ...this.config, ...config }
    if (this.config.enabled) {
      this.start()
    } else {
      this.stop()
    }
  }

  /**
   * Start periodic prefetching
   */
  private startPeriodicPrefetch(): void {
    if (this.prefetchInterval) {
      clearInterval(this.prefetchInterval)
    }

    this.prefetchInterval = window.setInterval(() => {
      this.performPrefetch()
    }, this.config.prefetchInterval * 60 * 1000) // Convert minutes to milliseconds

    // Initial prefetch after a delay
    setTimeout(() => this.performPrefetch(), 10000) // 10 seconds after start
  }

  /**
   * Perform intelligent prefetching
   */
  private async performPrefetch(): Promise<void> {
    if (this.isPrefetching || !navigator.onLine) {
      return
    }

    this.isPrefetching = true

    try {
      // Only prefetch if we have idle time and good connection
      if (document.visibilityState === 'visible') {
        // User is active, be more conservative
        await this.prefetchCriticalData()
      } else {
        // User is inactive, can prefetch more aggressively
        await this.prefetchBasedOnPatterns()
      }
    } catch (error) {
      console.warn('Prefetch failed:', error)
    } finally {
      this.isPrefetching = false
    }
  }

  /**
   * Prefetch critical data that's always needed
   */
  private async prefetchCriticalData(): Promise<void> {
    const promises: Promise<void>[] = []

    if (this.config.dataTypes.categories) {
      promises.push(this.prefetchCategories())
    }

    if (this.config.dataTypes.suppliers) {
      promises.push(this.prefetchSuppliers())
    }

    // Limit concurrent requests
    await this.executeWithConcurrencyLimit(promises)
  }

  /**
   * Prefetch based on user behavior patterns
   */
  private async prefetchBasedOnPatterns(): Promise<void> {
    const promises: Promise<void>[] = []

    if (this.config.userBehavior.prefetchRecentItems) {
      promises.push(...this.prefetchRecentItems())
    }

    if (this.config.userBehavior.prefetchFrequentlyUsed) {
      promises.push(...this.prefetchFrequentlyUsed())
    }

    if (this.config.userBehavior.enablePatternAnalysis) {
      promises.push(...this.prefetchPredictedItems())
    }

    // Limit concurrent requests
    await this.executeWithConcurrencyLimit(promises)
  }

  /**
   * Prefetch recently viewed items
   */
  private prefetchRecentItems(): Promise<void>[] {
    const promises: Promise<void>[] = []
    const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days

    const recentItems = this.userPatterns.lastViewedItems.filter(
      item => item.timestamp > recentThreshold
    )

    for (const item of recentItems.slice(0, 10)) { // Limit to 10 most recent
      switch (item.type) {
        case 'product':
          if (this.config.dataTypes.products) {
            promises.push(this.prefetchProduct(item.id))
          }
          break
        case 'customer':
          if (this.config.dataTypes.customers) {
            promises.push(this.prefetchCustomer(item.id))
          }
          break
      }
    }

    return promises
  }

  /**
   * Prefetch frequently used items
   */
  private prefetchFrequentlyUsed(): Promise<void>[] {
    const promises: Promise<void>[] = []

    // Prefetch top frequently viewed products
    for (const productId of this.userPatterns.frequentlyViewedProducts.slice(0, 5)) {
      if (this.config.dataTypes.products) {
        promises.push(this.prefetchProduct(productId))
      }
    }

    // Prefetch top frequently viewed customers
    for (const customerId of this.userPatterns.frequentlyViewedCustomers.slice(0, 5)) {
      if (this.config.dataTypes.customers) {
        promises.push(this.prefetchCustomer(customerId))
      }
    }

    return promises
  }

  /**
   * Prefetch items predicted based on usage patterns
   */
  private prefetchPredictedItems(): Promise<void>[] {
    const promises: Promise<void>[] = []
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()

    // Check if this is a typical usage time
    const isTypicalTime = this.userPatterns.usagePatterns.timeOfDay.some(
      hour => Math.abs(hour - currentHour) <= 2 // Within 2 hours
    )

    const isTypicalDay = this.userPatterns.usagePatterns.dayOfWeek.includes(currentDay)

    if (isTypicalTime && isTypicalDay) {
      // Prefetch items that are commonly used during this time/day
      promises.push(...this.prefetchCommonItems())
    }

    return promises
  }

  /**
   * Prefetch commonly used items
   */
  private prefetchCommonItems(): Promise<void>[] {
    const promises: Promise<void>[] = []

    // Prefetch first page of products (most commonly viewed)
    if (this.config.dataTypes.products) {
      promises.push(this.prefetchProductsPage(1, 50))
    }

    // Prefetch first page of customers
    if (this.config.dataTypes.customers) {
      promises.push(this.prefetchCustomersPage(1, 50))
    }

    return promises
  }

  /**
   * Individual prefetch methods
   */
  private async prefetchCategories(): Promise<void> {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        const categories = Array.isArray(data.categories) ? data.categories : data
        await offlineStorage.saveCategories(categories)
      }
    } catch (error) {
      console.warn('Failed to prefetch categories:', error)
    }
  }

  private async prefetchSuppliers(): Promise<void> {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        const suppliers = Array.isArray(data.suppliers) ? data.suppliers : data
        await offlineStorage.saveSuppliers(suppliers)
      }
    } catch (error) {
      console.warn('Failed to prefetch suppliers:', error)
    }
  }

  private async prefetchProduct(id: string): Promise<void> {
    try {
      // Check if we already have it cached
      const existing = await offlineStorage.getProduct(id)
      if (existing) return

      const response = await fetch(`/api/products/${id}`)
      if (response.ok) {
        const product = await response.json()
        await offlineStorage.saveProduct(product)
      }
    } catch (error) {
      console.warn(`Failed to prefetch product ${id}:`, error)
    }
  }

  private async prefetchCustomer(id: string): Promise<void> {
    try {
      // Check if we already have it cached
      const existing = await offlineStorage.getCustomer(id)
      if (existing) return

      const response = await fetch(`/api/customers/${id}`)
      if (response.ok) {
        const customer = await response.json()
        await offlineStorage.saveCustomer(customer)
      }
    } catch (error) {
      console.warn(`Failed to prefetch customer ${id}:`, error)
    }
  }

  private async prefetchProductsPage(page: number, limit: number): Promise<void> {
    try {
      const offset = (page - 1) * limit
      const response = await fetch(`/api/products?limit=${limit}&offset=${offset}`)
      if (response.ok) {
        const data = await response.json()
        const products = Array.isArray(data.products) ? data.products : data
        await offlineStorage.saveProducts(products)
      }
    } catch (error) {
      console.warn(`Failed to prefetch products page ${page}:`, error)
    }
  }

  private async prefetchCustomersPage(page: number, limit: number): Promise<void> {
    try {
      const offset = (page - 1) * limit
      const response = await fetch(`/api/customers?limit=${limit}&offset=${offset}`)
      if (response.ok) {
        const data = await response.json()
        const customers = Array.isArray(data.customers) ? data.customers : data
        await offlineStorage.saveCustomers(customers)
      }
    } catch (error) {
      console.warn(`Failed to prefetch customers page ${page}:`, error)
    }
  }

  /**
   * Execute promises with concurrency limit
   */
  private async executeWithConcurrencyLimit(promises: Promise<void>[]): Promise<void> {
    const chunks = []
    for (let i = 0; i < promises.length; i += this.config.maxConcurrent) {
      chunks.push(promises.slice(i, i + this.config.maxConcurrent))
    }

    for (const chunk of chunks) {
      await Promise.allSettled(chunk)
      // Small delay between chunks to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  /**
   * Record user interaction for pattern analysis
   */
  recordInteraction(type: 'product' | 'customer' | 'category', id: string): void {
    const interaction = {
      type,
      id,
      timestamp: Date.now(),
    }

    // Add to recent items
    this.userPatterns.lastViewedItems.unshift(interaction)
    // Keep only last 100 items
    this.userPatterns.lastViewedItems = this.userPatterns.lastViewedItems.slice(0, 100)

    // Update frequency counts
    switch (type) {
      case 'product':
        this.updateFrequency(this.userPatterns.frequentlyViewedProducts, id)
        break
      case 'customer':
        this.updateFrequency(this.userPatterns.frequentlyViewedCustomers, id)
        break
      case 'category':
        this.updateFrequency(this.userPatterns.frequentlyViewedCategories, id)
        break
    }

    // Record usage pattern
    const now = new Date()
    this.userPatterns.usagePatterns.timeOfDay.push(now.getHours())
    this.userPatterns.usagePatterns.dayOfWeek.push(now.getDay())

    // Keep only last 100 entries for patterns
    this.userPatterns.usagePatterns.timeOfDay = this.userPatterns.usagePatterns.timeOfDay.slice(-100)
    this.userPatterns.usagePatterns.dayOfWeek = this.userPatterns.usagePatterns.dayOfWeek.slice(-100)

    // Save patterns to localStorage
    this.saveUserPatterns()
  }

  /**
   * Update frequency array
   */
  private updateFrequency(array: string[], id: string): void {
    const index = array.indexOf(id)
    if (index > -1) {
      // Move to front (most recent)
      array.splice(index, 1)
    }
    array.unshift(id)

    // Keep only top 20
    array.splice(20)
  }

  /**
   * Load user patterns from localStorage
   */
  private loadUserPatterns(): void {
    try {
      const saved = localStorage.getItem('shopflow-prefetch-patterns')
      if (saved) {
        this.userPatterns = { ...this.userPatterns, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.warn('Failed to load user patterns:', error)
    }
  }

  /**
   * Save user patterns to localStorage
   */
  private saveUserPatterns(): void {
    try {
      localStorage.setItem('shopflow-prefetch-patterns', JSON.stringify(this.userPatterns))
    } catch (error) {
      console.warn('Failed to save user patterns:', error)
    }
  }

  /**
   * Get prefetch statistics
   */
  getStats() {
    return {
      config: this.config,
      patterns: {
        totalRecentItems: this.userPatterns.lastViewedItems.length,
        totalFrequentProducts: this.userPatterns.frequentlyViewedProducts.length,
        totalFrequentCustomers: this.userPatterns.frequentlyViewedCustomers.length,
        totalFrequentCategories: this.userPatterns.frequentlyViewedCategories.length,
      },
      isActive: !!this.prefetchInterval,
    }
  }
}

export const prefetchService = new PrefetchService()