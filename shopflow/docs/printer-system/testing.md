# 🧪 Guía de Testing - Sistema de Impresoras

## 📋 Estrategia de Testing

### Niveles de Testing

1. **Unit Tests**: Componentes individuales
2. **Integration Tests**: API endpoints y servicios
3. **E2E Tests**: Flujos completos de usuario
4. **Performance Tests**: Carga y estrés
5. **Browser Compatibility Tests**: Multi-navegador

## 🧩 Unit Tests

### Configuración de Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Tests de Componentes

```javascript
// __tests__/TicketConfigForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TicketConfigForm } from '@/components/features/settings/TicketConfigForm'

describe('TicketConfigForm', () => {
  const mockProps = {
    initialData: {
      ticketType: 'TICKET',
      header: 'Test Header',
      footer: 'Test Footer'
    },
    onSubmit: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form fields correctly', () => {
    render(<TicketConfigForm {...mockProps} />)

    expect(screen.getByLabelText(/tipo de comprobante/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/encabezado/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/pie de página/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<TicketConfigForm {...mockProps} />)

    const submitButton = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/encabezado es requerido/i)).toBeInTheDocument()
    })
  })

  it('submits form data correctly', async () => {
    render(<TicketConfigForm {...mockProps} />)

    // Fill form
    fireEvent.change(screen.getByLabelText(/encabezado/i), {
      target: { value: 'Nuevo Encabezado' }
    })

    const submitButton = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith({
        ticketType: 'TICKET',
        header: 'Nuevo Encabezado',
        footer: 'Test Footer'
      })
    })
  })
})
```

### Tests de Utilidades

```javascript
// __tests__/utils/validation.test.ts
import { validateTicketConfig } from '@/lib/validations/ticketConfig'

describe('TicketConfig Validation', () => {
  it('validates correct config', () => {
    const validConfig = {
      ticketType: 'TICKET',
      header: 'Valid Header',
      footer: 'Valid Footer',
      fontSize: 12
    }

    const result = validateTicketConfig(validConfig)
    expect(result.success).toBe(true)
  })

  it('rejects invalid ticket type', () => {
    const invalidConfig = {
      ticketType: 'INVALID',
      header: 'Valid Header'
    }

    const result = validateTicketConfig(invalidConfig)
    expect(result.success).toBe(false)
    expect(result.errors).toContain('Tipo de comprobante inválido')
  })

  it('validates header length', () => {
    const longHeader = 'A'.repeat(501) // Too long
    const invalidConfig = {
      ticketType: 'TICKET',
      header: longHeader
    }

    const result = validateTicketConfig(invalidConfig)
    expect(result.success).toBe(false)
    expect(result.errors).toContain('Encabezado demasiado largo')
  })
})
```

## 🔗 Integration Tests

### Configuración de API Tests

```javascript
// __tests__/api/ticket-config.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/ticket-config'
import { prisma } from '@/lib/prisma'

describe('/api/ticket-config', () => {
  beforeEach(async () => {
    await prisma.ticketConfig.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns empty config initially', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.data).toBeNull()
  })

  it('creates new config', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        ticketType: 'TICKET',
        header: 'Test Header',
        footer: 'Test Footer'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.data.ticketType).toBe('TICKET')
  })

  it('validates input data', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        ticketType: 'INVALID_TYPE'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
  })
})
```

### Tests de Servicios

```javascript
// __tests__/services/printing.test.ts
import { generateESCPOSCommands, printToStandardPrinter } from '@/lib/services/printing'

describe('Printing Service', () => {
  const mockConfig = {
    ticketType: 'TICKET',
    header: 'Test Store',
    footer: 'Thank you',
    fontSize: 12
  }

  const mockSale = {
    invoiceNumber: '001-001',
    items: [
      { name: 'Product 1', quantity: 2, price: 10.00 },
      { name: 'Product 2', quantity: 1, price: 15.00 }
    ],
    total: 35.00
  }

  it('generates ESC/POS commands', () => {
    const commands = generateESCPOSCommands(mockSale, mockConfig)

    expect(commands).toBeInstanceOf(Uint8Array)
    expect(commands.length).toBeGreaterThan(0)

    // Check for basic ESC/POS commands
    expect(commands).toContain(0x1B) // ESC
    expect(commands).toContain(0x40) // Initialize
  })

  it('handles empty sale data', () => {
    const emptySale = {
      invoiceNumber: '001-002',
      items: [],
      total: 0
    }

    const commands = generateESCPOSCommands(emptySale, mockConfig)
    expect(commands).toBeInstanceOf(Uint8Array)
  })

  it('validates config parameters', () => {
    const invalidConfig = {
      ticketType: 'INVALID',
      header: '',
      footer: 'Footer'
    }

    expect(() => {
      generateESCPOSCommands(mockSale, invalidConfig)
    }).toThrow()
  })
})
```

## 🌐 E2E Tests

### Configuración de Playwright

```javascript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' }
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' }
    }
  ]
}

export default config
```

### Tests E2E Completos

