# 🔌 Referencia de API - Sistema de Impresoras

## 📋 Información General

Base URL: `https://tu-dominio.com/api`

Autenticación: Bearer Token (si aplica)

Formato de respuesta: JSON

## 🎫 Ticket Config API

### GET `/api/ticket-config`

Obtiene la configuración actual de tickets.

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "config-123",
    "ticketType": "TICKET",
    "header": "Mi Negocio\nDirección",
    "description": "Información adicional",
    "logoUrl": "https://cdn.example.com/logo.png",
    "footer": "Gracias por su compra",
    "thermalWidth": 48,
    "fontSize": 12,
    "copies": 1,
    "autoPrint": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errores:**
- `404`: Configuración no encontrada
- `500`: Error interno del servidor

### PUT `/api/ticket-config`

Actualiza la configuración de tickets.

**Body:**
```json
{
  "ticketType": "TICKET",
  "header": "Nuevo encabezado",
  "description": "Nueva descripción",
  "footer": "Nuevo pie",
  "thermalWidth": 48,
  "fontSize": 12,
  "copies": 1,
  "autoPrint": true
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "config-123",
    "updatedAt": "2024-01-15T10:45:00Z"
  },
  "message": "Configuración actualizada exitosamente"
}
```

**Errores:**
- `400`: Datos inválidos
- `422`: Error de validación
- `500`: Error interno del servidor

### POST `/api/ticket-config/logo`

Sube un logo para los tickets.

**Content-Type:** `multipart/form-data`

**Campos:**
- `file`: Archivo de imagen (JPG, PNG, GIF, máx 5MB)

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/logos/logo-123.png",
    "filename": "logo-123.png",
    "size": 245760
  }
}
```

**Errores:**
- `400`: Archivo inválido
- `413`: Archivo demasiado grande
- `415`: Tipo de archivo no soportado

### DELETE `/api/ticket-config/logo`

Elimina el logo actual.

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Logo eliminado exitosamente"
}
```

## 🏪 Store Config API

### GET `/api/store-config`

Obtiene la configuración general de la tienda.

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "store-123",
    "name": "Mi Tienda",
    "address": "Calle Principal 123",
    "phone": "+1234567890",
    "email": "contacto@mitienda.com",
    "taxId": "123456789",
    "currency": "USD",
    "timezone": "America/New_York"
  }
}
```

### PUT `/api/store-config`

Actualiza la configuración de la tienda.

**Body:**
```json
{
  "name": "Nueva Tienda",
  "address": "Nueva Dirección",
  "phone": "+0987654321",
  "email": "nuevo@email.com"
}
```

## 👤 User Preferences API

### GET `/api/user-preferences`

Obtiene las preferencias del usuario actual.

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "theme": "light",
    "language": "es",
    "printer": "default",
    "notifications": true,
    "autoSave": true
  }
}
```

### PUT `/api/user-preferences`

Actualiza las preferencias del usuario.

**Body:**
```json
{
  "theme": "dark",
  "language": "en",
  "notifications": false
}
```

## 🖨️ Printing API

### POST `/api/print`

Envía un trabajo de impresión (futuro).

**Body:**
```json
{
  "type": "ticket",
  "data": {
    "invoiceNumber": "001-001",
    "items": [...],
    "total": 99.99
  },
  "printer": "thermal-printer-1"
}
```

## 📊 Health Check API

### GET `/api/health`

Verifica el estado del servicio.

**Respuesta Exitosa (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

## 🔒 Autenticación

### Headers Requeridos

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Errores de Autenticación

- `401`: No autorizado
- `403`: Prohibido

## 📋 Códigos de Estado HTTP

- `200`: Éxito
- `201`: Creado
- `400`: Solicitud incorrecta
- `401`: No autorizado
- `403`: Prohibido
- `404`: No encontrado
- `413`: Payload demasiado grande
- `415`: Tipo de medio no soportado
- `422`: Entidad no procesable (validación)
- `429`: Demasiadas solicitudes
- `500`: Error interno del servidor

## 🛠️ SDK y Librerías

### JavaScript/TypeScript

```javascript
// Configuración del cliente
const apiClient = {
  baseURL: 'https://tu-dominio.com/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

// Ejemplo de uso
async function updateTicketConfig(config) {
  const response = await fetch(`${apiClient.baseURL}/ticket-config`, {
    method: 'PUT',
    headers: apiClient.headers,
    body: JSON.stringify(config)
  });

  return response.json();
}
```

### Python

```python
import requests

class PrinterAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def get_ticket_config(self):
        response = requests.get(
            f'{self.base_url}/ticket-config',
            headers=self.headers
        )
        return response.json()

    def update_ticket_config(self, config):
        response = requests.put(
            f'{self.base_url}/ticket-config',
            headers=self.headers,
            json=config
        )
        return response.json()
```

## 🔍 Rate Limiting

- **Autenticado**: 1000 requests/hora
- **No autenticado**: 100 requests/hora
- **Headers de respuesta**:
  - `X-RateLimit-Limit`: Límite total
  - `X-RateLimit-Remaining`: Restantes
  - `X-RateLimit-Reset`: Timestamp de reset

## 📝 Webhooks

### Configuración de Webhooks

POST a `/api/webhooks/config` con:

```json
{
  "url": "https://tu-app.com/webhooks/printer",
  "events": ["config.updated", "print.completed"],
  "secret": "tu-webhook-secret"
}
```

### Eventos Soportados

- `config.updated`: Configuración modificada
- `print.completed`: Impresión finalizada
- `error.occurred`: Error en el sistema

### Payload de Ejemplo

```json
{
  "event": "config.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "configId": "config-123",
    "changes": {
      "header": "Nuevo encabezado"
    }
  }
}
```

## 🔐 Seguridad

### Validaciones Implementadas

- **Input sanitization**: Prevención XSS
- **File validation**: Tipos y tamaños permitidos
- **Rate limiting**: Protección contra abuso
- **CORS**: Control de orígenes permitidos

### Certificados SSL

- **Requerido**: HTTPS obligatorio en producción
- **Certificado**: Let's Encrypt recomendado
- **Configuración**: A+ en SSL Labs

## 📊 Monitoreo

### Métricas Disponibles

- **Response time**: Latencia promedio
- **Error rate**: Porcentaje de errores
- **Throughput**: Requests por segundo
- **Availability**: Uptime del servicio

### Logs

Los logs incluyen:
- Timestamp
- Request ID
- User ID (si autenticado)
- Endpoint
- Response status
- Error details (si aplica)

## 🚀 Versionado

### Versionado de API

- **Current**: v1
- **Endpoint**: `/api/v1/...`
- **Backward compatibility**: Mantenida por 12 meses

### Changelog

#### v1.0.0 (2024-01-15)
- ✅ Lanzamiento inicial
- ✅ CRUD completo de configuración
- ✅ Upload de logos
- ✅ API de health check

#### Próximas versiones
- **v1.1.0**: Webhooks y notificaciones
- **v1.2.0**: Impresión directa con Web Serial API
- **v2.0.0**: Soporte multi-tenant

---

**¿Necesitas ayuda?** Revisa los [ejemplos de código](../examples/) o contacta al equipo de desarrollo.