import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Supplier } from '@prisma/client'
import type { CreateSupplierInput, UpdateSupplierInput } from '@/lib/validations/supplier'
import { offlineStorage } from '@/lib/services/offlineStorage'
import type { Supplier as OfflineSupplier } from '@/lib/utils/indexedDB'

async function fetchSuppliers(): Promise<Supplier[]> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        const suppliers = data.suppliers || data
        
        // Save to IndexedDB
        if (Array.isArray(suppliers)) {
          const transformedSuppliers: OfflineSupplier[] = suppliers.map((supplier: Supplier) => ({
            id: supplier.id,
            name: supplier.name,
            email: supplier.email || undefined,
            phone: supplier.phone || undefined,
            address: supplier.address || undefined,
            city: supplier.city || undefined,
            state: supplier.state || undefined,
            postalCode: supplier.postalCode || undefined,
            country: supplier.country || undefined,
            active: supplier.active,
            updatedAt: supplier.updatedAt.toISOString(),
          }))
          await offlineStorage.saveSuppliers(transformedSuppliers)
        }
        
        return suppliers
      }
    } catch (error) {
      console.warn('Failed to fetch suppliers from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineSuppliers = await offlineStorage.getSuppliers()
  
  // Transform back to Prisma Supplier format
  return offlineSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email || null,
    phone: s.phone || null,
    address: s.address || null,
    city: s.city || null,
    state: s.state || null,
    postalCode: s.postalCode || null,
    country: s.country || null,
    taxId: null,
    notes: null,
    active: s.active,
    createdAt: new Date(),
    updatedAt: new Date(s.updatedAt),
  }))
}

async function fetchSupplier(id: string): Promise<Supplier> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch(`/api/suppliers/${id}`)
      if (response.ok) {
        const supplier = await response.json()
        
        // Save to IndexedDB
        const transformedSupplier: OfflineSupplier = {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email || undefined,
          phone: supplier.phone || undefined,
          address: supplier.address || undefined,
          city: supplier.city || undefined,
          state: supplier.state || undefined,
          postalCode: supplier.postalCode || undefined,
          country: supplier.country || undefined,
          active: supplier.active,
          updatedAt: supplier.updatedAt.toISOString(),
        }
        await offlineStorage.saveSupplier(transformedSupplier)
        
        return supplier
      }
    } catch (error) {
      console.warn('Failed to fetch supplier from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineSupplier = await offlineStorage.getSupplier(id)
  if (!offlineSupplier) {
    throw new Error('Supplier not found')
  }

  return {
    id: offlineSupplier.id,
    name: offlineSupplier.name,
    email: offlineSupplier.email || null,
    phone: offlineSupplier.phone || null,
    address: offlineSupplier.address || null,
    city: offlineSupplier.city || null,
    state: offlineSupplier.state || null,
    postalCode: offlineSupplier.postalCode || null,
    country: offlineSupplier.country || null,
    taxId: null,
    notes: null,
    active: offlineSupplier.active,
    createdAt: new Date(),
    updatedAt: new Date(offlineSupplier.updatedAt),
  }
}

async function createSupplier(data: CreateSupplierInput): Promise<Supplier> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Create temporary supplier for immediate feedback
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempSupplier: Supplier = {
      id: tempId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      taxId: null,
      notes: null,
      active: data.active !== undefined ? data.active : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to IndexedDB immediately
    try {
      const transformedSupplier: OfflineSupplier = {
        id: tempId,
        name: tempSupplier.name,
        email: tempSupplier.email || undefined,
        phone: tempSupplier.phone || undefined,
        address: tempSupplier.address || undefined,
        city: tempSupplier.city || undefined,
        state: tempSupplier.state || undefined,
        postalCode: tempSupplier.postalCode || undefined,
        country: tempSupplier.country || undefined,
        active: tempSupplier.active,
        updatedAt: tempSupplier.updatedAt.toISOString(),
      }
      await offlineStorage.saveSupplier(transformedSupplier)
    } catch (error) {
      console.warn('Failed to save supplier to offline storage:', error)
    }

    return tempSupplier
  }

  // Online: try to create on server
  try {
    const response = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create supplier')
    }
    
    const supplier = await response.json()
    
    // Save to IndexedDB
    try {
      const transformedSupplier: OfflineSupplier = {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email || undefined,
        phone: supplier.phone || undefined,
        address: supplier.address || undefined,
        city: supplier.city || undefined,
        state: supplier.state || undefined,
        postalCode: supplier.postalCode || undefined,
        country: supplier.country || undefined,
        active: supplier.active,
        updatedAt: supplier.updatedAt.toISOString(),
      }
      await offlineStorage.saveSupplier(transformedSupplier)
    } catch (error) {
      console.warn('Failed to save supplier to offline storage:', error)
    }
    
    return supplier
  } catch (error) {
    // If fetch fails, treat as offline
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const tempSupplier: Supplier = {
        id: tempId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        taxId: null,
        notes: null,
        active: data.active !== undefined ? data.active : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      try {
        const transformedSupplier: OfflineSupplier = {
          id: tempId,
          name: tempSupplier.name,
          email: tempSupplier.email || undefined,
          phone: tempSupplier.phone || undefined,
          address: tempSupplier.address || undefined,
          city: tempSupplier.city || undefined,
          state: tempSupplier.state || undefined,
          postalCode: tempSupplier.postalCode || undefined,
          country: tempSupplier.country || undefined,
          active: tempSupplier.active,
          updatedAt: tempSupplier.updatedAt.toISOString(),
        }
        await offlineStorage.saveSupplier(transformedSupplier)
      } catch (err) {
        console.warn('Failed to save supplier to offline storage:', err)
      }

      return tempSupplier
    }
    throw error
  }
}

