// Seed script para poblar la base de datos con datos iniciales
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos MultiSystem...')

  // Limpiar datos existentes (en orden correcto por relaciones)
  console.log('🧹 Limpiando datos existentes...')
  
  await prisma.loyaltyPoint.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.inventoryTransfer.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.category.deleteMany()
  await prisma.actionHistory.deleteMany()
  await prisma.notificationPreference.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.userPreferences.deleteMany()
  
  await prisma.specialDayAssignment.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.workShift.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.license.deleteMany()
  await prisma.payroll.deleteMany()
  await prisma.document.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.position.deleteMany()
  await prisma.department.deleteMany()
  await prisma.userPermission.deleteMany()
  await prisma.userRoleAssignment.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  await prisma.holidays.deleteMany()
  await prisma.licensePolicy.deleteMany()
  await prisma.payrollRule.deleteMany()
  await prisma.report.deleteMany()
  await prisma.integrationLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.company.deleteMany()
  await prisma.user.deleteMany()
  
  await prisma.storeConfig.deleteMany()
  await prisma.ticketConfig.deleteMany()
  await prisma.loyaltyConfig.deleteMany()
  await prisma.translation.deleteMany()

  console.log('✅ Datos limpiados')

  // ========================================
  // USUARIOS (UNIFICADO)
  // ========================================
  console.log('👤 Creando usuarios...')
  
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@multisystem.com' },
    update: {},
    create: {
      email: 'admin@multisystem.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Sistema',
      role: 'SUPERADMIN',
      isActive: true,
    },
  })

  const user1 = await prisma.user.create({
    data: {
      email: 'user1@multisystem.com',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'USER',
      isActive: true,
    },
  })

  console.log('✅ Usuarios creados')

  // ========================================
  // WORKIFY - Empresas y Estructura Organizacional
  // ========================================
  console.log('🏢 Creando empresas...')
  
  const company1 = await prisma.company.create({
    data: {
      name: 'Acme Inc.',
      email: 'contacto@acme.com',
      phone: '+1234567890',
      address: '123 Main St',
    },
  })

  const company2 = await prisma.company.create({
    data: {
      name: 'Acme Subsidiary',
      email: 'contacto@acme-subsidiary.com',
      phone: '+1234567891',
      parentId: company1.id, // Jerarquía
    },
  })

  console.log('✅ Empresas creadas')

  // Departamentos
  console.log('🏛️ Creando departamentos...')
  
  const deptIT = await prisma.department.create({
    data: {
      companyId: company1.id,
      name: 'Tecnología',
      description: 'Departamento de TI',
    },
  })

  const deptHR = await prisma.department.create({
    data: {
      companyId: company1.id,
      name: 'Recursos Humanos',
      description: 'Departamento de RRHH',
      parentId: null,
    },
  })

  const deptDev = await prisma.department.create({
    data: {
      companyId: company1.id,
      name: 'Desarrollo',
      description: 'Subdepartamento de Desarrollo',
      parentId: deptIT.id, // Jerarquía
    },
  })

  console.log('✅ Departamentos creados')

  // Posiciones
  console.log('💼 Creando posiciones...')
  
  const positionDev = await prisma.position.create({
    data: {
      companyId: company1.id,
      name: 'Desarrollador Senior',
      description: 'Desarrollador de software senior',
      salaryAmount: 5000,
      salaryType: 'month',
      overtimeEligible: true,
      overtimeType: 'multiplier',
      overtimeValue: 1.5,
      annualVacationDays: 15,
      hasAguinaldo: true,
      isActive: true,
    },
  })

  const positionManager = await prisma.position.create({
    data: {
      companyId: company1.id,
      name: 'Gerente de TI',
      description: 'Gerente del departamento de TI',
      salaryAmount: 8000,
      salaryType: 'month',
      overtimeEligible: false,
      annualVacationDays: 20,
      hasAguinaldo: true,
      isActive: true,
    },
  })

  console.log('✅ Posiciones creadas')

  // Roles y Permisos
  console.log('🔐 Creando roles y permisos...')
  
  const roleAdmin = await prisma.role.create({
    data: {
      companyId: company1.id,
      name: 'Administrador',
      description: 'Rol de administrador',
    },
  })

  const roleEmployee = await prisma.role.create({
    data: {
      companyId: company1.id,
      name: 'Empleado',
      description: 'Rol de empleado',
      parentId: roleAdmin.id, // Jerarquía
    },
  })

  const permissionView = await prisma.permission.create({
    data: {
      name: 'view_dashboard',
      description: 'Ver dashboard',
      resource: 'dashboard',
      action: 'view',
    },
  })

  const permissionEdit = await prisma.permission.create({
    data: {
      name: 'edit_employees',
      description: 'Editar empleados',
      resource: 'employees',
      action: 'edit',
    },
  })

  // Asignar roles a usuarios
  await prisma.userRoleAssignment.create({
    data: {
      userId: admin.id,
      roleId: roleAdmin.id,
      companyId: company1.id,
    },
  })

  await prisma.userPermission.create({
    data: {
      userId: admin.id,
      permissionId: permissionView.id,
    },
  })

  console.log('✅ Roles y permisos creados')

  // Turnos de trabajo
  console.log('⏰ Creando turnos de trabajo...')
  
  const morningShift = await prisma.workShift.create({
    data: {
      companyId: company1.id,
      name: 'Turno Mañana',
      startTime: '08:00',
      endTime: '16:00',
      breakDuration: 60,
      isActive: true,
    },
  })

  const afternoonShift = await prisma.workShift.create({
    data: {
      companyId: company1.id,
      name: 'Turno Tarde',
      startTime: '14:00',
      endTime: '22:00',
      breakDuration: 60,
      isActive: true,
    },
  })

  console.log('✅ Turnos creados')

  // Empleados
  console.log('👷 Creando empleados...')
  
  const employee1 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      departmentId: deptDev.id,
      positionId: positionDev.id,
      userId: user1.id,
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@acme.com',
      phone: '+1234567892',
      idNumber: '12345678',
      gender: 'MALE',
      dateJoined: new Date('2023-01-15'),
      status: 'ACTIVE',
    },
  })

  const employee2 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      departmentId: deptIT.id,
      positionId: positionManager.id,
      firstName: 'María',
      lastName: 'González',
      email: 'maria.gonzalez@acme.com',
      phone: '+1234567893',
      idNumber: '87654321',
      gender: 'FEMALE',
      dateJoined: new Date('2022-06-01'),
      status: 'ACTIVE',
    },
  })

  console.log('✅ Empleados creados')

  // Horarios
  console.log('📅 Creando horarios...')
  
  await prisma.schedule.createMany({
    data: [
      {
        employeeId: employee1.id,
        workShiftId: morningShift.id,
        dayOfWeek: 1, // Lunes
        isActive: true,
      },
      {
        employeeId: employee1.id,
        workShiftId: morningShift.id,
        dayOfWeek: 2, // Martes
        isActive: true,
      },
      {
        employeeId: employee1.id,
        workShiftId: morningShift.id,
        dayOfWeek: 3, // Miércoles
        isActive: true,
      },
      {
        employeeId: employee1.id,
        workShiftId: morningShift.id,
        dayOfWeek: 4, // Jueves
        isActive: true,
      },
      {
        employeeId: employee1.id,
        workShiftId: morningShift.id,
        dayOfWeek: 5, // Viernes
        isActive: true,
      },
    ],
  })

  console.log('✅ Horarios creados')

  // Días festivos
  console.log('🎉 Creando días festivos...')
  
  await prisma.holidays.createMany({
    data: [
      {
        companyId: company1.id,
        name: 'Año Nuevo',
        date: new Date('2024-01-01'),
        isRecurring: true,
      },
      {
        companyId: company1.id,
        name: 'Día del Trabajo',
        date: new Date('2024-05-01'),
        isRecurring: true,
      },
      {
        companyId: company1.id,
        name: 'Navidad',
        date: new Date('2024-12-25'),
        isRecurring: true,
      },
    ],
  })

  console.log('✅ Días festivos creados')

  // ========================================
  // SHOPFLOW - Productos y Categorías
  // ========================================
  console.log('🛍️ Creando categorías de ShopFlow...')
  
  const catElectronics = await prisma.category.create({
    data: {
      name: 'Electrónica',
      description: 'Productos electrónicos',
    },
  })

  const catComputers = await prisma.category.create({
    data: {
      name: 'Computadoras',
      description: 'Computadoras y laptops',
      parentId: catElectronics.id, // Jerarquía
    },
  })

  const catClothing = await prisma.category.create({
    data: {
      name: 'Ropa',
      description: 'Ropa y accesorios',
    },
  })

  console.log('✅ Categorías creadas')

  // Proveedores
  console.log('🚚 Creando proveedores...')
  
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Proveedor Principal',
      email: 'contacto@proveedor.com',
      phone: '+1234567894',
      address: '456 Supplier St',
      city: 'Ciudad',
      state: 'Estado',
      taxId: 'TAX123456',
      active: true,
    },
  })

  console.log('✅ Proveedores creados')

  // Productos
  console.log('📦 Creando productos...')
  
  const product1 = await prisma.product.create({
    data: {
      name: 'Laptop Dell Inspiron 15',
      description: 'Laptop Dell Inspiron 15 pulgadas',
      sku: 'LAP-DELL-001',
      barcode: '1234567890123',
      price: 899.99,
      cost: 650.00,
      stock: 10,
      minStock: 5,
      maxStock: 50,
      categoryId: catComputers.id,
      supplierId: supplier1.id,
      active: true,
    },
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Camiseta Básica',
      description: 'Camiseta de algodón 100%',
      sku: 'CLO-TSH-001',
      barcode: '1234567890124',
      price: 19.99,
      cost: 10.00,
      stock: 50,
      minStock: 20,
      maxStock: 200,
      categoryId: catClothing.id,
      supplierId: supplier1.id,
      active: true,
    },
  })

  console.log('✅ Productos creados')

  // Clientes
  console.log('👥 Creando clientes...')
  
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Cliente Ejemplo',
      email: 'cliente@example.com',
      phone: '+1234567895',
      address: '789 Customer Ave',
    },
  })

  console.log('✅ Clientes creados')

  // Configuración de tienda
  console.log('⚙️ Creando configuración de tienda...')
  
  await prisma.storeConfig.create({
    data: {
      name: 'Tienda Principal',
      address: '123 Store St',
      phone: '+1234567896',
      email: 'tienda@example.com',
      currency: 'USD',
      taxRate: 0.16,
      lowStockAlert: 10,
      invoicePrefix: 'INV-',
      invoiceNumber: 1,
      allowSalesWithoutStock: false,
    },
  })

  await prisma.ticketConfig.create({
    data: {
      ticketType: 'TICKET',
      header: 'Tienda Principal',
      footer: 'Gracias por su compra',
      thermalWidth: 80,
      fontSize: 12,
      copies: 1,
      autoPrint: true,
    },
  })

  await prisma.loyaltyConfig.create({
    data: {
      pointsPerDollar: 1,
      redemptionRate: 0.01,
      pointsExpireMonths: 12,
      minPurchaseForPoints: 10,
      maxPointsPerPurchase: 1000,
      isActive: true,
    },
  })

  console.log('✅ Configuración creada')

  // Preferencias de usuario
  console.log('⚙️ Creando preferencias de usuario...')
  
  await prisma.userPreferences.create({
    data: {
      userId: admin.id,
      language: 'es',
    },
  })

  await prisma.notificationPreference.create({
    data: {
      userId: admin.id,
      pushEnabled: true,
      emailEnabled: false,
      inAppEnabled: true,
      preferences: {
        LOW_STOCK: { inApp: true, push: true, email: false },
        IMPORTANT_SALE: { inApp: true, push: true, email: true },
      },
    },
  })

  console.log('✅ Preferencias creadas')

  // Notificaciones (unificado)
  console.log('🔔 Creando notificaciones...')
  
  await prisma.notification.create({
    data: {
      userId: admin.id,
      companyId: company1.id,
      type: 'INFO',
      priority: 'MEDIUM',
      title: 'Bienvenido a MultiSystem',
      message: 'Sistema inicializado correctamente',
      status: 'UNREAD',
    },
  })

  await prisma.notification.create({
    data: {
      userId: user1.id,
      type: 'LOW_STOCK',
      priority: 'HIGH',
      title: 'Stock bajo',
      message: 'El producto Laptop Dell tiene stock bajo',
      status: 'UNREAD',
    },
  })

  console.log('✅ Notificaciones creadas')

  console.log('🎉 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
