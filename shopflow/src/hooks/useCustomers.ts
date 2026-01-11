import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Customer } from '@prisma/client'
import type { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from '@/lib/validations/customer'
import { offlineStorage } from '@/lib/services/offlineStorage'
import type { Customer as OfflineCustomer } from '@/lib/utils/indexedDB'

async function fetchCustomers(query?: CustomerQueryInput): Promise<Customer[]> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const params = new URLSearchParams()
      if (query?.search) params.append('search', query.search)
      if (query?.email) params.append('email', query.email)
      if (query?.phone) params.append('phone', query.phone)

      const response = await fetch(`/api/customers?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const customers = data.customers || data
        
        // Save to IndexedDB
        if (Array.isArray(customers)) {
          const transformedCustomers: OfflineCustomer[] = customers.map((customer: Customer) => ({
            id: customer.id,
            name: customer.name,
            email: customer.email || undefined,
            phone: customer.phone || undefined,
            address: customer.address || undefined,
            city: customer.city || undefined,
            state: customer.state || undefined,
            postalCode: customer.postalCode || undefined,
            country: customer.country || undefined,
            updatedAt: customer.updatedAt.toISOString(),
          }))
          await offlineStorage.saveCustomers(transformedCustomers)
        }
        
        return customers
      }
    } catch (error) {
      console.warn('Failed to fetch customers from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineCustomers = await offlineStorage.getCustomers()
  
  // Apply filters
  let filtered = offlineCustomers
  if (query?.search) {
    const searchLower = query.search.toLowerCase()
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower)
    )
  }
  if (query?.email) {
    filtered = filtered.filter((c) => c.email?.toLowerCase() === query.email?.toLowerCase())
  }
  if (query?.phone) {
    filtered = filtered.filter((c) => c.phone === query.phone)
  }

  // Transform back to Prisma Customer format
  return filtered.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email || null,
    phone: c.phone || null,
    address: c.address || null,
    city: c.city || null,
    state: c.state || null,
    postalCode: c.postalCode || null,
    country: c.country || null,
    createdAt: new Date(),
    updatedAt: new Date(c.updatedAt),
  }))
}

async function fetchCustomer(id: string): Promise<Customer> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch(`/api/customers/${id}`)
      if (response.ok) {
        const customer = await response.json()
        
        // Save to IndexedDB
        const transformedCustomer: OfflineCustomer = {
          id: customer.id,
          name: customer.name,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          address: customer.address || undefined,
          city: customer.city || undefined,
          state: customer.state || undefined,
          postalCode: customer.postalCode || undefined,
          country: customer.country || undefined,
          updatedAt: customer.updatedAt.toISOString(),
        }
        await offlineStorage.saveCustomer(transformedCustomer)
        
        return customer
      }
    } catch (error) {
      console.warn('Failed to fetch customer from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineCustomer = await offlineStorage.getCustomer(id)
  if (!offlineCustomer) {
    throw new Error('Customer not found')
  }

  return {
    id: offlineCustomer.id,
    name: offlineCustomer.name,
    email: offlineCustomer.email || null,
    phone: offlineCustomer.phone || null,
    address: offlineCustomer.address || null,
    city: offlineCustomer.city || null,
    state: offlineCustomer.state || null,
    postalCode: offlineCustomer.postalCode || null,
    country: offlineCustomer.country || null,
    createdAt: new Date(),
    updatedAt: new Date(offlineCustomer.updatedAt),
  }
}

async function createCustomer(data: CreateCustomerInput): Promise<Customer> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Create temporary customer for immediate feedback
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempCustomer: Customer = {
      id: tempId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to IndexedDB immediately
    try {
      const transformedCustomer: OfflineCustomer = {
        id: tempId,
        name: tempCustomer.name,
        email: tempCustomer.email || undefined,
        phone: tempCustomer.phone || undefined,
        address: tempCustomer.address || undefined,
        city: tempCustomer.city || undefined,
        state: tempCustomer.state || undefined,
        postalCode: tempCustomer.postalCode || undefined,
        country: tempCustomer.country || undefined,
        updatedAt: tempCustomer.updatedAt.toISOString(),
      }
      await offlineStorage.saveCustomer(transformedCustomer)
    } catch (error) {
      console.warn('Failed to save customer to offline storage:', error)
    }

    return tempCustomer
  }

  // Online: try to create on server
  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create customer')
    }
    
    const customer = await response.json()
    
    // Save to IndexedDB
    try {
      const transformedCustomer: OfflineCustomer = {
        id: customer.id,
        name: customer.name,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address || undefined,
        city: customer.city || undefined,
        state: customer.state || undefined,
        postalCode: customer.postalCode || undefined,
        country: customer.country || undefined,
        updatedAt: customer.updatedAt.toISOString(),
      }
      await offlineStorage.saveCustomer(transformedCustomer)
    } catch (error) {
      console.warn('Failed to save customer to offline storage:', error)
    }
    
    return customer
  } catch (error) {
    // If fetch fails, treat as offline
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const tempCustomer: Customer = {
        id: tempId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      try {
        const transformedCustomer: OfflineCustomer = {
          id: tempId,
          name: tempCustomer.name,
          email: tempCustomer.email || undefined,
          phone: tempCustomer.phone || undefined,
          address: tempCustomer.address || undefined,
          city: tempCustomer.city || undefined,
          state: tempCustomer.state || undefined,
          postalCode: tempCustomer.postalCode || undefined,
          country: tempCustomer.country || undefined,
          updatedAt: tempCustomer.updatedAt.toISOString(),
        }
        await offlineStorage.saveCustomer(transformedCustomer)
      } catch (err) {
        console.warn('Failed to save customer to offline storage:', err)
      }

      return tempCustomer
    }
    throw error
  }
}

async function updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  // Get existing customer from IndexedDB
  let existingCustomer: OfflineCustomer | null = null
  try {
    existingCustomer = await offlineStorage.getCustomer(id)
  } catch (error) {
    console.warn('Failed to get customer from offline storage:', error)
  }

  if (isOffline || !existingCustomer) {
    // Offline: update IndexedDB immediately
    if (existingCustomer) {
      const updatedCustomer: OfflineCustomer = {
        ...existingCustomer,
        name: data.name ?? existingCustomer.name,
        email: data.email !== undefined ? data.email : existingCustomer.email,
        phone: data.phone !== undefined ? data.phone : existingCustomer.phone,
        address: data.address !== undefined ? data.address : existingCustomer.address,
        city: data.city !== undefined ? data.city : existingCustomer.city,
        state: data.state !== undefined ? data.state : existingCustomer.state,
        postalCode: data.postalCode !== undefined ? data.postalCode : existingCustomer.postalCode,
        country: data.country !== undefined ? data.country : existingCustomer.country,
        updatedAt: new Date().toISOString(),
      }

      try {
        await offlineStorage.saveCustomer(updatedCustomer)
      } catch (error) {
        console.warn('Failed to update customer in offline storage:', error)
      }

      return {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email || null,
        phone: updatedCustomer.phone || null,
        address: updatedCustomer.address || null,
        city: updatedCustomer.city || null,
        state: updatedCustomer.state || null,
        postalCode: updatedCustomer.postalCode || null,
        country: updatedCustomer.country || null,
        createdAt: new Date(),
        updatedAt: new Date(updatedCustomer.updatedAt),
      }
    }
  }

  // Online: try to update on server
  try {
    const response = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update customer')
    }
    
    const customer = await response.json()
    
    // Update in IndexedDB
    try {
      const transformedCustomer: OfflineCustomer = {
        id: customer.id,
        name: customer.name,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address || undefined,
        city: customer.city || undefined,
        state: customer.state || undefined,
        postalCode: customer.postalCode || undefined,
        country: customer.country || undefined,
        updatedAt: customer.updatedAt.toISOString(),
      }
      await offlineStorage.saveCustomer(transformedCustomer)
    } catch (error) {
      console.warn('Failed to update customer in offline storage:', error)
    }
    
    return customer
  } catch (error) {
    // If fetch fails and we have existing customer, update offline
    if (error instanceof TypeError && error.message.includes('fetch') && existingCustomer) {
      const updatedCustomer: OfflineCustomer = {
        ...existingCustomer,
        name: data.name ?? existingCustomer.name,
        email: data.email !== undefined ? data.email : existingCustomer.email,
        phone: data.phone !== undefined ? data.phone : existingCustomer.phone,
        address: data.address !== undefined ? data.address : existingCustomer.address,
        city: data.city !== undefined ? data.city : existingCustomer.city,
        state: data.state !== undefined ? data.state : existingCustomer.state,
        postalCode: data.postalCode !== undefined ? data.postalCode : existingCustomer.postalCode,
        country: data.country !== undefined ? data.country : existingCustomer.country,
        updatedAt: new Date().toISOString(),
      }

      await offlineStorage.saveCustomer(updatedCustomer)

      return {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email || null,
        phone: updatedCustomer.phone || null,
        address: updatedCustomer.address || null,
        city: updatedCustomer.city || null,
        state: updatedCustomer.state || null,
        postalCode: updatedCustomer.postalCode || null,
        country: updatedCustomer.country || null,
        createdAt: new Date(),
        updatedAt: new Date(updatedCustomer.updatedAt),
      }
    }
    throw error
  }
}

async function deleteCustomer(id: string): Promise<void> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Offline: remove from IndexedDB immediately
    try {
      await offlineStorage.deleteCustomer(id)
    } catch (error) {
      console.warn('Failed to delete customer from offline storage:', error)
    }
    return
  }

  // Online: try to delete on server
  try {
    const response = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete customer')
    }
    
    // Remove from IndexedDB
    try {
      await offlineStorage.deleteCustomer(id)
    } catch (error) {
      console.warn('Failed to delete customer from offline storage:', error)
    }
  } catch (error) {
    // If fetch fails, delete from IndexedDB anyway
    if (error instanceof TypeError && error.message.includes('fetch')) {
      try {
        await offlineStorage.deleteCustomer(id)
      } catch (err) {
        console.warn('Failed to delete customer from offline storage:', err)
      }
      return
    }
    throw error
  }
}

export function useCustomers(query?: CustomerQueryInput) {
  return useQuery({
    queryKey: ['customers', query],
    queryFn: () => fetchCustomers(query),
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => fetchCustomer(id),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
      updateCustomer(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', data.id] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

