---
name: Unificar Base de Datos MultiSystem
overview: Unificar todos los modelos de Prisma de shopflow y workify en un único schema.prisma centralizado en la API, eliminando configuraciones de Prisma de los frontends y asegurando que solo la API acceda directamente a PostgreSQL.
todos: []
---

# Plan: Unificar Base de Datos MultiSystem

## Objetivo

Consolidar todos los modelos de Prisma en un único `schema.prisma` en la API, eliminando dependencias de Prisma de los frontends (shopflow y workify) para que solo la API acceda directamente a PostgreSQL.

## Arquitectura Actual vs Objetivo

### Antes:

- API: Tiene schema.prisma básico con modelos simplificados
- Workify: Usa Prisma directamente (20+ modelos: Company, Department, Position, Role, Employee, TimeEntry, Payroll, License, Document, AuditLog, Notification, etc.)
- Shopflow: Usa Prisma directamente (16+ modelos: Product, Category, Supplier, Customer, Sale, SaleItem, StoreConfig, TicketConfig, UserPreferences, InventoryTransfer, LoyaltyConfig, LoyaltyPoint, Notification, ActionHistory, etc.)

### Después:

- API: Schema.prisma unificado con TODOS los modelos de ambos módulos
- Workify: Sin Prisma, solo consume API vía HTTP
- Shopflow: Sin Prisma, solo consume API vía HTTP

## Tareas

### 1. Actualizar schema.prisma de la API

**Archivo**: `api/prisma/schema.prisma`

**DECISIONES CRÍTICAS A RESOLVER:**

#### Modelo User - Conflicto de estructura:

- **Workify User**: firstName, lastName, phone, twoFactorEnabled, twoFactorSecret, isActive
- **API User actual**: name, role (enum), active
- **Solución**: Unificar usando estructura de Workify (más completa) y agregar campo `role` como enum para compatibilidad con ShopFlow

#### Modelo Company - Conflicto de estructura:

- **Workify Company**: parentId (jerarquía), departments, más relaciones
- **API Company actual**: Simple, sin jerarquía
- **Solución**: Usar estructura de Workify (más completa) con parentId opcional

**Agregar TODOS los modelos faltantes de Workify:**

**Estructura Organizacional:**

- `Department` (departamentos con jerarquía)
- `Position` (posiciones/cargos con SalaryType, OvertimeType, etc.)

**Usuarios y Permisos:**

- `Role` (roles con jerarquía y companyId)
- `Permission` (permisos globales)
- `UserRole` (relación muchos-a-muchos User-Role-Company)
- `UserPermission` (permisos directos de usuario)

**Nómina y Licencias:**

- `Payroll` (nómina de empleados)
- `PayrollRule` (reglas de cálculo de nómina)
- `License` (licencias/vacaciones)
- `LicensePolicy` (políticas de licencias por empresa)

**Documentos y Auditoría:**

- `Document` (documentos versionados)
- `AuditLog` (logs de auditoría)
- `IntegrationLog` (logs de integraciones)

**Notificaciones y Multi-idioma:**

- `Notification` (notificaciones por usuario/empresa)
- `Translation` (traducciones multi-idioma)

**Reportes:**

- `Report` (configuración de reportes)

**Asistencia y Calendario:**

- `WorkShift` (turnos de trabajo - estructura completa de Workify)
- `Schedule` (horarios semanales de empleados)
- `SpecialDayAssignment` (asignaciones especiales de días)
- `Holidays` (días festivos por empresa)

**Agregar TODOS los modelos faltantes de ShopFlow:**

**Configuración:**

- `StoreConfig` (configuración de tienda: currency, taxRate, lowStockAlert, invoicePrefix, invoiceNumber, allowSalesWithoutStock)
- `TicketConfig` (configuración de impresión: ticketType, header, footer, logoUrl, thermalWidth, fontSize, copies, autoPrint)
- `UserPreferences` (preferencias de usuario: language)

**Inventario:**

- `InventoryTransfer` (transferencias entre tiendas: fromStoreId, toStoreId, productId, quantity, status, completedAt, createdById)

**Fidelidad:**

- `LoyaltyConfig` (configuración de puntos: pointsPerDollar, redemptionRate, pointsExpireMonths, minPurchaseForPoints, maxPointsPerPurchase, isActive)
- `LoyaltyPoint` (puntos de fidelidad: customerId, saleId, points, type, description, expiresAt)

**Notificaciones ShopFlow:**

