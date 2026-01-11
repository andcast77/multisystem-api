'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { saveOfflineAuth, validateOfflineToken } from '@/lib/services/offlineAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Verificar si el usuario ya está autenticado y redirigir al dashboard
  useEffect(() => {
    const checkAuth = async () => {
      // Primero verificar token offline (más rápido y funciona sin servidor)
      const offlineUser = validateOfflineToken()
      if (offlineUser) {
        // Intentar verificar con el servidor, pero con timeout corto
        // Si el servidor está offline, usar el token offline
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 segundos timeout

        try {
          const response = await fetch('/api/auth/me', {
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          
          if (response.ok) {
            // Usuario autenticado en servidor, redirigir al dashboard
            router.push('/dashboard')
            router.refresh()
            return
          }
        } catch (error) {
          clearTimeout(timeoutId)
          // Si falla (servidor offline, timeout, etc.), usar token offline
          // Esto permite funcionar completamente offline
          router.push('/dashboard')
          router.refresh()
          return
        }
      }
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setError(null)

    try {
      // IMPORTANTE: Las credenciales se envían en el body del POST, NO en la URL
      // Esto es seguro y evita que las credenciales aparezcan en logs del servidor,
      // historial del navegador, o referrers
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data), // Credenciales en el body, no en la URL
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al iniciar sesión')
      }

      const result = await response.json()

      // Save token and user info for offline access
      if (result.token && result.user) {
        saveOfflineAuth(result.token, {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          name: result.user.name,
        })
      }

      // Redirect to dashboard on success
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loading mientras se verifica la autenticación
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder a ShopFlow POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formulario seguro: usa POST con body JSON, nunca GET con query params */}
          <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                {...register('email')}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Credenciales de prueba:
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Superadmin:</strong> superadmin@shopflow.com / superadmin</p>
              <p><strong>Admin:</strong> admin@shopflow.com / admin123</p>
              <p><strong>Cajero:</strong> cashier@shopflow.com / cashier123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
