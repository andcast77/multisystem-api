import sharp from 'sharp'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

const logoCompletoSizes = [
  { name: 'shopflow-logo-horizontal', width: 800, height: 200 },
  { name: 'shopflow-logo-horizontal@2x', width: 1600, height: 400 },
  { name: 'shopflow-logo-vertical', width: 300, height: 400 },
  { name: 'shopflow-logo-vertical@2x', width: 600, height: 800 },
]

const isologoSizes = [
  { name: 'shopflow-isologo', width: 600, height: 150 },
  { name: 'shopflow-isologo@2x', width: 1200, height: 300 },
]

async function generatePNG(svgPath: string, outputPath: string, width: number, height: number) {
  try {
    const svgContent = readFileSync(svgPath, 'utf-8')
    
    // Asegurar que el directorio existe
    const outputDir = dirname(outputPath)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }
    
    await sharp(Buffer.from(svgContent))
      .resize(width, height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparente
      })
      .png()
      .toFile(outputPath)
    
    console.log(`✓ Generated ${outputPath} (${width}x${height})`)
  } catch (error) {
    console.error(`✗ Error generating ${outputPath}:`, error)
    throw error
  }
}

async function main() {
  const logoCompletoDir = join(process.cwd(), 'public', 'logo', 'logo-completo')
  const isologoDir = join(process.cwd(), 'public', 'logo', 'isologo')
  
  console.log('Generating logo completo PNG files...\n')
  
  // Generar logos completos
  for (const { name, width, height } of logoCompletoSizes) {
    const svgName = name.includes('vertical') ? 'shopflow-logo-vertical.svg' : 'shopflow-logo-horizontal.svg'
    const svgPath = join(logoCompletoDir, svgName)
    const outputPath = join(logoCompletoDir, `${name}.png`)
    
    if (!existsSync(svgPath)) {
      console.error(`SVG file not found: ${svgPath}`)
      continue
    }
    
    await generatePNG(svgPath, outputPath, width, height)
  }
  
  console.log('\nGenerating isologo PNG files...\n')
  
  // Generar isologos
  for (const { name, width, height } of isologoSizes) {
    const svgPath = join(isologoDir, 'shopflow-isologo.svg')
    const outputPath = join(isologoDir, `${name}.png`)
    
    if (!existsSync(svgPath)) {
      console.error(`SVG file not found: ${svgPath}`)
      continue
    }
    
    await generatePNG(svgPath, outputPath, width, height)
  }
  
  console.log('\n✓ All logo completo PNG files generated successfully!')
}

main().catch(console.error)
