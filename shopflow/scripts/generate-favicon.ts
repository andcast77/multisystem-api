import sharp from 'sharp'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

const faviconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
]


async function generateICO(outputDir: string) {
  // Para ICO, usar el favicon de 32x32 como base
  const png32Path = join(outputDir, 'favicon-32x32.png')
  const icoPath = join(outputDir, 'favicon.ico')
  
  if (!existsSync(png32Path)) {
    console.error(`PNG file not found: ${png32Path}`)
    return
  }
  
  try {
    // Copiar el PNG de 32x32 como ICO (los navegadores modernos aceptan PNG como ICO)
    const pngBuffer = readFileSync(png32Path)
    const fs = await import('fs/promises')
    await fs.writeFile(icoPath, pngBuffer)
    console.log(`✓ Generated ${icoPath} (from 32x32 PNG)`)
  } catch (error) {
    console.error(`✗ Error generating ICO:`, error)
  }
}

async function main() {
  const faviconDir = join(process.cwd(), 'public', 'logo', 'favicon')
  
  // Asegurar que el directorio existe
  if (!existsSync(faviconDir)) {
    mkdirSync(faviconDir, { recursive: true })
  }
  
  console.log('Generating favicon files...\n')
  
  // Generar favicons en diferentes tamaños usando SVG inline
  for (const { size, name } of faviconSizes) {
    const outputPath = join(faviconDir, name)
    // Crear SVG simplificado inline para cada tamaño
    const simplifiedSvg = `
      <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="faviconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Versión simplificada para favicon: solo la flecha curva -->
        <path d="M 100 256 Q 200 150, 300 200 T 412 256" 
              fill="none" 
              stroke="url(#faviconGradient)" 
              stroke-width="28" 
              stroke-linecap="round" 
              stroke-linejoin="round"/>
        <path d="M 380 240 L 412 256 L 380 272 Z" 
              fill="url(#faviconGradient)"/>
      </svg>
    `
    
    try {
      await sharp(Buffer.from(simplifiedSvg))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparente
        })
        .png()
        .toFile(outputPath)
      
      console.log(`✓ Generated ${outputPath} (${size}x${size})`)
    } catch (error) {
      console.error(`✗ Error generating ${outputPath}:`, error)
    }
  }
  
  // Generar ICO
  console.log('\nGenerating ICO file...\n')
  await generateICO(faviconDir)
  
  console.log('\n✓ All favicon files generated successfully!')
}

main().catch(console.error)
