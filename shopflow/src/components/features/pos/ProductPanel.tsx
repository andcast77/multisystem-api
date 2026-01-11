'use client'

import { useState, useEffect, useRef } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useCartStore } from '@/store/cartStore'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BarcodeScanResult } from '@/lib/services/barcodeService'

export function ProductPanel() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useProducts({ search, page: 1, limit: 100 })
  const addItem = useCartStore((state) => state.addItem)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Barcode scanner integration
  const handleBarcodeScan = (result: BarcodeScanResult) => {
    // Search for product by barcode
    setSearch(result.code)
    // Try to find and add product automatically
    if (data?.products) {
      const product = data.products.find(
        (p) => p.barcode === result.code || p.sku === result.code
      )
      if (product && product.stock > 0) {
        addItem(product, 1)
        setSearch('') // Clear search after adding
      }
    }
  }

  const { ref: barcodeRef } = useBarcodeScanner(handleBarcodeScan, true)

  useEffect(() => {
    if (searchInputRef.current) {
      barcodeRef.current = searchInputRef.current
    }
  }, [barcodeRef])

  const handleAddToCart = (product: {
    id: string
    name: string
    price: number
    sku: string
    stock: number
  }) => {
    if (product.stock > 0) {
      addItem(product, 1)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar productos o escanear código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Cargando productos...</div>
        ) : data?.products && data.products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.products.map((product) => (
              <Card
                key={product.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  product.stock === 0 && 'opacity-50'
                )}
                onClick={() => handleAddToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      <Badge
                        variant={product.stock > 0 ? 'default' : 'destructive'}
                        className="ml-2 shrink-0"
                      >
                        {product.stock}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold">
                        ${product.price.toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        disabled={product.stock === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToCart(product)
                        }}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No se encontraron productos
          </div>
        )}
      </div>
    </div>
  )
}

