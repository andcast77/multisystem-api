const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar todas las tablas en orden correcto (por las relaciones)
  console.log('🧹 Limpiando datos existentes...');
  
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workHistory.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.workCalendarDay.deleteMany();
  await prisma.workCalendar.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.workShift.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.role.deleteMany();
  await prisma.company.deleteMany();

  console.log('✅ Datos limpiados correctamente');

  // 1. Crear la empresa
  console.log('🏢 Creando empresa...');
  const company = await prisma.company.create({
    data: {
      name: 'Acme Inc.',
    },
  });
  console.log(`✅ Empresa creada: ${company.name} (ID: ${company.id})`);

  // 2. Crear los roles
  console.log('👥 Creando roles...');
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
    },
  });
  
  const employeeRole = await prisma.role.create({
    data: {
      name: 'employee',
    },
  });
  console.log(`✅ Roles creados: ${adminRole.name}, ${employeeRole.name}`);

  // 3. Crear turnos de trabajo
  console.log('⏰ Creando turnos de trabajo...');
  const morningShift = await prisma.workShift.create({
    data: {
      name: 'Turno Mañana',
      description: 'Horario estándar de oficina',
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      tolerance: 15,
      isActive: true,
      isNightShift: false,
      companyId: company.id,
    },
  });

  const afternoonShift = await prisma.workShift.create({
    data: {
      name: 'Turno Tarde',
      description: 'Horario de tarde',
      startTime: '14:00',
      endTime: '22:00',
      breakStart: '18:00',
      breakEnd: '19:00',
      tolerance: 15,
      isActive: true,
      isNightShift: false,
      companyId: company.id,
    },
  });

  const nightShift = await prisma.workShift.create({
    data: {
      name: 'Turno Noche',
      description: 'Horario nocturno',
      startTime: '22:00',
      endTime: '06:00',
      breakStart: '02:00',
      breakEnd: '03:00',
      tolerance: 15,
      isActive: true,
      isNightShift: true,
      companyId: company.id,
    },
  });

  const partTimeShift = await prisma.workShift.create({
    data: {
      name: 'Part-time',
      description: 'Medio tiempo',
      startTime: '09:00',
      endTime: '13:00',
      tolerance: 10,
      isActive: true,
      isNightShift: false,
      companyId: company.id,
    },
  });

  console.log(`✅ Turnos creados: ${morningShift.name}, ${afternoonShift.name}, ${nightShift.name}, ${partTimeShift.name}`);

  // 4. Crear calendario laboral estándar
  console.log('📅 Creando calendario laboral...');
  const standardCalendar = await prisma.workCalendar.create({
    data: {
      name: 'Calendario Estándar',
      description: 'Calendario laboral estándar de lunes a viernes',
      isDefault: true,
      companyId: company.id,
    },
  });

  // Crear días del calendario (Lunes a Viernes con turno mañana)
  const workDays = [1, 2, 3, 4, 5]; // Lunes a Viernes
  for (const dayOfWeek of workDays) {
    await prisma.workCalendarDay.create({
      data: {
        workCalendarId: standardCalendar.id,
        dayOfWeek,
        isWorkDay: true,
        workShiftId: morningShift.id,
      },
    });
  }

  // Sábado y domingo como no laborables
  await prisma.workCalendarDay.create({
    data: {
      workCalendarId: standardCalendar.id,
      dayOfWeek: 0, // Domingo
      isWorkDay: false,
    },
  });

  await prisma.workCalendarDay.create({
    data: {
      workCalendarId: standardCalendar.id,
      dayOfWeek: 6, // Sábado
      isWorkDay: false,
    },
  });

  console.log('✅ Calendario laboral creado');

  // 5. Crear feriados de ejemplo
  console.log('🎉 Creando feriados...');
  const currentYear = new Date().getFullYear();
  
  const holidays = [
    {
      name: 'Año Nuevo',
      date: new Date(currentYear, 0, 1), // 1 de enero
      description: 'Celebración del año nuevo',
      isRecurring: true,
    },
    {
      name: 'Día del Trabajador',
      date: new Date(currentYear, 4, 1), // 1 de mayo
      description: 'Día internacional del trabajo',
      isRecurring: true,
    },
    {
      name: 'Día de la Independencia',
      date: new Date(currentYear, 6, 9), // 9 de julio
      description: 'Día de la independencia argentina',
      isRecurring: true,
    },
    {
      name: 'Navidad',
      date: new Date(currentYear, 11, 25), // 25 de diciembre
      description: 'Celebración de navidad',
      isRecurring: true,
    },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.create({
      data: {
        ...holiday,
        companyId: company.id,
      },
    });
  }

  console.log(`✅ ${holidays.length} feriados creados`);

  // 6. Crear el empleado
  console.log('👤 Creando empleado...');
  const employee = await prisma.employee.create({
    data: {
      firstName: 'Juan',
      lastName: 'Pérez',
      idNumber: '12345678',
      email: 'juan@acme.com',
      position: 'Desarrollador',
      department: 'Tecnología',
      dateJoined: new Date(),
      status: 'ACTIVE',
      companyId: company.id,
    },
  });
  console.log(`✅ Empleado creado: ${employee.firstName} ${employee.lastName}`);

  // 7. Asignar horarios al empleado (Lunes a Viernes con turno mañana)
  console.log('📋 Asignando horarios al empleado...');
  for (const dayOfWeek of workDays) {
    await prisma.schedule.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        dayOfWeek,
        workShiftId: morningShift.id,
        isWorkDay: true,
      },
    });
  }

  // 8. Crear el usuario admin
  console.log('🔐 Creando usuario admin...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const user = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      password: hashedPassword,
      companyId: company.id,
      employeeId: employee.id,
    },
  });
  console.log(`✅ Usuario creado: ${user.email}`);

  // 9. Asignar rol admin al usuario
  console.log('🔗 Asignando rol admin...');
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });
  console.log('✅ Rol admin asignado correctamente');

  // 10. Crear historial laboral para el empleado
  console.log('📋 Creando historial laboral...');
  await prisma.workHistory.create({
    data: {
      employeeId: employee.id,
      startDate: new Date(),
    },
  });
  console.log('✅ Historial laboral creado');

  // 11. Crear algunos registros de tiempo de ejemplo
  console.log('⏱️ Creando registros de tiempo de ejemplo...');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Registro de ayer
  await prisma.timeEntry.create({
    data: {
      employeeId: employee.id,
      date: yesterday,
      clockIn: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 15), // 08:15
      clockOut: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 5), // 16:05
      totalHours: 7.83,
      status: 'APPROVED',
    },
  });

  // Registro de hoy (solo entrada)
  await prisma.timeEntry.create({
    data: {
      employeeId: employee.id,
      date: today,
      clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30), // 08:30
      totalHours: null,
      status: 'PENDING',
    },
  });

  console.log('✅ Registros de tiempo creados');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📊 Resumen de datos creados:');
  console.log(`   • Empresa: ${company.name}`);
  console.log(`   • Roles: ${adminRole.name}, ${employeeRole.name}`);
  console.log(`   • Turnos: ${morningShift.name}, ${afternoonShift.name}, ${nightShift.name}, ${partTimeShift.name}`);
  console.log(`   • Calendario: ${standardCalendar.name}`);
  console.log(`   • Feriados: ${holidays.length} configurados`);
  console.log(`   • Empleado: ${employee.firstName} ${employee.lastName} (${employee.position})`);
  console.log(`   • Usuario: ${user.email} (rol: ${adminRole.name})`);
  console.log('\n🔑 Credenciales de acceso:');
  console.log(`   • Email: ${user.email}`);
  console.log(`   • Password: admin123`);
  console.log('\n📅 Horarios configurados:');
  console.log(`   • ${employee.firstName} trabaja de Lunes a Viernes, 08:00-16:00`);
  console.log(`   • Tolerancia de 15 minutos para tardanzas`);
  console.log(`   • Descanso de 12:00 a 13:00`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 