async function updateSupplier(id: string, data: UpdateSupplierInput): Promise<Supplier> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  // Get existing supplier from IndexedDB
  let existingSupplier: OfflineSupplier | null = null
  try {
    existingSupplier = await offlineStorage.getSupplier(id)
  } catch (error) {
    console.warn('Failed to get supplier from offline storage:', error)
  }

  if (isOffline || !existingSupplier) {
    // Offline: update IndexedDB immediately
    if (existingSupplier) {
      const updatedSupplier: OfflineSupplier = {
        ...existingSupplier,
        name: data.name ?? existingSupplier.name,
        email: data.email !== undefined ? data.email : existingSupplier.email,
        phone: data.phone !== undefined ? data.phone : existingSupplier.phone,
        address: data.address !== undefined ? data.address : existingSupplier.address,
        city: data.city !== undefined ? data.city : existingSupplier.city,
        state: data.state !== undefined ? data.state : existingSupplier.state,
        postalCode: data.postalCode !== undefined ? data.postalCode : existingSupplier.postalCode,
        country: data.country !== undefined ? data.country : existingSupplier.country,
        active: data.active !== undefined ? data.active : existingSupplier.active,
        updatedAt: new Date().toISOString(),
      }

      try {
        await offlineStorage.saveSupplier(updatedSupplier)
      } catch (error) {
        console.warn('Failed to update supplier in offline storage:', error)
      }

      return {
        id: updatedSupplier.id,
        name: updatedSupplier.name,
        email: updatedSupplier.email || null,
        phone: updatedSupplier.phone || null,
        address: updatedSupplier.address || null,
        city: updatedSupplier.city || null,
        state: updatedSupplier.state || null,
        postalCode: updatedSupplier.postalCode || null,
        country: updatedSupplier.country || null,
        taxId: null,
        notes: null,
        active: updatedSupplier.active,
        createdAt: new Date(),
        updatedAt: new Date(updatedSupplier.updatedAt),
      }
    }
  }

  // Online: try to update on server
  try {
    const response = await fetch(`/api/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update supplier')
    }
    
    const supplier = await response.json()
    
    // Update in IndexedDB
    try {
      const transformedSupplier: OfflineSupplier = {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email || undefined,
        phone: supplier.phone || undefined,
        address: supplier.address || undefined,
        city: supplier.city || undefined,
        state: supplier.state || undefined,
        postalCode: supplier.postalCode || undefined,
        country: supplier.country || undefined,
        active: supplier.active,
        updatedAt: supplier.updatedAt.toISOString(),
      }
      await offlineStorage.saveSupplier(transformedSupplier)
    } catch (error) {
      console.warn('Failed to update supplier in offline storage:', error)
    }
    
    return supplier
  } catch (error) {
    // If fetch fails and we have existing supplier, update offline
    if (error instanceof TypeError && error.message.includes('fetch') && existingSupplier) {
      const updatedSupplier: OfflineSupplier = {
        ...existingSupplier,
        name: data.name ?? existingSupplier.name,
        email: data.email !== undefined ? data.email : existingSupplier.email,
        phone: data.phone !== undefined ? data.phone : existingSupplier.phone,
        address: data.address !== undefined ? data.address : existingSupplier.address,
        city: data.city !== undefined ? data.city : existingSupplier.city,
        state: data.state !== undefined ? data.state : existingSupplier.state,
        postalCode: data.postalCode !== undefined ? data.postalCode : existingSupplier.postalCode,
        country: data.country !== undefined ? data.country : existingSupplier.country,
        active: data.active !== undefined ? data.active : existingSupplier.active,
        updatedAt: new Date().toISOString(),
      }

      await offlineStorage.saveSupplier(updatedSupplier)

      return {
        id: updatedSupplier.id,
        name: updatedSupplier.name,
        email: updatedSupplier.email || null,
        phone: updatedSupplier.phone || null,
        address: updatedSupplier.address || null,
        city: updatedSupplier.city || null,
        state: updatedSupplier.state || null,
        postalCode: updatedSupplier.postalCode || null,
        country: updatedSupplier.country || null,
        taxId: null,
        notes: null,
        active: updatedSupplier.active,
        createdAt: new Date(),
        updatedAt: new Date(updatedSupplier.updatedAt),
      }
    }
    throw error
  }
}

async function deleteSupplier(id: string): Promise<void> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Offline: remove from IndexedDB immediately
    try {
      await offlineStorage.deleteSupplier(id)
    } catch (error) {
      console.warn('Failed to delete supplier from offline storage:', error)
    }
    return
  }

  // Online: try to delete on server
  try {
    const response = await fetch(`/api/suppliers/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete supplier')
    }
    
    // Remove from IndexedDB
    try {
      await offlineStorage.deleteSupplier(id)
    } catch (error) {
      console.warn('Failed to delete supplier from offline storage:', error)
    }
  } catch (error) {
    // If fetch fails, delete from IndexedDB anyway
    if (error instanceof TypeError && error.message.includes('fetch')) {
      try {
        await offlineStorage.deleteSupplier(id)
      } catch (err) {
        console.warn('Failed to delete supplier from offline storage:', err)
      }
      return
    }
    throw error
  }
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => fetchSupplier(id),
    enabled: !!id,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInput }) =>
      updateSupplier(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', data.id] })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}
