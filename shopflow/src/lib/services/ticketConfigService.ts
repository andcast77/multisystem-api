import { prisma } from '@/lib/prisma'
import type { UpdateTicketConfigInput } from '@/lib/validations/ticketConfig'
import { TicketType } from '@prisma/client'

export async function getTicketConfig(storeId?: string) {
  let config = await prisma.ticketConfig.findFirst({
    where: storeId ? { storeId } : { storeId: null },
  })

  // If no config exists, create a default one
  if (!config) {
    config = await prisma.ticketConfig.create({
      data: {
        storeId: storeId || null,
        ticketType: TicketType.TICKET,
        thermalWidth: 80,
        fontSize: 12,
        copies: 1,
        autoPrint: true,
      },
    })
  }

  return config
}

export async function updateTicketConfig(
  data: UpdateTicketConfigInput,
  storeId?: string
) {
  const config = await getTicketConfig(storeId)

  const updatedConfig = await prisma.ticketConfig.update({
    where: { id: config.id },
    data: {
      storeId: data.storeId ?? config.storeId,
      ticketType: data.ticketType ?? config.ticketType,
      header: data.header ?? undefined,
      description: data.description ?? undefined,
      logoUrl: data.logoUrl ?? undefined,
      footer: data.footer ?? undefined,
      defaultPrinterName: data.defaultPrinterName ?? undefined,
      thermalWidth: data.thermalWidth ?? undefined,
      fontSize: data.fontSize ?? config.fontSize,
      copies: data.copies ?? config.copies,
      autoPrint: data.autoPrint ?? config.autoPrint,
    },
  })

  return updatedConfig
}
