import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Category } from '@prisma/client'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validations/category'
import { offlineStorage } from '@/lib/services/offlineStorage'
import type { Category as OfflineCategory } from '@/lib/utils/indexedDB'

async function fetchCategories(): Promise<Category[]> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        const categories = data.categories || data
        
        // Save to IndexedDB
        if (Array.isArray(categories)) {
          const transformedCategories: OfflineCategory[] = categories.map((category: Category) => ({
            id: category.id,
            name: category.name,
            description: category.description || undefined,
            parentId: category.parentId || undefined,
            updatedAt: category.updatedAt.toISOString(),
          }))
          await offlineStorage.saveCategories(transformedCategories)
        }
        
        return categories
      }
    } catch (error) {
      console.warn('Failed to fetch categories from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineCategories = await offlineStorage.getCategories()
  
  // Transform back to Prisma Category format
  return offlineCategories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || null,
    parentId: c.parentId || null,
    createdAt: new Date(),
    updatedAt: new Date(c.updatedAt),
  }))
}

async function fetchCategory(id: string): Promise<Category> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch(`/api/categories/${id}`)
      if (response.ok) {
        const category = await response.json()
        
        // Save to IndexedDB
        const transformedCategory: OfflineCategory = {
          id: category.id,
          name: category.name,
          description: category.description || undefined,
          parentId: category.parentId || undefined,
          updatedAt: category.updatedAt.toISOString(),
        }
        await offlineStorage.saveCategory(transformedCategory)
        
        return category
      }
    } catch (error) {
      console.warn('Failed to fetch category from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineCategory = await offlineStorage.getCategory(id)
  if (!offlineCategory) {
    throw new Error('Category not found')
  }

  return {
    id: offlineCategory.id,
    name: offlineCategory.name,
    description: offlineCategory.description || null,
    parentId: offlineCategory.parentId || null,
    createdAt: new Date(),
    updatedAt: new Date(offlineCategory.updatedAt),
  }
}

async function createCategory(data: CreateCategoryInput): Promise<Category> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Create temporary category for immediate feedback
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempCategory: Category = {
      id: tempId,
      name: data.name,
      description: data.description || null,
      parentId: data.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to IndexedDB immediately
    try {
      const transformedCategory: OfflineCategory = {
        id: tempId,
        name: tempCategory.name,
        description: tempCategory.description || undefined,
        parentId: tempCategory.parentId || undefined,
        updatedAt: tempCategory.updatedAt.toISOString(),
      }
      await offlineStorage.saveCategory(transformedCategory)
    } catch (error) {
      console.warn('Failed to save category to offline storage:', error)
    }

    return tempCategory
  }

  // Online: try to create on server
  try {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create category')
    }
    
    const category = await response.json()
    
    // Save to IndexedDB
    try {
      const transformedCategory: OfflineCategory = {
        id: category.id,
        name: category.name,
        description: category.description || undefined,
        parentId: category.parentId || undefined,
        updatedAt: category.updatedAt.toISOString(),
      }
      await offlineStorage.saveCategory(transformedCategory)
    } catch (error) {
      console.warn('Failed to save category to offline storage:', error)
    }
    
    return category
  } catch (error) {
    // If fetch fails, treat as offline
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const tempCategory: Category = {
        id: tempId,
        name: data.name,
        description: data.description || null,
        parentId: data.parentId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      try {
        const transformedCategory: OfflineCategory = {
          id: tempId,
          name: tempCategory.name,
          description: tempCategory.description || undefined,
          parentId: tempCategory.parentId || undefined,
          updatedAt: tempCategory.updatedAt.toISOString(),
        }
        await offlineStorage.saveCategory(transformedCategory)
      } catch (err) {
        console.warn('Failed to save category to offline storage:', err)
      }

      return tempCategory
    }
    throw error
  }
}

async function updateCategory(id: string, data: UpdateCategoryInput): Promise<Category> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  // Get existing category from IndexedDB
  let existingCategory: OfflineCategory | null = null
  try {
    existingCategory = await offlineStorage.getCategory(id)
  } catch (error) {
    console.warn('Failed to get category from offline storage:', error)
  }

  if (isOffline || !existingCategory) {
    // Offline: update IndexedDB immediately
    if (existingCategory) {
      const updatedCategory: OfflineCategory = {
        ...existingCategory,
        name: data.name ?? existingCategory.name,
        description: data.description !== undefined ? data.description : existingCategory.description,
        parentId: data.parentId !== undefined ? data.parentId : existingCategory.parentId,
        updatedAt: new Date().toISOString(),
      }

      try {
        await offlineStorage.saveCategory(updatedCategory)
      } catch (error) {
        console.warn('Failed to update category in offline storage:', error)
      }

      return {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description || null,
        parentId: updatedCategory.parentId || null,
        createdAt: new Date(),
        updatedAt: new Date(updatedCategory.updatedAt),
      }
    }
  }

  // Online: try to update on server
  try {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update category')
    }
    
    const category = await response.json()
    
    // Update in IndexedDB
    try {
      const transformedCategory: OfflineCategory = {
        id: category.id,
        name: category.name,
        description: category.description || undefined,
        parentId: category.parentId || undefined,
        updatedAt: category.updatedAt.toISOString(),
      }
      await offlineStorage.saveCategory(transformedCategory)
    } catch (error) {
      console.warn('Failed to update category in offline storage:', error)
    }
    
    return category
  } catch (error) {
    // If fetch fails and we have existing category, update offline
    if (error instanceof TypeError && error.message.includes('fetch') && existingCategory) {
      const updatedCategory: OfflineCategory = {
        ...existingCategory,
        name: data.name ?? existingCategory.name,
        description: data.description !== undefined ? data.description : existingCategory.description,
        parentId: data.parentId !== undefined ? data.parentId : existingCategory.parentId,
        updatedAt: new Date().toISOString(),
      }

      await offlineStorage.saveCategory(updatedCategory)

      return {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description || null,
        parentId: updatedCategory.parentId || null,
        createdAt: new Date(),
        updatedAt: new Date(updatedCategory.updatedAt),
      }
    }
    throw error
  }
}

async function deleteCategory(id: string): Promise<void> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Offline: remove from IndexedDB immediately
    try {
      await offlineStorage.deleteCategory(id)
    } catch (error) {
      console.warn('Failed to delete category from offline storage:', error)
    }
    return
  }

  // Online: try to delete on server
  try {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete category')
    }
    
    // Remove from IndexedDB
    try {
      await offlineStorage.deleteCategory(id)
    } catch (error) {
      console.warn('Failed to delete category from offline storage:', error)
    }
  } catch (error) {
    // If fetch fails, delete from IndexedDB anyway
    if (error instanceof TypeError && error.message.includes('fetch')) {
      try {
        await offlineStorage.deleteCategory(id)
      } catch (err) {
        console.warn('Failed to delete category from offline storage:', err)
      }
      return
    }
    throw error
  }
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => fetchCategory(id),
    enabled: !!id,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
