# Schema de ShopFlow - Reconstrucción desde el código

## Modelos identificados en ShopFlow

### 1. User (Compartido con Workify)
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?  // Nota: Workify usa firstName/lastName
  role      UserRole @default(USER)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones ShopFlow
  sales            Sale[]
  actionHistory    ActionHistory[]
  notifications    Notification[]
  userPreferences  UserPreferences?
  
  @@map("users")
}

enum UserRole {
  USER
  ADMIN
  SUPERADMIN
}
```

### 2. Product
```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  sku         String?  @unique
  barcode     String?
  price       Decimal  @db.Decimal(10, 2)
  cost        Decimal? @db.Decimal(10, 2)
  stock       Int      @default(0)
  minStock    Int?     @default(0)
  maxStock    Int?
  categoryId  String?
  supplierId  String?
  storeId     String?  // Para multi-tienda
  active      Boolean  @default(true)
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  category         Category?           @relation(fields: [categoryId], references: [id])
  supplier         Supplier?           @relation(fields: [supplierId], references: [id])
  saleItems        SaleItem[]
  inventoryTransfers InventoryTransfer[]
  
  @@map("products")
}
```

### 3. Category (con jerarquía)
```prisma
model Category {
  id          String    @id @default(uuid())
  name        String
  description String?
  parentId    String?
  parent      Category? @relation("CategoryParent", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryParent")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relaciones
  products Product[]

  @@map("categories")
}
```

### 4. Supplier
```prisma
model Supplier {
  id        String    @id @default(uuid())
  name      String
  email     String?
  phone     String?
  address   String?
  city      String?
  state     String?
  taxId     String?   // Número de identificación fiscal
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Relaciones
  products Product[]

  @@map("suppliers")
}
```

### 5. Customer
```prisma
model Customer {
  id        String    @id @default(uuid())
  name      String
  email     String?
  phone     String?
  address   String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Relaciones
  sales           Sale[]
  loyaltyPoints   LoyaltyPoint[]
  
  @@map("customers")
}
```

### 6. Sale
```prisma
model Sale {
  id           String        @id @default(uuid())
  customerId   String?
  userId       String
  invoiceNumber String?      @unique
  total        Decimal       @db.Decimal(10, 2)
  subtotal     Decimal       @db.Decimal(10, 2)
  tax          Decimal       @db.Decimal(10, 2)
  discount     Decimal?      @db.Decimal(10, 2)
  status       SaleStatus    @default(COMPLETED)
  paymentMethod PaymentMethod?
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relaciones
  customer      Customer?    @relation(fields: [customerId], references: [id])
  user          User         @relation(fields: [userId], references: [id])
  items         SaleItem[]
  loyaltyPoints LoyaltyPoint[]
  
  @@map("sales")
}

enum SaleStatus {
  PENDING
  COMPLETED
  CANCELLED
  REFUNDED
}

enum PaymentMethod {
  CASH
  CARD
  TRANSFER
  CHECK
  OTHER
}
```

### 7. SaleItem
```prisma
model SaleItem {
  id        String   @id @default(uuid())
  saleId    String
  productId String
  quantity  Int
  price     Decimal  @db.Decimal(10, 2)
  discount  Decimal? @db.Decimal(10, 2)
  subtotal  Decimal  @db.Decimal(10, 2)

  // Relaciones
  sale    Sale    @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@map("sale_items")
}
```

### 8. StoreConfig
```prisma
model StoreConfig {
  id                    String   @id @default(uuid())
  name                  String
  address               String?
  phone                 String?
  email                 String?
  taxId                 String?
  currency              String   @default("USD")
  taxRate               Decimal  @db.Decimal(5, 4) @default(0)
  lowStockAlert         Int      @default(10)
  invoicePrefix         String   @default("INV-")
  invoiceNumber         Int      @default(1)
  allowSalesWithoutStock Boolean @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("store_configs")
}
```

### 9. TicketConfig
```prisma
model TicketConfig {
  id                String     @id @default(uuid())
  storeId           String?
  ticketType        TicketType @default(TICKET)
  header            String?
  description       String?
  logoUrl           String?
  footer            String?
  defaultPrinterName String?
  thermalWidth      Int        @default(80)
  fontSize          Int        @default(12)
  copies            Int        @default(1)
  autoPrint         Boolean    @default(true)
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  
  @@map("ticket_configs")
}

enum TicketType {
  TICKET
  INVOICE
  RECEIPT
}
```

### 10. UserPreferences
```prisma
model UserPreferences {
  id        String   @id @default(uuid())
  userId    String   @unique
  language  String   @default("es")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_preferences")
}
```

### 11. InventoryTransfer
```prisma
model InventoryTransfer {
  id          String        @id @default(uuid())
  fromStoreId String
  toStoreId   String
  productId   String
  quantity    Int
  notes       String?
  status      TransferStatus @default(PENDING)
  createdById String
  completedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relaciones
  product     Product       @relation(fields: [productId], references: [id])
  createdBy   User          @relation(fields: [createdById], references: [id])
  
  @@map("inventory_transfers")
}

enum TransferStatus {
  PENDING
  IN_TRANSIT
  COMPLETED
  CANCELLED
}
```

### 12. Notification
```prisma
model Notification {
  id          String            @id @default(uuid())
  userId      String
  type        NotificationType
  priority    NotificationPriority @default(MEDIUM)
  title       String
  message     String
  data        String?           // JSON string
  actionUrl   String?
  status      NotificationStatus @default(UNREAD)
  expiresAt   DateTime?
  readAt      DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  // Relaciones
  user        User              @relation(fields: [userId], references: [id])
  
  @@map("notifications")
}

enum NotificationType {
  INFO
  WARNING
  ERROR
  SUCCESS
  LOW_STOCK
  IMPORTANT_SALE
  PENDING_TASK
}

enum NotificationPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum NotificationStatus {
  UNREAD
  READ
  ARCHIVED
}
```

### 13. NotificationPreference
```prisma
model NotificationPreference {
  id          String   @id @default(uuid())
  userId      String   @unique
  pushEnabled Boolean  @default(true)
  emailEnabled Boolean @default(false)
  inAppEnabled Boolean @default(true)
  // Preferencias por tipo (JSON)
  preferences Json?    // { type: { inApp: boolean, push: boolean, email: boolean } }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("notification_preferences")
}
```

### 14. LoyaltyConfig
```prisma
model LoyaltyConfig {
  id                    String   @id @default(uuid())
  pointsPerDollar       Decimal  @db.Decimal(10, 2)
  redemptionRate        Decimal  @db.Decimal(10, 4) // Ej: 0.01 = 1 punto = $0.01
  pointsExpireMonths    Int?
  minPurchaseForPoints  Decimal  @db.Decimal(10, 2) @default(0)
  maxPointsPerPurchase   Int?
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("loyalty_configs")
}
```

### 15. LoyaltyPoint
```prisma
model LoyaltyPoint {
  id          String           @id @default(uuid())
  customerId  String
  saleId      String?
  points      Int
  type        LoyaltyPointType
  description String?
  expiresAt  DateTime?
  createdAt   DateTime         @default(now())

  // Relaciones
  customer    Customer         @relation(fields: [customerId], references: [id])
  sale        Sale?            @relation(fields: [saleId], references: [id])
  
  @@map("loyalty_points")
}

enum LoyaltyPointType {
  EARNED
  REDEEMED
  EXPIRED
  ADJUSTED
}
```

### 16. ActionHistory
```prisma
model ActionHistory {
  id          String     @id @default(uuid())
  userId      String
  action      ActionType
  entityType  EntityType
  entityId    String?
  details     String?   // JSON string
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime   @default(now())

  // Relaciones
  user        User       @relation(fields: [userId], references: [id])
  
  @@map("action_history")
}

enum ActionType {
  CREATE
  UPDATE
  DELETE
  VIEW
  LOGIN
  LOGOUT
  EXPORT
  IMPORT
  PRINT
}

enum EntityType {
  PRODUCT
  CATEGORY
  SUPPLIER
  CUSTOMER
  SALE
  USER
  STORE_CONFIG
  TICKET_CONFIG
  INVENTORY_TRANSFER
}
```

## Notas importantes

1. **User**: ShopFlow usa `name` mientras Workify usa `firstName`/`lastName`. Necesitamos unificar.

2. **Category**: ShopFlow tiene jerarquía (parentId), similar a Workify.

3. **Product**: Tiene campos adicionales como `sku`, `barcode`, `cost`, `minStock`, `maxStock`, `storeId` (multi-tienda).

4. **Sale**: Tiene campos adicionales como `invoiceNumber`, `subtotal`, `tax`, `discount`.

5. **StoreConfig**: Configuración global de la tienda (moneda, impuestos, etc.).

6. **TicketConfig**: Configuración de impresión de tickets/recibos.

7. **Loyalty**: Sistema de puntos de fidelidad completo.

8. **Notifications**: Sistema de notificaciones más completo que Workify.

9. **ActionHistory**: Historial de acciones del usuario (auditoría).

10. **InventoryTransfer**: Transferencias entre tiendas (multi-tienda).

## Diferencias con el schema actual de la API

El schema actual de la API tiene modelos simplificados. Necesitamos:
- Agregar todos los campos faltantes
- Agregar modelos faltantes (StoreConfig, TicketConfig, UserPreferences, InventoryTransfer, LoyaltyConfig, LoyaltyPoint, NotificationPreference, ActionHistory)
- Actualizar enums con valores adicionales
- Agregar relaciones faltantes