- `NotificationPreference` (preferencias de notificaciones: pushEnabled, emailEnabled, inAppEnabled, preferences JSON)

**Auditoría ShopFlow:**

- `ActionHistory` (historial de acciones: userId, action, entityType, entityId, details JSON, ipAddress, userAgent)

**Actualizar modelos existentes:**

**User (DECISIÓN CRÍTICA):**

- Usar estructura de Workify: `firstName`, `lastName`, `phone`, `twoFactorEnabled`, `twoFactorSecret`
- Agregar campo `role` (enum UserRole) para compatibilidad con ShopFlow
- Mantener `isActive` (Workify) como estándar
- Relaciones: roles (UserRole[]), permissions (UserPermission[]), sales (Sale[]), actionHistory (ActionHistory[]), notifications (Notification[]), userPreferences (UserPreferences?)

**Company:**

- Agregar `parentId` (jerarquía), `name` debe ser `@unique`
- Agregar todas las relaciones de Workify: departments, roles, employees, payrolls, documents, reports, auditLogs, etc.

**Employee:**

- Agregar `departmentId`, `userId` (opcional), `positionId`
- Agregar campos custom: customSalaryAmount, customSalaryType, customOvertimeEligible, etc.
- Agregar `status` (enum EmployeeStatus: ACTIVE, INACTIVE, SUSPENDED)
- Agregar `idNumber`, `birthDate`, `gender`, `dateJoined`, `isDeleted`, `deletedAt`

**TimeEntry:**

- Actualizar para usar `companyId` directamente (no userId)
- Cambiar estructura: `date`, `clockIn`, `clockOut` (en lugar de startTime/endTime)
- Remover relación directa con User, mantener solo con Employee y Company

**Product:**

- Agregar campos: `sku` (@unique), `barcode`, `cost`, `minStock`, `maxStock`, `storeId`, `imageUrl`
- Mantener relaciones existentes

**Category:**

- Agregar jerarquía: `parentId`, `parent`, `children` (similar a Workify)

**Supplier:**

- Agregar campos: `city`, `state`, `taxId`, `active`

**Sale:**

- Agregar campos: `invoiceNumber` (@unique), `subtotal`, `tax`, `discount`, `notes`
- Agregar valor `REFUNDED` a enum SaleStatus

**SaleItem:**

- Agregar campo `discount`

**Customer:**

- Mantener estructura básica, agregar relación con `LoyaltyPoint[]`

**Notification (unificar con Workify):**

- ShopFlow tiene estructura diferente (userId, type, priority, title, message, data, actionUrl, status, expiresAt, readAt)
- Workify tiene estructura más simple (userId, companyId, type, title, message, meta, isRead)
- **Decisión**: Usar estructura de ShopFlow (más completa) y agregar `companyId` opcional para Workify

### 2. Eliminar Prisma de Workify

**Archivos a modificar**:

- `workify/package.json`: Remover `@prisma/client` y `prisma` de dependencies/devDependencies
- `workify/src/lib/prisma.ts`: Eliminar archivo (ya no se necesita)
- `workify/scripts/seed.js`: Eliminar o comentar (los seeds se ejecutan desde la API)
- `workify/package.json`: Remover scripts de Prisma (`db:generate`, `db:push`, `db:migrate`, etc.)

**Archivos que usan Prisma**:

- Buscar y reemplazar imports de `@prisma/client` en `workify/src`
- Actualizar servicios para usar la API en lugar de Prisma directo
- Actualizar tipos para usar tipos de la API en lugar de tipos de Prisma

### 3. Eliminar Prisma de Shopflow

**Archivos a modificar**:

- `shopflow/package.json`: Verificar si tiene `@prisma/client` y removerlo
- `shopflow/src/lib/prisma.ts`: Ya está corregido para no ejecutarse en cliente, pero debería eliminarse completamente
- `shopflow/src/lib/auth.ts`: Ya usa dynamic imports, pero debería usar solo la API

**Archivos que usan Prisma**:

- Buscar servicios que usen Prisma directamente y actualizarlos para usar la API
- Actualizar tipos para usar tipos de la API

### 4. Actualizar seed de la API

**Archivo**: `api/prisma/seed.ts`

Agregar seeds completos para modelos de Workify basados en `workify/scripts/seed.js`:

- Companies (con jerarquía opcional)
- Departments
- Positions
- Roles (con jerarquía)
- Permissions
- WorkShifts
- Employees (con position, department)
- TimeEntries
- Holidays
- Schedules
- SpecialDayAssignments
- Licenses (opcional)
- Payrolls (opcional)

