# Architecture Overview - ShopFlow POS

This document provides a comprehensive overview of ShopFlow POS's system architecture, design patterns, and technical decisions for a modern Point of Sale system.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Browser / PWA (Chrome, Firefox, Safari, Edge)         │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  Next.js PWA App (React 19 + TypeScript)           │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │  • Server Components (SSR/SSG)                 │ │ │ │
│  │  │  │  • Client Components (Interactivity)           │ │ │ │
│  │  │  │  • Service Worker (Offline Support)            │ │ │ │
│  │  │  │  • WebAssembly (Receipt Printing)              │ │ │ │
│  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│           │                                                  │
│           │ WebRTC/WebSocket (Real-time)                    │
│           ▼                                                  │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ HTTP/HTTPS/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   Server Layer                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Vercel/Railway/Docker (Node.js Runtime)               │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  Next.js Server                                     │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │  API Layer                                      │ │ │ │
│  │  │  │  • POS Operations (Sales, Inventory)            │ │ │ │
│  │  │  │  • Real-time Updates (WebSocket)                │ │ │ │
│  │  │  │  • File Processing (Receipts, Reports)          │ │ │ │
│  │  │  │  • Printer Integration                          │ │ │ │
│  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ PostgreSQL Protocol
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                    │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  Prisma ORM + PgBouncer                             │ │ │
│  │  │  • Type Safety                                      │ │ │
│  │  │  • Connection Pooling                               │ │ │
│  │  │  • Read Replicas (Future)                           │ │ │
│  │  │  • Time-based Partitioning                          │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ ESC/POS Protocol
┌─────────────────────────────────────────────────────────────┐
│               Peripheral Layer                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Receipt Printers                                       │ │
│  │  • ESC/POS Compatible                                   │ │
│  │  • USB/Network Connection                               │ │
│  │  • Browser WebUSB API                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🏛️ Architectural Patterns

### 1. POS-Specific Architecture

ShopFlow POS implements specialized patterns for retail/point-of-sale systems:

#### Transaction Processing Architecture
```
Sale Initiation → Item Scanning → Price Calculation → Payment Processing → Receipt Generation → Transaction Commit
```

#### Offline-First Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Online Mode   │───►│  Sync Queue     │───►│   Cloud Sync    │
│                 │    │  (IndexedDB)    │    │   (Background)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       ▼                       │
         └─────────────────── Offline Mode ──────────────┘
                         (Local Storage + PWA)
```

### 2. Event-Driven POS Architecture

#### Domain Events in POS Context
```typescript
// POS Transaction Events
class SaleStartedEvent {
  constructor(
    public readonly saleId: string,
    public readonly cashierId: string,
    public readonly storeId: string,
    public readonly timestamp: Date
  ) {}
}

class ItemAddedToSaleEvent {
  constructor(
    public readonly saleId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: number
  ) {}
}

class SaleCompletedEvent {
  constructor(
    public readonly saleId: string,
    public readonly total: number,
    public readonly paymentMethod: PaymentMethod,
    public readonly timestamp: Date
  ) {}
}
```

#### Event Sourcing for Audit Trail
```typescript
// Immutable event store for POS transactions
interface SaleEvent {
  eventId: string;
  saleId: string;
  eventType: 'STARTED' | 'ITEM_ADDED' | 'ITEM_REMOVED' | 'PAYMENT' | 'COMPLETED' | 'CANCELLED';
  payload: Record<string, any>;
  timestamp: Date;
  userId: string;
  storeId: string;
}

// Rebuild sale state from events
class SaleEventSourcing {
  async rebuildSale(saleId: string): Promise<Sale> {
    const events = await this.eventStore.getEventsBySaleId(saleId);

    let sale: Partial<Sale> = { id: saleId, items: [] };

    for (const event of events) {
      sale = this.applyEvent(sale, event);
    }

    return sale as Sale;
  }
}
```

### 3. CQRS with POS Optimizations

#### Command Side (Write Operations)
```typescript
// Commands are optimized for POS speed
interface AddItemToSaleCommand {
  saleId: string;
  productId: string;
  quantity: number;
  scanned?: boolean; // For barcode scanning
}

