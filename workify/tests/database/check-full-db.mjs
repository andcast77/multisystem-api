import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFullDatabase() {
  console.log('🔍 Verificando estado completo de la base de datos...\n');

  try {
    // Verificar empresas
    const companies = await prisma.company.findMany();
    console.log(`📊 Empresas encontradas: ${companies.length}`);
    companies.forEach(company => {
      console.log(`   - ${company.name} (ID: ${company.id})`);
    });

    // Verificar roles
    const roles = await prisma.role.findMany();
    console.log(`\n🎭 Roles encontrados: ${roles.length}`);
    roles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id})`);
      console.log(`     Descripción: ${role.description}`);
      console.log(`     Activo: ${role.isActive ? '✅' : '❌'}`);
      console.log(`     Salario base: $${role.baseSalary}`);
    });

    // Verificar turnos de trabajo
    const workShifts = await prisma.workShift.findMany();
    console.log(`\n⏰ Turnos de trabajo encontrados: ${workShifts.length}`);
    workShifts.forEach(shift => {
      console.log(`   - ${shift.name} (ID: ${shift.id})`);
      console.log(`     Horario: ${shift.startTime} - ${shift.endTime}`);
      console.log(`     Descanso: ${shift.breakStart} - ${shift.breakEnd}`);
      console.log(`     Turno nocturno: ${shift.isNightShift ? '✅' : '❌'}`);
    });

    // Verificar empleados
    const employees = await prisma.employee.findMany({
      include: {
        role: true,
        company: true
      }
    });
    console.log(`\n👨‍💼 Empleados encontrados: ${employees.length}`);
    employees.forEach(employee => {
      console.log(`   - ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);
      console.log(`     Email: ${employee.email}`);
      console.log(`     Posición: ${employee.position}`);
      console.log(`     Departamento: ${employee.department}`);
      console.log(`     Rol: ${employee.role?.name || 'Sin rol'}`);
      console.log(`     Estado: ${employee.status}`);
    });

    // Verificar horarios
    const schedules = await prisma.schedule.findMany({
      include: {
        employee: true,
        workShift: true
      }
    });
    console.log(`\n📅 Horarios encontrados: ${schedules.length}`);
    schedules.forEach(schedule => {
      console.log(`   - ${schedule.employee.firstName} ${schedule.employee.lastName}`);
      console.log(`     Día: ${schedule.dayOfWeek} (${getDayName(schedule.dayOfWeek)})`);
      console.log(`     Día laboral: ${schedule.isWorkDay ? '✅' : '❌'}`);
      console.log(`     Turno: ${schedule.workShift?.name || 'Sin turno'}`);
    });

    // Verificar feriados
    const holidays = await prisma.holiday.findMany();
    console.log(`\n🎉 Feriados encontrados: ${holidays.length}`);
    holidays.forEach(holiday => {
      console.log(`   - ${holiday.name} (ID: ${holiday.id})`);
      console.log(`     Fecha: ${holiday.date.toLocaleDateString()}`);
      console.log(`     Descripción: ${holiday.description}`);
    });

    // Verificar usuarios
    const users = await prisma.user.findMany({
      include: {
        company: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });
    console.log(`\n🔐 Usuarios encontrados: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`);
      console.log(`     Empresa: ${user.company?.name || 'Sin empresa'}`);
      console.log(`     Roles: ${user.roles.map(ur => ur.role.name).join(', ') || 'Sin roles'}`);
      console.log(`     Password hash: ${user.password ? '✅ Presente' : '❌ Ausente'}`);
    });

    // Verificar asignaciones de roles
    const userRoles = await prisma.userRole.findMany({
      include: {
        user: true,
        role: true
      }
    });
    console.log(`\n🔗 Asignaciones de roles: ${userRoles.length}`);
    userRoles.forEach(userRole => {
      console.log(`   - ${userRole.user.email} -> ${userRole.role.name}`);
    });

    console.log('\n✅ Verificación completa finalizada.');

  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

function getDayName(dayOfWeek) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayOfWeek] || 'Desconocido';
}

checkFullDatabase(); 