### 5. Actualizar rutas de la API

**Archivos**: `api/src/routes/*.ts`

**Endpoints Workify:**

- `/api/workify/companies` (GET, POST, PUT, DELETE)
- `/api/workify/departments` (GET, POST, PUT, DELETE)
- `/api/workify/positions` (GET, POST, PUT, DELETE)
- `/api/workify/roles` (GET, POST, PUT, DELETE)
- `/api/workify/work-shifts` (GET, POST, PUT, DELETE)
- `/api/workify/employees` (GET, POST, PUT, DELETE, import)
- `/api/workify/time-entries` (GET, POST, PUT, DELETE, import)
- `/api/workify/holidays` (GET, POST, PUT, DELETE)
- `/api/workify/schedules` (GET, POST, PUT, DELETE)
- `/api/workify/special-assignments` (GET, POST, PUT, DELETE)
- `/api/workify/payrolls` (GET, POST, PUT)
- `/api/workify/licenses` (GET, POST, PUT)
- `/api/workify/documents` (GET, POST, DELETE)
- `/api/workify/notifications` (GET, PUT para marcar como leído)
- `/api/workify/reports` (GET, POST)

**Endpoints ShopFlow:**

- `/api/shopflow/products` (GET, POST, PUT, DELETE) - con filtros (search, categoryId, active, minPrice, maxPrice, lowStock, sku, barcode)
- `/api/shopflow/categories` (GET, POST, PUT, DELETE) - con jerarquía (parentId, includeChildren)
- `/api/shopflow/suppliers` (GET, POST, PUT, DELETE)
- `/api/shopflow/customers` (GET, POST, PUT, DELETE)
- `/api/shopflow/sales` (GET, POST, PUT) - con filtros (customerId, userId, status, paymentMethod, startDate, endDate)
- `/api/shopflow/store-config` (GET, PUT)
- `/api/shopflow/ticket-config` (GET, PUT)
- `/api/shopflow/user-preferences` (GET, PUT)
- `/api/shopflow/inventory-transfers` (GET, POST, PUT)
- `/api/shopflow/loyalty/config` (GET, PUT)
- `/api/shopflow/loyalty/points` (GET, POST) - para customer
- `/api/shopflow/notifications` (GET, POST, PUT) - marcar como leído
- `/api/shopflow/notification-preferences` (GET, PUT)
- `/api/shopflow/action-history` (GET) - con filtros (userId, action, entityType, entityId, startDate, endDate)

### 6. Actualizar docker-compose.yml

**Archivo**: `docker-compose.yml`

Verificar que:

- Solo la API tenga `DATABASE_URL`
- Los frontends NO tengan `DATABASE_URL`
- El servicio `migrate-db` use el schema unificado

### 7. Actualizar .gitignore

**Archivos**: `.gitignore`, `api/.gitignore`

Asegurar que `prisma/migrations/` esté ignorado (si se usan migraciones formales)

## Consideraciones

1. **Compatibilidad de tipos**: Los frontends necesitarán tipos TypeScript compartidos o generados desde la API. Considerar crear un paquete de tipos compartidos o generar desde OpenAPI/Swagger.

2. **Migración de datos**: Como no hay datos existentes, podemos empezar desde cero. El schema unificado será la fuente de verdad.

3. **Autenticación unificada**: 

- El modelo `User` será compartido con estructura de Workify (firstName, lastName)
- Mantener campo `role` (enum) para compatibilidad con ShopFlow
- Los roles de Workify se manejan a través de `UserRole` (muchos-a-muchos con Company)
- La autenticación debe retornar información según el módulo que la solicite

4. **Relaciones complejas**: 

- Company tiene jerarquía (parentId)
- Role tiene jerarquía (parentId)
- Department tiene jerarquía (parentId)
- Employee puede tener userId opcional (vinculación con User)
- TimeEntry usa companyId directamente (no userId)

5. **Enums a agregar**:

**Workify:**

- `SalaryType` (hour, day, week, biweek, month)
- `OvertimeType` (multiplier, fixed)
- `Gender` (MALE, FEMALE, OTHER)
- `EmployeeStatus` (ACTIVE, INACTIVE, SUSPENDED)
- `PayrollStatus` (PENDING, APPROVED, REJECTED)
- `LicenseType` (VACATION, SICK_LEAVE, PERSONAL_LEAVE, UNPAID_LEAVE, OTHER)
- `LicenseStatus` (PENDING, APPROVED, REJECTED)
- `NotificationType` (INFO, WARNING, ERROR, SUCCESS) - Workify básico

