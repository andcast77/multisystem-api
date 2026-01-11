import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

export const shopflowRouter = Router()

// Health check
shopflowRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'shopflow' })
})

// ========================================
// PRODUCTS
// ========================================

shopflowRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { search, categoryId, active, minPrice, maxPrice, lowStock, sku, barcode } = req.query
    const where: any = {}
    
    if (categoryId) where.categoryId = categoryId as string
    if (active !== undefined) where.active = active === 'true'
    if (sku) where.sku = { contains: sku as string, mode: 'insensitive' }
    if (barcode) where.barcode = { contains: barcode as string, mode: 'insensitive' }
    
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice as string)
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string)
    }
    
    if (lowStock === 'true') {
      where.stock = { lte: prisma.product.fields.minStock }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
      },
    })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' })
  }
})

shopflowRouter.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        supplier: true,
        saleItems: true,
      },
    })
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching product' })
  }
})

shopflowRouter.post('/products', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.create({
      data: req.body,
    })
    res.status(201).json(product)
  } catch (error) {
    res.status(500).json({ error: 'Error creating product' })
  }
})

shopflowRouter.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: 'Error updating product' })
  }
})

shopflowRouter.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product' })
  }
})

// ========================================
// CATEGORIES
// ========================================

shopflowRouter.get('/categories', async (req: Request, res: Response) => {
  try {
    const { parentId, includeChildren } = req.query
    const where: any = {}
    
    if (parentId === 'null' || parentId === null) {
      where.parentId = null
    } else if (parentId) {
      where.parentId = parentId as string
    }
    
    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: includeChildren === 'true' ? true : false,
        _count: {
          select: {
            products: true,
          },
        },
      },
    })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' })
  }
})

shopflowRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.create({
      data: req.body,
    })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ error: 'Error creating category' })
  }
})

shopflowRouter.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(category)
  } catch (error) {
    res.status(500).json({ error: 'Error updating category' })
  }
})

shopflowRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    await prisma.category.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category' })
  }
})

// ========================================
// SUPPLIERS
// ========================================

shopflowRouter.get('/suppliers', async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })
    res.json(suppliers)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching suppliers' })
  }
})

shopflowRouter.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const supplier = await prisma.supplier.create({
      data: req.body,
    })
    res.status(201).json(supplier)
  } catch (error) {
    res.status(500).json({ error: 'Error creating supplier' })
  }
})

shopflowRouter.put('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(supplier)
  } catch (error) {
    res.status(500).json({ error: 'Error updating supplier' })
  }
})

shopflowRouter.delete('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    await prisma.supplier.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting supplier' })
  }
})

// ========================================
// CUSTOMERS
// ========================================

shopflowRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const { search } = req.query
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    
    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            sales: true,
            loyaltyPoints: true,
          },
        },
      },
    })
    res.json(customers)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching customers' })
  }
})

shopflowRouter.post('/customers', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.create({
      data: req.body,
    })
    res.status(201).json(customer)
  } catch (error) {
    res.status(500).json({ error: 'Error creating customer' })
  }
})

shopflowRouter.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: 'Error updating customer' })
  }
})

shopflowRouter.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting customer' })
  }
})

// ========================================
// SALES
// ========================================

shopflowRouter.get('/sales', async (req: Request, res: Response) => {
  try {
    const { customerId, userId, status, paymentMethod, startDate, endDate } = req.query
    const where: any = {}
    
    if (customerId) where.customerId = customerId as string
    if (userId) where.userId = userId as string
    if (status) where.status = status
    if (paymentMethod) where.paymentMethod = paymentMethod
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }
    
    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    res.json(sales)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sales' })
  }
})

shopflowRouter.get('/sales/:id', async (req: Request, res: Response) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true,
          },
        },
        loyaltyPoints: true,
      },
    })
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' })
    }
    res.json(sale)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sale' })
  }
})

