import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-token'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default async function LandingPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  // If user is authenticated, redirect to dashboard
  if (token) {
    const decoded = verifyToken(token)
    if (decoded) {
      redirect('/dashboard')
    }
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo/logo-completo/shopflow-logo-horizontal.png"
            alt="ShopFlow POS"
            width={300}
            height={75}
            className="mb-6"
            priority
          />
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            ShopFlow POS
          </h1>
        </div>
        <p className="text-xl text-gray-600 mb-8">
          Sistema de punto de venta completo y moderno para tu negocio
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8">
              Iniciar Sesión
            </Button>
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Gestión de Productos</h3>
            <p className="text-gray-600">
              Administra tu inventario, categorías y proveedores de forma eficiente
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Punto de Venta</h3>
            <p className="text-gray-600">
              Interfaz intuitiva para realizar ventas rápidas y precisas
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Reportes y Análisis</h3>
            <p className="text-gray-600">
              Visualiza estadísticas y métricas importantes de tu negocio
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
