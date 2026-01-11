'use client'

import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/format'
import { useState } from 'react'

interface TotalsPanelProps {
  onCheckout: () => void
  taxRate?: number
}

export function TotalsPanel({ onCheckout, taxRate = 0 }: TotalsPanelProps) {
  const items = useCartStore((state) => state.items)
  const discount = useCartStore((state) => state.discount)
  const setGlobalDiscount = useCartStore((state) => state.setGlobalDiscount)
  const [localDiscount, setLocalDiscount] = useState(discount.toString())

  const subtotal = useCartStore((state) => state.getSubtotal())
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleDiscountChange = (value: string) => {
    setLocalDiscount(value)
    const numValue = parseFloat(value) || 0
    setGlobalDiscount(numValue)
  }

  const canCheckout = items.length > 0 && total > 0

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Totales</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Descuento Global
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={localDiscount}
              onChange={(e) => handleDiscountChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Impuesto ({taxRate * 100}%):</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <Button
          className="w-full mt-4"
          size="lg"
          onClick={onCheckout}
          disabled={!canCheckout}
        >
          Procesar Pago
        </Button>
      </CardContent>
    </Card>
  )
}

