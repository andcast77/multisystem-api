import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MultiSystem Hub',
  description: 'Plataforma unificada para gestión empresarial. Accede a todos tus módulos de negocio desde un solo lugar.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
