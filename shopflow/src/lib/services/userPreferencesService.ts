import { prisma } from '@/lib/prisma'
import type { UpdateUserPreferencesInput } from '@/lib/validations/userPreferences'

export async function getUserPreferences(userId: string) {
  let preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  })

  // If no preferences exist, create default ones
  if (!preferences) {
    preferences = await prisma.userPreferences.create({
      data: {
        userId,
        language: 'es',
      },
    })
  }

  return preferences
}

export async function updateUserPreferences(
  userId: string,
  data: UpdateUserPreferencesInput
) {
  const preferences = await getUserPreferences(userId)

  const updatedPreferences = await prisma.userPreferences.update({
    where: { id: preferences.id },
    data: {
      language: data.language,
    },
  })

  return updatedPreferences
}