```javascript
// e2e/ticket-config.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Configuración de Tickets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings')
  })

  test('configuración completa de ticket', async ({ page }) => {
    // Seleccionar tipo de ticket
    await page.selectOption('[name="ticketType"]', 'TICKET')

    // Completar encabezado
    await page.fill('[name="header"]', 'Mi Tienda\nDirección Principal\nTel: 123-456-7890')

    // Agregar descripción
    await page.fill('[name="description"]', 'Información adicional del negocio')

    // Configurar pie de página
    await page.fill('[name="footer"]', 'Gracias por su preferencia\nwww.mitiienda.com')

    // Subir logo
    await page.setInputFiles('input[type="file"]', 'test-logo.png')

    // Configurar tamaño de fuente
    await page.selectOption('[name="fontSize"]', '12')

    // Verificar preview se actualiza
    await expect(page.locator('.preview-content')).toContainText('Mi Tienda')

    // Probar impresión
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button:has-text("Probar Impresión")')
    ])

    await expect(popup.locator('body')).toContainText('Mi Tienda')

    // Guardar configuración
    await page.click('button:has-text("Guardar Configuración")')
    await expect(page.locator('.success-message')).toBeVisible()
  })

  test('validación de campos requeridos', async ({ page }) => {
    // Intentar guardar sin datos
    await page.click('button:has-text("Guardar Configuración")')

    // Verificar mensajes de error
    await expect(page.locator('.error-message')).toContainText('Encabezado es requerido')
  })

  test('restaurar configuración', async ({ page }) => {
    // Hacer cambios
    await page.fill('[name="header"]', 'Nuevo encabezado')

    // Verificar indicador de cambios
    await expect(page.locator('.unsaved-changes')).toBeVisible()

    // Restaurar
    await page.click('button:has-text("Restaurar Valores")')

    // Verificar restauración
    await expect(page.locator('[name="header"]')).toHaveValue('')
    await expect(page.locator('.unsaved-changes')).not.toBeVisible()
  })
})
```

## ⚡ Performance Tests

### Configuración de k6

```javascript
// performance/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 }     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'], // 99% of requests should be below 1s
    http_req_failed: ['rate<0.1']      // Error rate should be below 10%
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Test configuración de tickets
  const response = http.get(`${BASE_URL}/api/ticket-config`)

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000
  })

  sleep(1)
}
```

### Stress Test

```javascript
// performance/stress-test.js
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 300 },
    { duration: '30s', target: 400 },
    { duration: '2m', target: 0 }
  ]
}

export default function () {
  const payload = JSON.stringify({
    ticketType: 'TICKET',
    header: 'Stress Test Header',
    footer: 'Stress Test Footer',
    fontSize: 12
  })

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const response = http.put(`${BASE_URL}/api/ticket-config`, payload, params)

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 2000
  })
}
```

## 🔍 Testing de Compatibilidad

### Tests Multi-Navegador Automatizados

```javascript
// __tests__/browser-compatibility.test.ts
import puppeteer from 'puppeteer'

describe('Browser Compatibility', () => {
  let browser: any
  let page: any

  beforeAll(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterAll(async () => {
    await browser.close()
  })

  test('Chrome - Configuración básica', async () => {
    await page.goto('http://localhost:3000/admin/settings')

    // Verificar elementos principales
    const headerInput = await page.$('[name="header"]')
    expect(headerInput).toBeTruthy()

    const ticketTypeSelect = await page.$('[name="ticketType"]')
    expect(ticketTypeSelect).toBeTruthy()

    // Probar funcionalidad básica
    await page.type('[name="header"]', 'Test Header')
    const value = await page.$eval('[name="header"]', el => el.value)
    expect(value).toBe('Test Header')
  })

  test('Chrome - Funcionalidad de impresión', async () => {
    await page.goto('http://localhost:3000/admin/settings')

    // Configurar datos básicos
    await page.type('[name="header"]', 'Print Test')
    await page.type('[name="footer"]', 'Print Footer')

    // Hacer clic en imprimir (en una nueva página)
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button:has-text("Probar Impresión")')
    ])

    // Verificar contenido de impresión
    const content = await popup.$eval('body', el => el.textContent)
    expect(content).toContain('Print Test')
    expect(content).toContain('Print Footer')
  })
})
```

## 📊 Cobertura de Código

### Configuración de Cobertura

```javascript
// jest.config.js (continuación)
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}',
  '!src/**/*.d.ts',
  '!src/pages/_app.tsx',
  '!src/pages/_document.tsx'
],
coverageReporters: ['text', 'lcov', 'html'],
coverageDirectory: 'coverage',
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Reporte de Cobertura

```bash
# Ejecutar tests con cobertura
npm run test:coverage

# Ver reporte HTML
open coverage/lcov-report/index.html
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Scripts de Package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:performance": "k6 run performance/load-test.js",
    "test:browser": "node scripts/test-browser-compatibility.js"
  }
}
```

## 📋 Checklist de Testing

### Pre-Commit
- [ ] Unit tests pasan
- [ ] Linting sin errores
- [ ] Cobertura de código > 80%
- [ ] Build exitoso

### Pre-Release
- [ ] Integration tests pasan
- [ ] E2E tests pasan
- [ ] Performance tests pasan
- [ ] Browser compatibility verificada
- [ ] Security tests pasan

### Post-Release
- [ ] Monitoreo de errores
- [ ] Performance monitoring
- [ ] User feedback
- [ ] Hotfixes preparados

---

**Nota**: Mantén los tests actualizados con cada cambio significativo en el código.