shopflowRouter.post('/sales', async (req: Request, res: Response) => {
  try {
    const { items, ...saleData } = req.body
    
    const sale = await prisma.sale.create({
      data: {
        ...saleData,
        items: {
          create: items || [],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })
    res.status(201).json(sale)
  } catch (error) {
    res.status(500).json({ error: 'Error creating sale' })
  }
})

shopflowRouter.put('/sales/:id', async (req: Request, res: Response) => {
  try {
    const sale = await prisma.sale.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(sale)
  } catch (error) {
    res.status(500).json({ error: 'Error updating sale' })
  }
})

// ========================================
// STORE CONFIG
// ========================================

shopflowRouter.get('/store-config', async (req: Request, res: Response) => {
  try {
    const config = await prisma.storeConfig.findFirst()
    if (!config) {
      return res.status(404).json({ error: 'Store config not found' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching store config' })
  }
})

shopflowRouter.put('/store-config/:id', async (req: Request, res: Response) => {
  try {
    const config = await prisma.storeConfig.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error updating store config' })
  }
})

// ========================================
// TICKET CONFIG
// ========================================

shopflowRouter.get('/ticket-config', async (req: Request, res: Response) => {
  try {
    const config = await prisma.ticketConfig.findFirst()
    if (!config) {
      return res.status(404).json({ error: 'Ticket config not found' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching ticket config' })
  }
})

shopflowRouter.put('/ticket-config/:id', async (req: Request, res: Response) => {
  try {
    const config = await prisma.ticketConfig.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error updating ticket config' })
  }
})

// ========================================
// USER PREFERENCES
// ========================================

shopflowRouter.get('/user-preferences/:userId', async (req: Request, res: Response) => {
  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.params.userId },
    })
    if (!preferences) {
      return res.status(404).json({ error: 'User preferences not found' })
    }
    res.json(preferences)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user preferences' })
  }
})

shopflowRouter.put('/user-preferences/:userId', async (req: Request, res: Response) => {
  try {
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: req.params.userId },
      update: req.body,
      create: {
        userId: req.params.userId,
        ...req.body,
      },
    })
    res.json(preferences)
  } catch (error) {
    res.status(500).json({ error: 'Error updating user preferences' })
  }
})

// ========================================
// INVENTORY TRANSFERS
// ========================================

shopflowRouter.get('/inventory-transfers', async (req: Request, res: Response) => {
  try {
    const { status, productId } = req.query
    const where: any = {}
    
    if (status) where.status = status
    if (productId) where.productId = productId as string
    
    const transfers = await prisma.inventoryTransfer.findMany({
      where,
      include: {
        product: true,
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    res.json(transfers)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching inventory transfers' })
  }
})

shopflowRouter.post('/inventory-transfers', async (req: Request, res: Response) => {
  try {
    const transfer = await prisma.inventoryTransfer.create({
      data: req.body,
    })
    res.status(201).json(transfer)
  } catch (error) {
    res.status(500).json({ error: 'Error creating inventory transfer' })
  }
})

shopflowRouter.put('/inventory-transfers/:id', async (req: Request, res: Response) => {
  try {
    const transfer = await prisma.inventoryTransfer.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(transfer)
  } catch (error) {
    res.status(500).json({ error: 'Error updating inventory transfer' })
  }
})

// ========================================
// LOYALTY
// ========================================

shopflowRouter.get('/loyalty/config', async (req: Request, res: Response) => {
  try {
    const config = await prisma.loyaltyConfig.findFirst()
    if (!config) {
      return res.status(404).json({ error: 'Loyalty config not found' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching loyalty config' })
  }
})

shopflowRouter.put('/loyalty/config/:id', async (req: Request, res: Response) => {
  try {
    const config = await prisma.loyaltyConfig.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error updating loyalty config' })
  }
})

shopflowRouter.get('/loyalty/points', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query
    const where: any = {}
    
    if (customerId) where.customerId = customerId as string
    
    const points = await prisma.loyaltyPoint.findMany({
      where,
      include: {
        customer: true,
        sale: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    res.json(points)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching loyalty points' })
  }
})

shopflowRouter.post('/loyalty/points', async (req: Request, res: Response) => {
  try {
    const point = await prisma.loyaltyPoint.create({
      data: req.body,
    })
    res.status(201).json(point)
  } catch (error) {
    res.status(500).json({ error: 'Error creating loyalty point' })
  }
})

// ========================================
// NOTIFICATIONS
// ========================================

shopflowRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { userId, status, priority } = req.query
    const where: any = {}
    
    if (userId) where.userId = userId as string
    if (status) where.status = status
    if (priority) where.priority = priority
    
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notifications' })
  }
})

shopflowRouter.post('/notifications', async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.create({
      data: req.body,
    })
    res.status(201).json(notification)
  } catch (error) {
    res.status(500).json({ error: 'Error creating notification' })
  }
})

shopflowRouter.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    })
    res.json(notification)
  } catch (error) {
    res.status(500).json({ error: 'Error updating notification' })
  }
})

// ========================================
// NOTIFICATION PREFERENCES
// ========================================

shopflowRouter.get('/notification-preferences/:userId', async (req: Request, res: Response) => {
  try {
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.params.userId },
    })
    if (!preferences) {
      return res.status(404).json({ error: 'Notification preferences not found' })
    }
    res.json(preferences)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notification preferences' })
  }
})

shopflowRouter.put('/notification-preferences/:userId', async (req: Request, res: Response) => {
  try {
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.params.userId },
      update: req.body,
      create: {
        userId: req.params.userId,
        ...req.body,
      },
    })
    res.json(preferences)
  } catch (error) {
    res.status(500).json({ error: 'Error updating notification preferences' })
  }
})

// ========================================
// ACTION HISTORY
// ========================================

shopflowRouter.get('/action-history', async (req: Request, res: Response) => {
  try {
    const { userId, action, entityType, entityId, startDate, endDate } = req.query
    const where: any = {}
    
    if (userId) where.userId = userId as string
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId as string
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }
    
    const history = await prisma.actionHistory.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching action history' })
  }
})
