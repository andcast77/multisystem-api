import { prisma } from '@/lib/prisma'
import type { UpdateStoreConfigInput } from '@/lib/validations/storeConfig'

export async function getStoreConfig() {
  let config = await prisma.storeConfig.findFirst()

  // If no config exists, create a default one
  if (!config) {
    config = await prisma.storeConfig.create({
      data: {
        name: 'My Store',
        currency: 'USD',
        taxRate: 0,
        lowStockAlert: 10,
        invoicePrefix: 'INV-',
        invoiceNumber: 1,
        allowSalesWithoutStock: false,
      },
    })
  }

  return config
}

export async function updateStoreConfig(data: UpdateStoreConfigInput) {
  const config = await getStoreConfig()

  const updatedConfig = await prisma.storeConfig.update({
    where: { id: config.id },
    data: {
      name: data.name,
      address: data.address ?? undefined,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      taxId: data.taxId ?? undefined,
      currency: data.currency,
      taxRate: data.taxRate,
      lowStockAlert: data.lowStockAlert,
      invoicePrefix: data.invoicePrefix,
      allowSalesWithoutStock: data.allowSalesWithoutStock,
    },
  })

  return updatedConfig
}

export async function getNextInvoiceNumber(): Promise<string> {
  const config = await getStoreConfig()

  // Increment invoice number and update
  const updatedConfig = await prisma.storeConfig.update({
    where: { id: config.id },
    data: {
      invoiceNumber: config.invoiceNumber + 1,
    },
  })

  return `${config.invoicePrefix}${updatedConfig.invoiceNumber.toString().padStart(6, '0')}`
}
