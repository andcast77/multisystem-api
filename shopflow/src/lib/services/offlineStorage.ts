/**
 * Offline Storage Service
 * Provides high-level API for storing and retrieving data offline using IndexedDB
 */

import {
  getAllFromStore,
  getFromStore,
  putInStore,
  deleteFromStore,
  clearStore,
  getSyncMetadata,
  updateSyncMetadata,
  type Product,
  type Category,
  type Customer,
  type Supplier,
  type StoreConfig,
  type TicketConfig,
} from '@/lib/utils/indexedDB'

export class OfflineStorageService {
  // Products
  async getProducts(): Promise<Product[]> {
    try {
      return await getAllFromStore<Product>('products')
    } catch (error) {
      console.error('Error getting products from offline storage:', error)
      return []
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      return await getFromStore<Product>('products', id)
    } catch (error) {
      console.error('Error getting product from offline storage:', error)
      return null
    }
  }

  async saveProducts(products: Product[]): Promise<void> {
    try {
      await putInStore('products', products)
      await updateSyncMetadata({ lastProductSync: Date.now() })
    } catch (error) {
      console.error('Error saving products to offline storage:', error)
      throw error
    }
  }

  async saveProduct(product: Product): Promise<void> {
    try {
      // Mark as locally modified if not synced
      const productWithTimestamp: Product = {
        ...product,
        localModifiedAt: product.lastSyncedAt ? undefined : Date.now(),
      }
      await putInStore('products', productWithTimestamp)
    } catch (error) {
      console.error('Error saving product to offline storage:', error)
      throw error
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await deleteFromStore('products', id)
    } catch (error) {
      console.error('Error deleting product from offline storage:', error)
      throw error
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      return await getAllFromStore<Category>('categories')
    } catch (error) {
      console.error('Error getting categories from offline storage:', error)
      return []
    }
  }

  async getCategory(id: string): Promise<Category | null> {
    try {
      return await getFromStore<Category>('categories', id)
    } catch (error) {
      console.error('Error getting category from offline storage:', error)
      return null
    }
  }

  async saveCategories(categories: Category[]): Promise<void> {
    try {
      await putInStore('categories', categories)
      await updateSyncMetadata({ lastCategorySync: Date.now() })
    } catch (error) {
      console.error('Error saving categories to offline storage:', error)
      throw error
    }
  }

  async saveCategory(category: Category): Promise<void> {
    try {
      const categoryWithTimestamp: Category = {
        ...category,
        localModifiedAt: category.lastSyncedAt ? undefined : Date.now(),
      }
      await putInStore('categories', categoryWithTimestamp)
    } catch (error) {
      console.error('Error saving category to offline storage:', error)
      throw error
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await deleteFromStore('categories', id)
    } catch (error) {
      console.error('Error deleting category from offline storage:', error)
      throw error
    }
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    try {
      return await getAllFromStore<Customer>('customers')
    } catch (error) {
      console.error('Error getting customers from offline storage:', error)
      return []
    }
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      return await getFromStore<Customer>('customers', id)
    } catch (error) {
      console.error('Error getting customer from offline storage:', error)
      return null
    }
  }

  async saveCustomers(customers: Customer[]): Promise<void> {
    try {
      await putInStore('customers', customers)
      await updateSyncMetadata({ lastCustomerSync: Date.now() })
    } catch (error) {
      console.error('Error saving customers to offline storage:', error)
      throw error
    }
  }

  async saveCustomer(customer: Customer): Promise<void> {
    try {
      const customerWithTimestamp: Customer = {
        ...customer,
        localModifiedAt: customer.lastSyncedAt ? undefined : Date.now(),
      }
      await putInStore('customers', customerWithTimestamp)
    } catch (error) {
      console.error('Error saving customer to offline storage:', error)
      throw error
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      await deleteFromStore('customers', id)
    } catch (error) {
      console.error('Error deleting customer from offline storage:', error)
      throw error
    }
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    try {
      return await getAllFromStore<Supplier>('suppliers')
    } catch (error) {
      console.error('Error getting suppliers from offline storage:', error)
      return []
    }
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    try {
      return await getFromStore<Supplier>('suppliers', id)
    } catch (error) {
      console.error('Error getting supplier from offline storage:', error)
      return null
    }
  }

  async saveSuppliers(suppliers: Supplier[]): Promise<void> {
    try {
      await putInStore('suppliers', suppliers)
      await updateSyncMetadata({ lastSupplierSync: Date.now() })
    } catch (error) {
      console.error('Error saving suppliers to offline storage:', error)
      throw error
    }
  }

  async saveSupplier(supplier: Supplier): Promise<void> {
    try {
      const supplierWithTimestamp: Supplier = {
        ...supplier,
        localModifiedAt: supplier.lastSyncedAt ? undefined : Date.now(),
      }
      await putInStore('suppliers', supplierWithTimestamp)
    } catch (error) {
      console.error('Error saving supplier to offline storage:', error)
      throw error
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      await deleteFromStore('suppliers', id)
    } catch (error) {
      console.error('Error deleting supplier from offline storage:', error)
      throw error
    }
  }

  // Store Config
  async getStoreConfig(): Promise<StoreConfig | null> {
    try {
      return await getFromStore<StoreConfig>('storeConfig', '1')
    } catch (error) {
      console.error('Error getting store config from offline storage:', error)
      return null
    }
  }

  async saveStoreConfig(config: StoreConfig): Promise<void> {
    try {
      await putInStore('storeConfig', config)
    } catch (error) {
      console.error('Error saving store config to offline storage:', error)
      throw error
    }
  }

  // Ticket Config
  async getTicketConfig(): Promise<TicketConfig | null> {
    try {
      return await getFromStore<TicketConfig>('ticketConfig', '1')
    } catch (error) {
      console.error('Error getting ticket config from offline storage:', error)
      return null
    }
  }

  async saveTicketConfig(config: TicketConfig): Promise<void> {
    try {
      await putInStore('ticketConfig', config)
    } catch (error) {
      console.error('Error saving ticket config to offline storage:', error)
      throw error
    }
  }

  // Sync Metadata
  async getSyncMetadata() {
    return await getSyncMetadata()
  }

  async updateSyncMetadata(updates: Parameters<typeof updateSyncMetadata>[0]) {
    return await updateSyncMetadata(updates)
  }

  // Clear all data (for testing or reset)
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        clearStore('products'),
        clearStore('categories'),
        clearStore('customers'),
        clearStore('suppliers'),
        clearStore('storeConfig'),
        clearStore('ticketConfig'),
        clearStore('syncMetadata'),
      ])
    } catch (error) {
      console.error('Error clearing offline storage:', error)
      throw error
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService()
