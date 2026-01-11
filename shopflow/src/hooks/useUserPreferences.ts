import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserPreferences } from '@prisma/client'
import type { UpdateUserPreferencesInput } from '@/lib/validations/userPreferences'
import { localStorageUtils } from '@/lib/utils/localStorage'

async function fetchUserPreferences(): Promise<UserPreferences> {
  const response = await fetch('/api/user/preferences')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch user preferences')
  }
  const data = await response.json()
  
  // Save to localStorage as cache
  if (data.preferences?.language) {
    localStorageUtils.setLanguage(data.preferences.language)
  }
  
  return data.preferences
}

async function updateUserPreferences(
  data: UpdateUserPreferencesInput
): Promise<UserPreferences> {
  const response = await fetch('/api/user/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user preferences')
  }
  const result = await response.json()
  
  // Update localStorage simultaneously
  if (result.preferences?.language) {
    localStorageUtils.setLanguage(result.preferences.language)
  }
  
  return result.preferences
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: fetchUserPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
      // Reload page to apply language change
      window.location.reload()
    },
  })
}

// Helper function to get language from localStorage (for initial load)
export function getLanguageFromStorage(): string {
  return localStorageUtils.getLanguage() || 'es'
}