class AddItemToSaleHandler {
  async execute(command: AddItemToSaleCommand): Promise<void> {
    // Fast validation
    const product = await this.productCache.get(command.productId);
    if (!product) throw new ProductNotFoundError();

    // Optimistic updates for POS speed
    await this.saleRepository.addItem(command.saleId, {
      productId: command.productId,
      quantity: command.quantity,
      unitPrice: product.price,
      scanned: command.scanned
    });

    // Publish event for read model updates
    await this.eventPublisher.publish(new ItemAddedToSaleEvent(
      command.saleId,
      command.productId,
      command.quantity,
      product.price
    ));
  }
}
```

#### Query Side (Read Operations)
```typescript
// Read models optimized for POS displays
interface SaleDisplayDTO {
  id: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    scanned: boolean;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
}

// Fast read model for POS interface
class SaleDisplayQueryHandler {
  async getSaleDisplay(saleId: string): Promise<SaleDisplayDTO> {
    // Use read-optimized table/collection
    return await this.saleDisplayStore.getById(saleId);
  }
}
```

---

## 🔧 Technical Patterns

### 1. POS Transaction Pattern

#### Atomic Transaction Processing
```typescript
class SaleTransactionProcessor {
  async processSale(saleData: SaleData): Promise<SaleResult> {
    // Use database transaction for consistency
    return await prisma.$transaction(async (tx) => {
      // 1. Lock inventory
      await this.lockInventoryItems(saleData.items, tx);

      // 2. Calculate totals
      const totals = await this.calculateTotals(saleData.items, tx);

      // 3. Process payment
      const payment = await this.paymentProcessor.process(
        totals.total,
        saleData.paymentMethod,
        tx
      );

      // 4. Create sale record
      const sale = await tx.sale.create({
        data: {
          ...saleData,
          total: totals.total,
          paymentId: payment.id
        }
      });

      // 5. Update inventory
      await this.updateInventoryLevels(saleData.items, tx);

      // 6. Generate receipt
      const receipt = await this.receiptGenerator.generate(sale.id, tx);

      return {
        sale,
        receipt,
        payment
      };
    }, {
      isolationLevel: 'Serializable' // Highest isolation for POS
    });
  }
}
```

### 2. Inventory Management Pattern

#### Optimistic Concurrency Control
```typescript
class InventoryService {
  async reserveItems(items: SaleItem[]): Promise<InventoryReservation> {
    const reservations: InventoryReservation[] = [];

    for (const item of items) {
      const reservation = await this.reserveItem(item);
      reservations.push(reservation);
    }

    return {
      id: generateId(),
      items: reservations,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
  }

  private async reserveItem(item: SaleItem): Promise<InventoryReservationItem> {
    // Optimistic locking with version
    const result = await prisma.product.updateMany({
      where: {
        id: item.productId,
        stockQuantity: {
          gte: item.quantity
        },
        version: item.version // Optimistic lock
      },
      data: {
        stockQuantity: {
          decrement: item.quantity
        },
        version: {
          increment: 1
        }
      }
    });

    if (result.count === 0) {
      throw new InsufficientStockError(item.productId);
    }

    return {
      productId: item.productId,
      reservedQuantity: item.quantity,
      originalVersion: item.version
    };
  }
}
```

### 3. Offline Synchronization Pattern

#### Conflict Resolution Strategy
```typescript
interface SyncConflict {
  local: Sale;
  remote: Sale;
  conflictFields: string[];
}

class OfflineSyncService {
  async synchronize(localSales: Sale[]): Promise<SyncResult> {
    const conflicts: SyncConflict[] = [];
    const successful: Sale[] = [];

    for (const localSale of localSales) {
      try {
        const remoteSale = await this.saleService.getById(localSale.id);

        if (remoteSale) {
          // Conflict detection
          const conflict = this.detectConflict(localSale, remoteSale);
          if (conflict) {
            conflicts.push(conflict);
            continue;
          }
        }

        // No conflict, sync to server
        await this.saleService.sync(localSale);
        successful.push(localSale);

      } catch (error) {
        // Handle sync errors
        await this.handleSyncError(localSale, error);
      }
    }

    return { successful, conflicts };
  }

