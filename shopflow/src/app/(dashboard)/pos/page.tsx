'use client'

import { useState } from 'react'
import { ProductPanel } from '@/components/features/pos/ProductPanel'
import { ShoppingCart } from '@/components/features/pos/ShoppingCart'
import { TotalsPanel } from '@/components/features/pos/TotalsPanel'
import { PaymentModal } from '@/components/features/pos/PaymentModal'
import { ReceiptModal } from '@/components/features/pos/ReceiptModal'
import { useStoreConfig } from '@/hooks/useStoreConfig'

export default function POSPage() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null)
  const { data: storeConfig } = useStoreConfig()

  const handleCheckout = () => {
    setPaymentModalOpen(true)
  }

  const handlePaymentSuccess = (saleId: string) => {
    setCompletedSaleId(saleId)
    setReceiptModalOpen(true)
  }

  const taxRate = storeConfig?.taxRate || 0

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Products Panel - Left Side */}
        <div className="lg:col-span-7 overflow-hidden">
          <ProductPanel />
        </div>

        {/* Cart and Totals - Right Side */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
          {/* Shopping Cart */}
          <div className="flex-1 min-h-0">
            <ShoppingCart />
          </div>

          {/* Totals Panel */}
          <div className="h-auto">
            <TotalsPanel onCheckout={handleCheckout} taxRate={taxRate} />
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        saleId={completedSaleId}
        open={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false)
          setCompletedSaleId(null)
        }}
      />
    </div>
  )
}

