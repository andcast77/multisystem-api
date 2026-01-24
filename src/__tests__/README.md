# Tests de Conexión API-Database

Este directorio contiene los tests unitarios y de integración para verificar la conexión HTTP de la API al servicio database.

## Estructura

- `unit/database-client.test.ts` - Tests unitarios del cliente HTTP (con mocks de fetch)
- `integration/database-connection.test.ts` - Tests de integración que verifican conexión HTTP real al servicio database

## Ejecutar Tests

### Todos los tests
```bash
cd services/api
pnpm test
```

### Solo tests unitarios
```bash
pnpm test:unit
```

### Solo tests de integración
```bash
pnpm test:integration
```

### Tests en modo watch
```bash
pnpm test:watch
```

### Con cobertura
```bash
pnpm test:coverage
```

## Requisitos para Tests de Integración

Los tests de integración requieren que el servicio database esté disponible. Puedes usar:

1. **Docker Compose** (recomendado):
   ```bash
   docker-compose up -d database
   ```

2. **Servicio database local**: Asegúrate de que el servicio database esté corriendo en `http://localhost:3001`

## Variables de Entorno

Crea un archivo `.env.test` con:
```
NODE_ENV=test
DATABASE_API_URL=http://localhost:3001
PORT=3000
CORS_ORIGIN=http://localhost:3003,http://localhost:3004,http://localhost:3005
```

## Notas

- Los tests unitarios no requieren el servicio database (usan mocks de fetch)
- Los tests de integración requieren el servicio database corriendo
- Los tests de integración tienen timeouts de 10 segundos para dar tiempo a las requests HTTP
- Si el servicio database no está disponible, los tests de integración mostrarán warnings pero no fallarán (para desarrollo local)