  private detectConflict(local: Sale, remote: Sale): SyncConflict | null {
    const conflictFields: string[] = [];

    if (local.total !== remote.total) conflictFields.push('total');
    if (local.status !== remote.status) conflictFields.push('status');

    return conflictFields.length > 0 ? {
      local,
      remote,
      conflictFields
    } : null;
  }
}
```

---

## 📊 Data Architecture

### POS-Optimized Database Design

#### Time-Based Partitioning
```sql
-- Partition sales table by month for performance
CREATE TABLE sales_y2025m01 PARTITION OF sales
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Automatic partitioning
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

#### Inventory Optimization
```sql
-- Inventory with triggers for low stock alerts
CREATE TABLE inventory (
  product_id UUID PRIMARY KEY,
  store_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for low stock notifications
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= NEW.min_stock THEN
    PERFORM pg_notify('low_stock', json_build_object(
      'product_id', NEW.product_id,
      'store_id', NEW.store_id,
      'quantity', NEW.quantity,
      'min_stock', NEW.min_stock
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER low_stock_trigger
  AFTER UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION notify_low_stock();
```

### High-Performance Indexes
```sql
-- Composite indexes for common POS queries
CREATE INDEX CONCURRENTLY idx_sales_store_date
  ON sales (store_id, DATE(created_at DESC));

CREATE INDEX CONCURRENTLY idx_inventory_store_product
  ON inventory (store_id, product_id);

CREATE INDEX CONCURRENTLY idx_products_barcode
  ON products (barcode) WHERE active = true;

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_active_sales
  ON sales (id, total, created_at)
  WHERE status = 'COMPLETED';
```

---

## 🔐 Security Architecture

### POS-Specific Security

#### Cashier Session Management
```typescript
interface CashierSession {
  id: string;
  cashierId: string;
  storeId: string;
  registerId: string;
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number;
  currentBalance: number;
  salesCount: number;
  totalSales: number;
}

class CashierSessionManager {
  async openSession(cashierId: string, openingBalance: number): Promise<CashierSession> {
    // Validate cashier permissions
    const cashier = await this.validateCashier(cashierId);

    // Check for existing open sessions
    const existing = await this.getOpenSession(cashierId);
    if (existing) {
      throw new SessionAlreadyOpenError();
    }

    // Create new session
    const session = await this.sessionRepository.create({
      cashierId,
      storeId: cashier.storeId,
      openingBalance,
      currentBalance: openingBalance
    });

    // Log session opening
    await this.auditLog.log('SESSION_OPENED', {
      sessionId: session.id,
      cashierId,
      openingBalance
    });

    return session;
  }
}
```

#### Transaction Security
```typescript
class SecureTransactionProcessor {
  async processPayment(saleId: string, paymentData: PaymentData): Promise<PaymentResult> {
    // PCI DSS compliance measures
    const sanitizedPayment = this.sanitizePaymentData(paymentData);

    // Transaction logging (without sensitive data)
    await this.auditLog.log('PAYMENT_INITIATED', {
      saleId,
      amount: sanitizedPayment.amount,
      method: sanitizedPayment.method,
      timestamp: new Date()
    });

    try {
      const result = await this.paymentGateway.process(sanitizedPayment);

      // Log successful payment
      await this.auditLog.log('PAYMENT_SUCCESSFUL', {
        saleId,
        transactionId: result.transactionId,
        amount: result.amount
      });

      return result;

    } catch (error) {
      // Log failed payment (without sensitive data)
      await this.auditLog.log('PAYMENT_FAILED', {
        saleId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  private sanitizePaymentData(paymentData: PaymentData): SanitizedPayment {
    // Remove sensitive card data, CVV, etc.
    return {
      amount: paymentData.amount,
      method: paymentData.method,
      // Include only necessary, non-sensitive data
    };
  }
}
```

---

## 🖨️ Peripheral Integration Architecture

### Printer Integration Patterns

#### ESC/POS Protocol Implementation
```typescript
class ESCPOSPrinterService {
  async printReceipt(saleId: string): Promise<void> {
    const sale = await this.saleService.getById(saleId);
    const template = await this.templateService.getActiveTemplate();

    // Generate ESC/POS commands
    const commands = this.generateReceiptCommands(sale, template);

    // Send to printer
    await this.printerConnection.send(commands);
  }

  private generateReceiptCommands(sale: Sale, template: ReceiptTemplate): Buffer {
    const builder = new ESCPOSCommandBuilder();

    // Header
    builder
      .initialize()
      .align('center')
      .text(template.header.storeName)
      .text(template.header.address)
      .feed();

    // Items
    builder.align('left');
    for (const item of sale.items) {
      builder
        .text(`${item.productName}`)
        .text(`${item.quantity} x $${item.unitPrice} = $${item.total}`)
        .feed();
    }

    // Footer
    builder
      .feed()
      .separator()
      .align('right')
      .text(`Total: $${sale.total}`)
      .feed(3)
      .cut()
      .pulse(); // Open cash drawer

    return builder.build();
  }
}
```

#### WebUSB Integration
```typescript
class WebUSBPrinterService {
  private device: USBDevice | null = null;

  async connect(): Promise<void> {
    try {
      this.device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x04b8 }] // Example: Epson vendor ID
      });

      await this.device.open();
      await this.device.selectConfiguration(1);
      await this.device.claimInterface(0);

    } catch (error) {
      throw new PrinterConnectionError('Failed to connect to USB printer', error);
    }
  }

  async print(data: Buffer): Promise<void> {
    if (!this.device) throw new PrinterNotConnectedError();

    const endpoint = this.device.configuration?.interfaces[0]?.endpoints[0];
    if (!endpoint) throw new PrinterConfigurationError();

    await this.device.transferOut(endpoint.endpointNumber, data);
  }
}
```

---

## 🚀 Performance Architecture

### POS Performance Optimizations

#### Real-Time Synchronization
```typescript
class RealTimeSaleSync {
  private salesBuffer: Map<string, Sale> = new Map();
  private syncInterval: NodeJS.Timeout;

  constructor() {
    // Sync every 30 seconds for real-time feel
    this.syncInterval = setInterval(() => {
      this.flushBuffer();
    }, 30000);
  }

  updateSale(saleId: string, updates: Partial<Sale>): void {
    const existing = this.salesBuffer.get(saleId) || { id: saleId };
    const updated = { ...existing, ...updates, lastModified: Date.now() };

    this.salesBuffer.set(saleId, updated);

    // Immediate sync for critical updates (payment, completion)
    if (updates.status === 'COMPLETED' || updates.paymentMethod) {
      this.immediateSync(saleId);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.salesBuffer.size === 0) return;

    const sales = Array.from(this.salesBuffer.values());
    this.salesBuffer.clear();

    try {
      await this.bulkSyncService.syncSales(sales);
    } catch (error) {
      // Re-queue failed syncs
      sales.forEach(sale => this.salesBuffer.set(sale.id, sale));
    }
  }
}
```

#### PWA Caching Strategy
```typescript
// Service Worker for POS PWA
const POS_CACHE_STRATEGIES = {
  // Products cached for offline access
  products: new CacheFirst({
    cacheName: 'products-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  }),

  // Sales data - Network first for real-time
  sales: new NetworkFirst({
    cacheName: 'sales-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),

  // Static assets - Cache first
  static: new StaleWhileRevalidate({
    cacheName: 'static-cache',
  }),
};
```

---

## 📈 Scalability Architecture

### Multi-Store Architecture

#### Store-Based Sharding
```typescript
interface StoreShard {
  storeId: string;
  databaseUrl: string;
  redisUrl: string;
  region: string;
}

// Store-aware service routing
class MultiStoreServiceRouter {
  private shards: Map<string, StoreShard> = new Map();

  getStoreShard(storeId: string): StoreShard {
    const shard = this.shards.get(storeId);
    if (!shard) {
      throw new StoreNotFoundError(storeId);
    }
    return shard;
  }

  async executeInStore<T>(
    storeId: string,
    operation: (shard: StoreShard) => Promise<T>
  ): Promise<T> {
    const shard = this.getStoreShard(storeId);
    return await operation(shard);
  }
}
```

### High-Volume Transaction Processing
```typescript
class HighVolumeSaleProcessor {
  private processingQueue: Queue<SaleData> = new Queue();
  private workers: Worker[] = [];

  constructor(workerCount: number = 4) {
    // Start worker pool
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new SaleProcessingWorker());
    }

    this.startProcessing();
  }

  async processSale(saleData: SaleData): Promise<SaleResult> {
    return new Promise((resolve, reject) => {
      this.processingQueue.add({
        data: saleData,
        resolve,
        reject
      });
    });
  }

  private async startProcessing(): Promise<void> {
    for (const worker of this.workers) {
      worker.on('available', () => this.processNextItem());
    }

    // Start processing loop
    this.processNextItem();
  }

  private async processNextItem(): Promise<void> {
    const item = this.processingQueue.take();

    if (item) {
      try {
        const worker = this.getAvailableWorker();
        const result = await worker.process(item.data);
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  }
}
```

---

## 🔄 Integration Architecture

### Payment Gateway Integration

#### Multiple Payment Providers
```typescript
interface PaymentProvider {
  name: string;
  processPayment(amount: number, paymentData: PaymentData): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<RefundResult>;
  supportsMethod(method: PaymentMethod): boolean;
}

class PaymentGatewayAggregator {
  private providers: PaymentProvider[] = [
    new StripeProvider(),
    new SquareProvider(),
    new PayPalProvider()
  ];

  async processPayment(
    amount: number,
    method: PaymentMethod,
    paymentData: PaymentData
  ): Promise<PaymentResult> {
    const provider = this.selectProvider(method);

    // Fallback logic
    try {
      return await provider.processPayment(amount, paymentData);
    } catch (error) {
      // Try fallback provider
      const fallbackProvider = this.getFallbackProvider(provider);
      if (fallbackProvider) {
        return await fallbackProvider.processPayment(amount, paymentData);
      }
      throw error;
    }
  }

  private selectProvider(method: PaymentMethod): PaymentProvider {
    // Select best provider for payment method
    return this.providers.find(p => p.supportsMethod(method))
      || this.providers[0]; // Default fallback
  }
}
```

### External Service Integrations

#### Inventory Management Systems
```typescript
interface InventoryIntegration {
  syncInventory(storeId: string): Promise<void>;
  updateStock(productId: string, quantity: number): Promise<void>;
  getLowStockAlerts(storeId: string): Promise<LowStockAlert[]>;
}

class ERPIntegrationService implements InventoryIntegration {
  async syncInventory(storeId: string): Promise<void> {
    // Connect to ERP system
    const erpClient = await this.connectToERP();

    // Get inventory data
    const inventoryData = await erpClient.getInventory(storeId);

    // Update local database
    await this.inventoryService.bulkUpdate(inventoryData);

    // Log sync operation
    await this.auditLog.log('ERP_INVENTORY_SYNC', {
      storeId,
      itemCount: inventoryData.length,
      timestamp: new Date()
    });
  }
}
```

---

## 📋 Quality Assurance

### POS-Specific Testing

#### Transaction Testing
```typescript
describe('Sale Transaction Processing', () => {
  let saleProcessor: SaleTransactionProcessor;
  let mockInventory: jest.Mocked<InventoryService>;
  let mockPayment: jest.Mocked<PaymentGateway>;

  beforeEach(() => {
    mockInventory = {
      reserveItems: jest.fn(),
      confirmReservation: jest.fn(),
      releaseReservation: jest.fn()
    };

    mockPayment = {
      process: jest.fn()
    };

    saleProcessor = new SaleTransactionProcessor(
      mockInventory,
      mockPayment
    );
  });

  it('should process complete sale transaction', async () => {
    // Arrange
    const saleData = createTestSaleData();
    const paymentResult = createTestPaymentResult();

    mockInventory.reserveItems.mockResolvedValue(testReservation);
    mockPayment.process.mockResolvedValue(paymentResult);

    // Act
    const result = await saleProcessor.processSale(saleData);

    // Assert
    expect(result.sale).toBeDefined();
    expect(result.receipt).toBeDefined();
    expect(mockInventory.reserveItems).toHaveBeenCalledWith(saleData.items);
    expect(mockPayment.process).toHaveBeenCalled();
  });

  it('should rollback on payment failure', async () => {
    // Arrange
    mockPayment.process.mockRejectedValue(new PaymentError());

    // Act & Assert
    await expect(saleProcessor.processSale(saleData))
      .rejects
      .toThrow(PaymentError);

    expect(mockInventory.releaseReservation).toHaveBeenCalled();
  });
});
```

#### E2E Testing for POS Flow
```typescript
describe('POS Sale Flow', () => {
  it('should complete full POS transaction', async () => {
    // Start sale
    await page.click('[data-testid="new-sale-button"]');

    // Add items
    await page.fill('[data-testid="barcode-input"]', '123456789');
    await page.press('[data-testid="barcode-input"]', 'Enter');

    // Verify item added
    await expect(page.locator('[data-testid="item-row"]')).toHaveCount(1);

    // Process payment
    await page.click('[data-testid="cash-payment"]');
    await page.fill('[data-testid="cash-received"]', '50.00');

    // Complete sale
    await page.click('[data-testid="complete-sale"]');

    // Verify receipt printed
    await expect(page.locator('[data-testid="receipt-modal"]')).toBeVisible();
  });
});
```

---

## 🔮 Future Architecture Considerations

### Microservices Migration Path
```
Current: POS Monolith
┌─────────────────────────────────┐
│       ShopFlow POS Monolith     │
│  ┌─────────┬─────────┬─────────┐ │
│  │ Sales   │Inventory│ Reports │ │
│  │ Engine  │ Mgmt    │ Engine  │ │
│  └─────────┴─────────┴─────────┘ │
└─────────────────────────────────┘

Future: POS Microservices
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Sales   │    │Inventory│    │ Reports │    │ Orders  │
│Service  │    │Service  │    │Service  │    │Service  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
       │             │             │             │
       └─────────────┼─────────────┼─────────────┘
                     │
              ┌─────────────┐
              │ POS Gateway │
              │ (Next.js)   │
              └─────────────┘
```

### Advanced POS Features
```typescript
// Future: AI-Powered POS
class AIPoweredPOS {
  async suggestProducts(currentSale: Sale): Promise<ProductSuggestion[]> {
    // Analyze current items
    const currentCategories = currentSale.items.map(i => i.category);

    // Use ML model to suggest complementary products
    return await this.aiService.suggestComplementaryProducts(
      currentCategories,
      currentSale.customerHistory
    );
  }

  async detectAnomalies(sale: Sale): Promise<AnomalyDetection> {
    // Fraud detection
    const fraudScore = await this.fraudDetectionService.analyze(sale);

    // Inventory anomalies
    const inventoryAlerts = await this.inventoryService.checkAnomalies(sale);

    return {
      fraudRisk: fraudScore,
      inventoryIssues: inventoryAlerts
    };
  }
}
```

---

**Last updated**: Enero 2025