# Tests y Scripts de Prueba

## 📁 Estructura de Carpetas

```
tests/
├── api/           # Pruebas de endpoints de la API
├── database/      # Pruebas de base de datos
├── scripts/       # Scripts de debugging y utilidades
└── README.md      # Este archivo
```

## 🧪 Pruebas de API (`tests/api/`)

### Archivos de Prueba:
- `test-api-endpoints.mjs` - Pruebas completas de todos los endpoints
- `test-login-simple.mjs` - Prueba específica del login
- `test-simple-login.mjs` - Prueba alternativa del login
- `test-login.mjs` - Prueba básica de autenticación
- `test-endpoints.mjs` - Pruebas extensivas de endpoints
- `test-authenticated-endpoints.js` - Pruebas de endpoints autenticados
- `test-workday.js` - Pruebas de funcionalidad de jornada laboral
- `test-apis.js` - Pruebas generales de APIs

### Uso:
```bash
# Ejecutar todas las pruebas de API
node tests/api/test-api-endpoints.mjs

# Probar login específico
node tests/api/test-login-simple.mjs
```

## 🗄️ Pruebas de Base de Datos (`tests/database/`)

### Archivos de Prueba:
- `check-full-db.mjs` - Verificación completa de la base de datos
- `check-db.mjs` - Verificación básica de la base de datos

### Uso:
```bash
# Verificar integridad completa de la BD
node tests/database/check-full-db.mjs

# Verificación básica
node tests/database/check-db.mjs
```

## 🔧 Scripts de Debugging (`tests/scripts/`)

### Archivos de Utilidad:
- `debug-user.mjs` - Script para debugging de usuarios

### Uso:
```bash
# Debugging de usuarios
node tests/scripts/debug-user.mjs
```

## 🚀 Ejecutar Todas las Pruebas

### 1. Pruebas de Base de Datos:
```bash
node tests/database/check-full-db.mjs
```

### 2. Pruebas de API:
```bash
node tests/api/test-api-endpoints.mjs
```

### 3. Pruebas Específicas:
```bash
# Login
node tests/api/test-login-simple.mjs

# Base de Datos
node tests/database/check-full-db.mjs
```

## 📋 Orden Recomendado de Pruebas

1. **Base de Datos**: Verificar que los datos estén correctos
2. **API**: Probar todos los endpoints
3. **Integración**: Probar flujos completos

## 🔍 Troubleshooting

### Si las pruebas fallan:

1. **Verificar que el servidor esté corriendo**:
   ```bash
   npm run dev
   ```

2. **Verificar la base de datos**:
   ```bash
   node tests/database/check-db.mjs
   ```

4. **Verificar variables de entorno**:
   ```bash
   # Asegurar que .env esté configurado
   cat .env
   ```

## 📝 Notas

- Las pruebas están organizadas por funcionalidad
- Cada carpeta tiene un propósito específico
- Los scripts de debugging están separados de las pruebas
- Todas las pruebas pueden ejecutarse independientemente 