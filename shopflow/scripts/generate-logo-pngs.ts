import sharp from 'sharp'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

const sizes = [
  { name: 'shopflow-isotipo', size: 512 },
  { name: 'shopflow-isotipo@2x', size: 1024 },
]

const darkSizes = [
  { name: 'shopflow-isotipo-dark', size: 512 },
]

async function generatePNG(svgPath: string, outputPath: string, size: number, isDark = false) {
  try {
    const svgContent = readFileSync(svgPath, 'utf-8')
    
    // Modificar SVG para dark mode si es necesario
    let modifiedSvg = svgContent
    if (isDark) {
      // Cambiar gradiente para dark mode (colores más claros)
      modifiedSvg = svgContent
        .replace(/#3B82F6/g, '#60A5FA') // Azul más claro
        .replace(/#6366F1/g, '#818CF8') // Indigo más claro
    }
    
    // Asegurar que el directorio existe
    const outputDir = dirname(outputPath)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }
    
    await sharp(Buffer.from(modifiedSvg))
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparente
      })
      .png()
      .toFile(outputPath)
    
    console.log(`✓ Generated ${outputPath} (${size}x${size})`)
  } catch (error) {
    console.error(`✗ Error generating ${outputPath}:`, error)
    throw error
  }
}

async function main() {
  const baseDir = join(process.cwd(), 'public', 'logo', 'isotipo')
  const svgPath = join(baseDir, 'shopflow-isotipo.svg')
  
  if (!existsSync(svgPath)) {
    console.error(`SVG file not found: ${svgPath}`)
    process.exit(1)
  }
  
  console.log('Generating PNG files from SVG...\n')
  
  // Generar versiones normales
  for (const { name, size } of sizes) {
    const outputPath = join(baseDir, `${name}.png`)
    await generatePNG(svgPath, outputPath, size, false)
  }
  
  // Generar versión dark
  for (const { name, size } of darkSizes) {
    const outputPath = join(baseDir, `${name}.png`)
    await generatePNG(svgPath, outputPath, size, true)
  }
  
  console.log('\n✓ All PNG files generated successfully!')
}

main().catch(console.error)
