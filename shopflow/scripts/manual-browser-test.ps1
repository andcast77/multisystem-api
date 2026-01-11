# Script de Testing Manual Multi-Navegador
# Abre navegadores en la página de configuración para testing manual

param(
    [string]$Url = "http://localhost:3000/admin/settings"
)

Write-Host "=== Testing Manual Multi-Navegador ===" -ForegroundColor Cyan
Write-Host "URL: $Url" -ForegroundColor Yellow
Write-Host ""

# Verificar que el servidor esté funcionando
Write-Host "Verificando servidor..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Servidor responde correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Servidor no responde en $Url" -ForegroundColor Red
    Write-Host "Asegúrate de que el servidor esté ejecutándose con 'npm run dev'" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Abriendo navegadores para testing manual..." -ForegroundColor Cyan

# Lista de navegadores disponibles
$navegadores = @()

# Chrome
$chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (Test-Path $chromePath) {
    $navegadores += @{
        Nombre = "Chrome"
        Path = $chromePath
        Args = @("--new-window", "--disable-web-security", "--disable-features=VizDisplayCompositor")
    }
}

# Edge
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (Test-Path $edgePath) {
    $navegadores += @{
        Nombre = "Edge"
        Path = $edgePath
        Args = @("--new-window")
    }
}

# Firefox
$firefoxPath = "${env:ProgramFiles}\Mozilla Firefox\firefox.exe"
if (Test-Path $firefoxPath) {
    $navegadores += @{
        Nombre = "Firefox"
        Path = $firefoxPath
        Args = @("-new-window")
    }
}

if ($navegadores.Count -eq 0) {
    Write-Host "❌ No se encontraron navegadores compatibles" -ForegroundColor Red
    exit 1
}

Write-Host "Navegadores encontrados: $($navegadores.Count)" -ForegroundColor Green
$navegadores | ForEach-Object { Write-Host "  - $($_.Nombre)" -ForegroundColor Gray }

Write-Host ""
Write-Host "Instrucciones de testing:" -ForegroundColor Yellow
Write-Host "1. Cada navegador se abrirá en una nueva ventana" -ForegroundColor White
Write-Host "2. Navega a la página de configuración si no se abre automáticamente" -ForegroundColor White
Write-Host "3. Prueba las siguientes funcionalidades:" -ForegroundColor White
Write-Host "   - Cambio de tipo de comprobante (Ticket/Hoja)" -ForegroundColor Gray
Write-Host "   - Preview en tiempo real" -ForegroundColor Gray
Write-Host "   - Subida de logos" -ForegroundColor Gray
Write-Host "   - Función 'Probar Impresión'" -ForegroundColor Gray
Write-Host "   - Guardado de configuración" -ForegroundColor Gray
Write-Host "4. Anota cualquier problema o diferencia visual" -ForegroundColor White
Write-Host ""

# Abrir navegadores
foreach ($nav in $navegadores) {
    Write-Host "Abriendo $($nav.Nombre)..." -ForegroundColor Cyan
    try {
        $argumentos = $nav.Args + $Url
        Start-Process -FilePath $nav.Path -ArgumentList $argumentos
        Write-Host "✅ $($nav.Nombre) abierto exitosamente" -ForegroundColor Green
        Start-Sleep -Seconds 2  # Pequeña pausa entre navegadores
    } catch {
        Write-Host "❌ Error al abrir $($nav.Nombre): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Testing iniciado ===" -ForegroundColor Green
Write-Host "Los navegadores se han abierto. Realiza las pruebas manualmente." -ForegroundColor White
Write-Host "Presiona Enter para continuar cuando termines..." -ForegroundColor Yellow
Read-Host