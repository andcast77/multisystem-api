import ExcelJS from 'exceljs'

export interface ExcelExportOptions {
  title?: string
  storeName?: string
  fileName?: string
  sheetName?: string
}

/**
 * Export sales data to Excel
 */
export async function exportSalesToExcel(
  sales: Array<{
    id: string
    invoiceNumber: string | null
    customer: { name: string } | null
    createdAt: Date
    total: number
    paymentMethod: string
    subtotal: number
    tax: number
    discount: number
  }>,
  options: ExcelExportOptions = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.sheetName || 'Ventas')

  // Set column widths
  worksheet.columns = [
    { width: 12 }, // Fecha
    { width: 15 }, // Factura
    { width: 25 }, // Cliente
    { width: 15 }, // Subtotal
    { width: 12 }, // Descuento
    { width: 12 }, // Impuesto
    { width: 15 }, // Total
    { width: 15 }, // Método de Pago
  ]

  // Header row
  if (options.storeName) {
    const titleRow = worksheet.addRow([options.storeName])
    titleRow.font = { size: 16, bold: true }
    titleRow.alignment = { horizontal: 'center' }
    worksheet.mergeCells(1, 1, 1, 8)
    worksheet.addRow([])
  }

  if (options.title) {
    const subtitleRow = worksheet.addRow([options.title])
    subtitleRow.font = { size: 14, bold: true }
    subtitleRow.alignment = { horizontal: 'center' }
    worksheet.mergeCells(worksheet.rowCount, 1, worksheet.rowCount, 8)
    worksheet.addRow([])
  }

  // Table headers
  const headerRow = worksheet.addRow([
    'Fecha',
    'Factura',
    'Cliente',
    'Subtotal',
    'Descuento',
    'Impuesto',
    'Total',
    'Método de Pago',
  ])

  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  // Data rows
  sales.forEach((sale) => {
    const row = worksheet.addRow([
      new Date(sale.createdAt).toLocaleDateString(),
      sale.invoiceNumber || '-',
      sale.customer?.name || 'Sin cliente',
      sale.subtotal,
      sale.discount,
      sale.tax,
      sale.total,
      sale.paymentMethod,
    ])

    // Format numeric columns
    row.getCell(4).numFmt = '#,##0.00' // Subtotal
    row.getCell(5).numFmt = '#,##0.00' // Discount
    row.getCell(6).numFmt = '#,##0.00' // Tax
    row.getCell(7).numFmt = '#,##0.00' // Total
  })

  // Add summary row
  const totalRow = worksheet.addRow([
    '',
    '',
    'TOTAL',
    sales.reduce((sum, s) => sum + s.subtotal, 0),
    sales.reduce((sum, s) => sum + s.discount, 0),
    sales.reduce((sum, s) => sum + s.tax, 0),
    sales.reduce((sum, s) => sum + s.total, 0),
    '',
  ])

  totalRow.font = { bold: true }
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE0E0' },
  }

  // Format numeric columns in summary row
  totalRow.getCell(4).numFmt = '#,##0.00'
  totalRow.getCell(5).numFmt = '#,##0.00'
  totalRow.getCell(6).numFmt = '#,##0.00'
  totalRow.getCell(7).numFmt = '#,##0.00'

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options.fileName || `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * Export report data to Excel
 */
export async function exportReportToExcel(
  data: {
    title: string
    headers: string[]
    rows: Array<Array<string | number>>
    summary?: Array<{ label: string; value: string | number }>
  },
  options: ExcelExportOptions = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.sheetName || 'Reporte')

  // Set column widths (auto-size based on headers)
  const colWidths = data.headers.map(() => 15)
  worksheet.columns = colWidths.map((width) => ({ width }))

  // Header
  if (options.storeName) {
    const titleRow = worksheet.addRow([options.storeName])
    titleRow.font = { size: 16, bold: true }
    titleRow.alignment = { horizontal: 'center' }
    worksheet.mergeCells(1, 1, 1, data.headers.length)
    worksheet.addRow([])
  }

  const subtitleRow = worksheet.addRow([data.title])
  subtitleRow.font = { size: 14, bold: true }
  subtitleRow.alignment = { horizontal: 'center' }
  worksheet.mergeCells(worksheet.rowCount, 1, worksheet.rowCount, data.headers.length)

  const dateRow = worksheet.addRow([
    `Generado: ${new Date().toLocaleString()}`,
  ])
  dateRow.font = { size: 10 }
  dateRow.alignment = { horizontal: 'center' }
  worksheet.mergeCells(worksheet.rowCount, 1, worksheet.rowCount, data.headers.length)
  worksheet.addRow([])

  // Table headers
  const headerRow = worksheet.addRow(data.headers)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  // Data rows
  data.rows.forEach((row) => {
    const worksheetRow = worksheet.addRow(row)
    // Format numeric cells
    row.forEach((cell, index) => {
      if (typeof cell === 'number') {
        worksheetRow.getCell(index + 1).numFmt = '#,##0.00'
      }
    })
  })

  // Summary if provided
  if (data.summary && data.summary.length > 0) {
    worksheet.addRow([])
    data.summary.forEach((item) => {
      const summaryRow = worksheet.addRow([item.label, item.value])
      summaryRow.font = { bold: true }
      if (typeof item.value === 'number') {
        summaryRow.getCell(2).numFmt = '#,##0.00'
      }
    })
  }

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options.fileName || `report-${new Date().toISOString().split('T')[0]}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * Export data to CSV
 */
export function exportToCSV(
  headers: string[],
  rows: Array<Array<string | number>>,
  fileName?: string
): void {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const value = String(cell)
          // Escape commas and quotes
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || `export-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}

