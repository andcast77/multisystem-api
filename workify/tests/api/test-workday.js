import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWorkDayFunctionality() {
  console.log('🧪 Probando funcionalidad de días laborables...\n');

  try {
    // Obtener la empresa
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('❌ No se encontró ninguna empresa');
      return;
    }

    console.log(`🏢 Empresa: ${company.name}\n`);

    // Probar diferentes fechas
    const currentYear = new Date().getFullYear();
    const testDates = [
      new Date(), // Hoy
      new Date(currentYear, 11, 25), // Navidad (debería ser feriado)
      new Date(currentYear, 4, 1), // Día del Trabajador (debería ser feriado)
      new Date(currentYear, 11, 28), // Sábado (debería ser no laborable)
      new Date(currentYear, 11, 29), // Domingo (debería ser no laborable)
      new Date(currentYear, 11, 30), // Lunes (debería ser laborable)
    ];

    for (const date of testDates) {
      console.log(`📅 Probando fecha: ${date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`);

      // Verificar si es feriado
      const holiday = await prisma.holiday.findFirst({
        where: {
          companyId: company.id,
          OR: [
            // Feriado exacto para esta fecha
            {
              date: {
                gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
              }
            },
            // Feriado recurrente (mismo día y mes, cualquier año)
            {
              isRecurring: true,
              date: {
                gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
              }
            }
          ]
        }
      });

      if (holiday) {
        console.log(`   🎉 Es feriado: ${holiday.name}`);
        console.log(`   📝 Descripción: ${holiday.description || 'Sin descripción'}`);
      }

      // Verificar calendario laboral
      const dayOfWeek = date.getDay();
      const defaultCalendar = await prisma.workCalendar.findFirst({
        where: {
          companyId: company.id,
          isDefault: true
        },
        include: {
          workDays: true
        }
      });

      if (defaultCalendar) {
        const workDay = defaultCalendar.workDays.find(wd => wd.dayOfWeek === dayOfWeek);
        if (workDay) {
          console.log(`   📋 Calendario: ${workDay.isWorkDay ? 'Día laborable' : 'Día no laborable'}`);
        }
      }

      // Verificar empleados programados
      const scheduledEmployees = await prisma.schedule.findMany({
        where: {
          companyId: company.id,
          dayOfWeek,
          isWorkDay: true,
          employee: {
            status: 'ACTIVE'
          }
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              position: true
            }
          }
        }
      });

      console.log(`   👥 Empleados programados: ${scheduledEmployees.length}`);
      if (scheduledEmployees.length > 0) {
        console.log(`   📋 Empleados:`);
        scheduledEmployees.forEach(emp => {
          console.log(`      - ${emp.employee.firstName} ${emp.employee.lastName} (${emp.employee.position})`);
        });
      }

      console.log('');
    }

    // Mostrar resumen de feriados configurados
    console.log('🎉 Feriados configurados:');
    const holidays = await prisma.holiday.findMany({
      where: { companyId: company.id },
      orderBy: { date: 'asc' }
    });

    holidays.forEach(holiday => {
      console.log(`   - ${holiday.name}: ${holiday.date.toLocaleDateString('es-ES')}`);
    });

    console.log('\n✅ Prueba completada');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkDayFunctionality(); 