import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'

export type Product = {
  id: string
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  price: number
  cost: number | null
  stock: number
  minStock: number | null
  maxStock: number | null
  categoryId: string | null
  supplierId: string | null
  storeId: string | null
  active: boolean
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export async function shopflowProductsRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/products - List products with filters
  fastify.get<{
    Querystring: {
      search?: string
      categoryId?: string
      active?: string
      minPrice?: string
      maxPrice?: string
      lowStock?: string
      sku?: string
      barcode?: string
      page?: string
      limit?: string
    }
  }>('/api/shopflow/products', async (request, reply) => {
    try {
      const {
        search,
        categoryId,
        active,
        minPrice,
        maxPrice,
        lowStock,
        sku,
        barcode,
        page = '1',
        limit = '20',
      } = request.query

      // Single lookup by sku or barcode
      if (sku) {
        const rows = await sqlQuery<any>(sql`
          SELECT id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
            "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
          FROM products
          WHERE sku = ${sku}
          LIMIT 1
        `)
        if (rows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Product not found' }
        }
        return { success: true, data: rows[0] }
      }
      if (barcode) {
        const rows = await sqlQuery<any>(sql`
          SELECT id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
            "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
          FROM products
          WHERE barcode = ${barcode}
          LIMIT 1
        `)
        if (rows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Product not found' }
        }
        return { success: true, data: rows[0] }
      }

      const pageNum = parseInt(page)
      const limitNum = Math.min(parseInt(limit) || 20, 100)
      const skip = (pageNum - 1) * limitNum

      let query = sql`
        SELECT 
          p.id, p.name, p.description, p.sku, p.barcode, p.price, p.cost, p.stock,
          p."minStock", p."maxStock", p."categoryId", p."supplierId", p."storeId",
          p.active, p."imageUrl", p."createdAt", p."updatedAt"
        FROM products p
        WHERE 1=1
      `

      if (search) {
        query = sql`
          ${query}
          AND (p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`} OR p.sku ILIKE ${`%${search}%`})
        `
      }
      if (categoryId !== undefined) {
        if (categoryId === null || categoryId === 'null') {
          query = sql`${query} AND p."categoryId" IS NULL`
        } else {
          query = sql`${query} AND p."categoryId" = ${categoryId}`
        }
      }
      if (active !== undefined) {
        query = sql`${query} AND p.active = ${active === 'true'}`
      }
      if (minPrice !== undefined) {
        const n = parseFloat(minPrice)
        if (!isNaN(n)) query = sql`${query} AND p.price >= ${n}`
      }
      if (maxPrice !== undefined) {
        const n = parseFloat(maxPrice)
        if (!isNaN(n)) query = sql`${query} AND p.price <= ${n}`
      }
      if (lowStock === 'true') {
        query = sql`${query} AND p.stock <= COALESCE(p."minStock", 0)`
      }

      const countQuery = sql`
        SELECT COUNT(*) as total FROM products p WHERE 1=1
        ${search ? sql`AND (p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`} OR p.sku ILIKE ${`%${search}%`})` : sql``}
        ${categoryId !== undefined ? (categoryId === 'null' ? sql`AND p."categoryId" IS NULL` : sql`AND p."categoryId" = ${categoryId}`) : sql``}
        ${active !== undefined ? sql`AND p.active = ${active === 'true'}` : sql``}
        ${minPrice !== undefined && !isNaN(parseFloat(minPrice)) ? sql`AND p.price >= ${parseFloat(minPrice)}` : sql``}
        ${maxPrice !== undefined && !isNaN(parseFloat(maxPrice)) ? sql`AND p.price <= ${parseFloat(maxPrice)}` : sql``}
        ${lowStock === 'true' ? sql`AND p.stock <= COALESCE(p."minStock", 0)` : sql``}
      `
      const countResult = await sqlQuery<{ total: string }>(countQuery)
      const total = parseInt(countResult[0]?.total || '0')

      query = sql`
        ${query}
        ORDER BY p.name ASC
        LIMIT ${limitNum} OFFSET ${skip}
      `
      const products = await sqlQuery<any>(query)

      return {
        success: true,
        data: {
          products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener productos',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/products/low-stock
  fastify.get<{
    Querystring: { minStockThreshold?: string }
  }>('/api/shopflow/products/low-stock', async (request, reply) => {
    try {
      const { minStockThreshold } = request.query
      const threshold = minStockThreshold != null ? parseInt(minStockThreshold) : undefined

      let query = sql`
        SELECT id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
          "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
        FROM products
        WHERE active = true AND stock <= COALESCE("minStock", 0)
      `
      if (threshold != null && !isNaN(threshold)) {
        query = sql`
          SELECT id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
            "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
          FROM products
          WHERE active = true AND stock <= ${threshold}
        `
      }
      const products = await sqlQuery<any>(query)
      return { success: true, data: products }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener productos con bajo stock',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/products/:id
  fastify.get<{ Params: { id: string } }>('/api/shopflow/products/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const rows = await sqlQuery<any>(sql`
        SELECT id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
          "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
        FROM products
        WHERE id = ${id}
        LIMIT 1
      `)
      if (rows.length === 0) {
        reply.code(404)
        return { success: false, error: 'Producto no encontrado' }
      }
      return { success: true, data: rows[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener producto',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/products
  fastify.post<{
    Body: {
      name: string
      description?: string | null
      sku?: string | null
      barcode?: string | null
      price: number
      cost?: number | null
      stock?: number
      minStock?: number | null
      maxStock?: number | null
      categoryId?: string | null
      supplierId?: string | null
      storeId?: string | null
      active?: boolean
      imageUrl?: string | null
    }
  }>('/api/shopflow/products', async (request, reply) => {
    try {
      const body = request.body
      const product = await sqlQuery<any>(sql`
        INSERT INTO products (
          name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
          "categoryId", "supplierId", "storeId", active, "imageUrl"
        )
        VALUES (
          ${body.name},
          ${body.description ?? null},
          ${body.sku ?? null},
          ${body.barcode ?? null},
          ${body.price},
          ${body.cost ?? null},
          ${body.stock ?? 0},
          ${body.minStock ?? 0},
          ${body.maxStock ?? null},
          ${body.categoryId ?? null},
          ${body.supplierId ?? null},
          ${body.storeId ?? null},
          ${body.active ?? true},
          ${body.imageUrl ?? null}
        )
        RETURNING id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
          "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
      `)
      return { success: true, data: product[0] }
    } catch (error: any) {
      fastify.log.error(error)
      reply.code(500)
      if (error?.code === '23505') {
        reply.code(409)
        return { success: false, error: 'SKU o código ya existe' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear producto',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/products/:id
  fastify.put<{
    Params: { id: string }
    Body: Partial<{
      name: string
      description: string | null
      sku: string | null
      barcode: string | null
      price: number
      cost: number | null
      stock: number
      minStock: number | null
      maxStock: number | null
      categoryId: string | null
      supplierId: string | null
      storeId: string | null
      active: boolean
      imageUrl: string | null
    }>
  }>('/api/shopflow/products/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const body = request.body

      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM products WHERE id = ${id} LIMIT 1
      `)
      if (existing.length === 0) {
        reply.code(404)
        return { success: false, error: 'Producto no encontrado' }
      }

      const updates: string[] = []
      const values: any[] = []
      let idx = 0
      const set = (col: string, val: any) => {
        updates.push(`"${col}" = $${++idx}`)
        values.push(val)
      }
      if (body.name !== undefined) set('name', body.name)
      if (body.description !== undefined) set('description', body.description)
      if (body.sku !== undefined) set('sku', body.sku)
      if (body.barcode !== undefined) set('barcode', body.barcode)
      if (body.price !== undefined) set('price', body.price)
      if (body.cost !== undefined) set('cost', body.cost)
      if (body.stock !== undefined) set('stock', body.stock)
      if (body.minStock !== undefined) set('minStock', body.minStock)
      if (body.maxStock !== undefined) set('maxStock', body.maxStock)
      if (body.categoryId !== undefined) set('categoryId', body.categoryId)
      if (body.supplierId !== undefined) set('supplierId', body.supplierId)
      if (body.storeId !== undefined) set('storeId', body.storeId)
      if (body.active !== undefined) set('active', body.active)
      if (body.imageUrl !== undefined) set('imageUrl', body.imageUrl)

      if (updates.length === 0) {
        const rows = await sqlQuery<any>(sql`
          SELECT id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
            "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
          FROM products WHERE id = ${id} LIMIT 1
        `)
        return { success: true, data: rows[0] }
      }

      updates.push('"updatedAt" = NOW()')
      values.push(id)
      const q = `
        UPDATE products SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
          "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
      `
      const product = await sqlUnsafe<any>(q, values)
      return { success: true, data: product[0] }
    } catch (error: any) {
      fastify.log.error(error)
      reply.code(500)
      if (error?.code === '23505') {
        reply.code(409)
        return { success: false, error: 'SKU o código ya existe' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al actualizar producto',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/products/:id/inventory
  fastify.put<{
    Params: { id: string }
    Body: { stock: number; minStock?: number }
  }>('/api/shopflow/products/:id/inventory', async (request, reply) => {
    try {
      const { id } = request.params
      const { stock, minStock } = request.body

      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM products WHERE id = ${id} LIMIT 1
      `)
      if (existing.length === 0) {
        reply.code(404)
        return { success: false, error: 'Producto no encontrado' }
      }

      const product =
        minStock !== undefined
          ? await sqlQuery<any>(sql`
              UPDATE products
              SET stock = ${stock}, "minStock" = ${minStock}, "updatedAt" = NOW()
              WHERE id = ${id}
              RETURNING id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
                "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
            `)
          : await sqlQuery<any>(sql`
              UPDATE products
              SET stock = ${stock}, "updatedAt" = NOW()
              WHERE id = ${id}
              RETURNING id, name, description, sku, barcode, price, cost, stock, "minStock", "maxStock",
                "categoryId", "supplierId", "storeId", active, "imageUrl", "createdAt", "updatedAt"
            `)
      if (product.length === 0) {
        reply.code(404)
        return { success: false, error: 'Producto no encontrado' }
      }
      return { success: true, data: product[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al actualizar inventario',
        message: errorMessage,
      }
    }
  })

  // DELETE /api/shopflow/products/:id
  fastify.delete<{ Params: { id: string } }>('/api/shopflow/products/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM products WHERE id = ${id} LIMIT 1
      `)
      if (existing.length === 0) {
        reply.code(404)
        return { success: false, error: 'Producto no encontrado' }
      }

      await sqlQuery(sql`DELETE FROM products WHERE id = ${id}`)
      return { success: true, data: { id } }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al eliminar producto',
        message: errorMessage,
      }
    }
  })
}
