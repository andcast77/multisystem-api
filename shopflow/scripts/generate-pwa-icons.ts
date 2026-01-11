import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const iconsDir = join(process.cwd(), 'public', 'icons')
const sourceImage = join(process.cwd(), 'public', 'logo', 'favicon', 'favicon-48x48.png')

// Iconos a generar
const icons = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

async function generateIcons() {
  try {
    // Verificar que existe la imagen fuente
    if (!existsSync(sourceImage)) {
      console.error(`Error: No se encontró la imagen fuente en ${sourceImage}`)
      process.exit(1)
    }

    // Crear directorio si no existe
    if (!existsSync(iconsDir)) {
      mkdirSync(iconsDir, { recursive: true })
      console.log(`✓ Directorio creado: ${iconsDir}`)
    }

    console.log('Generando iconos PWA...\n')

    // Generar cada icono
    for (const icon of icons) {
      const outputPath = join(iconsDir, icon.name)
      
      await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // Fondo blanco
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath)

      console.log(`✓ Generado: ${icon.name} (${icon.size}x${icon.size}px)`)
    }

    console.log('\n✅ Todos los iconos PWA han sido generados exitosamente!')
    console.log(`📁 Ubicación: ${iconsDir}`)
  } catch (error) {
    console.error('Error al generar iconos:', error)
    process.exit(1)
  }
}

generateIcons()
