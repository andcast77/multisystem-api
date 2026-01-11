import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuraciones de seguridad críticas
  poweredByHeader: false, // Remover header X-Powered-By
  compress: true, // Habilitar compresión
  generateEtags: false, // Deshabilitar ETags para evitar cacheo
  
  // Headers de seguridad globales
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
          }
        ]
      }
    ];
  },

  // Configuraciones de seguridad adicionales
  serverExternalPackages: [], // Configuración correcta para Next.js 15

  // Configuraciones de imágenes
  images: {
    domains: [], // No permitir dominios externos por defecto
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Configuraciones de webpack para seguridad
  webpack: (config, { dev }) => {
    // Remover información de debug en producción
    if (!dev) {
      config.optimization.minimize = true;
    }
    
    // Configuraciones de seguridad adicionales
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },

  // Configuraciones de TypeScript
  typescript: {
    ignoreBuildErrors: false, // No ignorar errores de TypeScript
  },

  // Configuraciones de ESLint
  eslint: {
    ignoreDuringBuilds: false, // No ignorar errores de ESLint
  },
};

export default nextConfig;
