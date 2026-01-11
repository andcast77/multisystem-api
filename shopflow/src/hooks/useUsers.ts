import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@prisma/client'
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from '@/lib/validations/user'

async function fetchUsers(query?: UserQueryInput): Promise<{ users: User[]; pagination: any }> {
  const params = new URLSearchParams()
  if (query?.search) params.append('search', query.search)
  if (query?.role) params.append('role', query.role)
  if (query?.active !== undefined) params.append('active', String(query.active))
  if (query?.page) params.append('page', String(query.page))
  if (query?.limit) params.append('limit', String(query.limit))

  const response = await fetch(`/api/users?${params.toString()}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch users')
  }
  return response.json()
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch user')
  }
  return response.json()
}

async function createUser(data: CreateUserInput): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create user')
  }
  return response.json()
}

async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user')
  }
  return response.json()
}

async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete user')
  }
}

export function useUsers(query?: UserQueryInput) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', data.id] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
