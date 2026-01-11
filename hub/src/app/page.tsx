import Hero from '@/components/layout/Hero'
import Features from '@/components/layout/Features'
import Footer from '@/components/layout/Footer'
import ModuleCard from '@/components/modules/ModuleCard'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Nuestros Módulos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Accede a las herramientas que necesitas para gestionar tu negocio
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <ModuleCard
              title="ShopFlow"
              description="Sistema completo de punto de venta y gestiÃ³n de inventario. Controla tus ventas, productos y stock desde una interfaz intuitiva."
              features={[
                'Punto de Venta (POS)',
                'GestiÃ³n de Inventario',
                'Control de Ventas',
                'GestiÃ³n de Productos'
              ]}
              href="/shopflow"
              color="#3B82F6"
              icon={
                <svg className="w-12 h-12" style={{ color: '#3B82F6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
            />
            
            <ModuleCard
              title="Workify"
              description="Plataforma de recursos humanos para gestionar empleados, horarios, asistencia y más. Todo lo que necesitas para administrar tu equipo."
              features={[
                'Gestión de Empleados',
                'Control de Horarios',
                'Registro de Asistencia',
                'Dashboard de Estadísticas'
              ]}
              href="/workify"
              color="#10B981"
              icon={
                <svg className="w-12 h-12" style={{ color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>
      
      <Features />
      <Footer />
    </main>
  )
}
