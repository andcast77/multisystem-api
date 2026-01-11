/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Obtener URLs de los frontends desde variables de entorno
    // En Docker: usar nombres de servicio
    // En desarrollo local: usar localhost
    const shopflowUrl = process.env.SHOPFLOW_FRONTEND_URL || 'http://localhost:3003'
    const workifyUrl = process.env.WORKIFY_FRONTEND_URL || 'http://localhost:3004'

    return [
      {
        source: '/shopflow/:path*',
        destination: `${shopflowUrl}/:path*`,
      },
      {
        source: '/workify/:path*',
        destination: `${workifyUrl}/:path*`,
      },
      // Proxy de assets estáticos de Next.js
      {
        source: '/shopflow/_next/:path*',
        destination: `${shopflowUrl}/_next/:path*`,
      },
      {
        source: '/workify/_next/:path*',
        destination: `${workifyUrl}/_next/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
