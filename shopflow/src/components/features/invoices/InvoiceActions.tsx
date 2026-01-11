'use client'

import { Download, FileText, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface InvoiceActionsProps {
  saleId: string
  invoiceNumber?: string
}

export function InvoiceActions({ saleId }: InvoiceActionsProps) {
  const handleDownload = (format: 'pdf' | 'xml' | 'receipt') => {
    const url = `/api/invoices/${saleId}/${format}`
    window.open(url, '_blank')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download Invoice
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          PDF Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('xml')}>
          <FileCode className="mr-2 h-4 w-4" />
          XML (Electronic)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('receipt')}>
          <FileText className="mr-2 h-4 w-4" />
          Text Receipt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