**ShopFlow:**

- `TransferStatus` (PENDING, IN_TRANSIT, COMPLETED, CANCELLED)
- `LoyaltyPointType` (EARNED, REDEEMED, EXPIRED, ADJUSTED)
- `ActionType` (CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, EXPORT, IMPORT, PRINT)
- `EntityType` (PRODUCT, CATEGORY, SUPPLIER, CUSTOMER, SALE, USER, STORE_CONFIG, TICKET_CONFIG, INVENTORY_TRANSFER)
- `TicketType` (TICKET, INVOICE, RECEIPT)
- `NotificationType` extendido: (INFO, WARNING, ERROR, SUCCESS, LOW_STOCK, IMPORTANT_SALE, PENDING_TASK)
- `NotificationPriority` (LOW, MEDIUM, HIGH, URGENT)
- `NotificationStatus` (UNREAD, READ, ARCHIVED)
- `SaleStatus` extendido: agregar REFUNDED
- `PaymentMethod` extendido: agregar CHECK

6. **Campos JSON**: Algunos modelos usan `Json`:

- Workify: AuditLog.before/after, IntegrationLog.request/response, Notification.meta, Report.config
- ShopFlow: Notification.data (String en código, debería ser Json), ActionHistory.details (String en código, debería ser Json), NotificationPreference.preferences

7. **Conflictos de nombres y estructura**:

- **Notification**: ShopFlow tiene estructura más completa (priority, status, readAt, expiresAt, actionUrl). Workify tiene estructura más simple (companyId, isRead, meta). Unificar usando estructura de ShopFlow + agregar companyId opcional.
- **User.name vs firstName/lastName**: Usar firstName/lastName de Workify + agregar campo computed `name` o mantener ambos
- **User.active vs isActive**: Usar `isActive` (estándar de Workify)
- **Category**: Ambos tienen jerarquía, usar estructura de ShopFlow (más simple)
- **TimeEntry**: Estructuras diferentes. Workify usa date/clockIn/clockOut/companyId. API actual usa startTime/endTime/userId. Usar estructura de Workify.

## Orden de Ejecución

1. **Actualizar `api/prisma/schema.prisma`** con todos los modelos unificados:

- Agregar todos los modelos de Workify (20+ modelos)
- Agregar todos los modelos de ShopFlow (16+ modelos)
- Unificar modelos compartidos (User, Company, Employee, TimeEntry, Notification)
- Agregar todos los enums necesarios
- Resolver conflictos de estructura (User.name vs firstName/lastName, etc.)

2. **Ejecutar migraciones**:

- `cd api && pnpm db:generate` (generar cliente Prisma)
- `pnpm db:push` o `pnpm db:migrate dev` (crear/actualizar tablas)

3. **Actualizar seeds de la API** (`api/prisma/seed.ts`):

- Agregar seeds de Workify
- Agregar seeds de ShopFlow
- Crear usuario admin unificado

4. **Eliminar Prisma de workify**:

- Remover `@prisma/client` y `prisma` de `workify/package.json`
- Eliminar `workify/src/lib/prisma.ts`
- Remover scripts de Prisma de `workify/package.json`
- Actualizar servicios para usar API (buscar imports de prisma)

5. **Eliminar Prisma de shopflow**:

- Remover `@prisma/client` de `shopflow/package.json` (si existe)
- Eliminar `shopflow/src/lib/prisma.ts` (ya está deshabilitado)
- Actualizar servicios para usar API (buscar imports de prisma)

6. **Implementar endpoints en la API**:

- Implementar endpoints de Workify en `api/src/routes/workify.ts`
- Implementar endpoints de ShopFlow en `api/src/routes/shopflow.ts`
- Implementar autenticación unificada en `api/src/routes/auth.ts`

7. **Actualizar frontends**:

- Workify: Actualizar servicios para usar API en lugar de Prisma
- Shopflow: Actualizar servicios para usar API en lugar de Prisma
- Actualizar tipos TypeScript para usar tipos de la API

8. **Verificar y probar**:

- Ejecutar `docker-compose --profile migration up migrate-db` para crear BD
- Verificar que todos los servicios funcionen
- Probar endpoints de ambos módulos

## Notas

- Los frontends ya están configurados para usar `NEXT_PUBLIC_API_URL`, así que solo necesitan actualizar las llamadas
- El modelo `User` será compartido, así que la autenticación debe manejarse desde la API