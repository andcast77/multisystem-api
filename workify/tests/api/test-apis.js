import fetch from 'node-fetch';

// Token JWT para la empresa TechCorp Solutions (del seed)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55SWQiOiJkYWFjODI5ZC1lNmE0LTQzMTQtYTZiNS0xYTRmZTQxYjNmYTYiLCJpYXQiOjE3MzQ5NjQ4MDB9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const baseUrl = 'http://localhost:3000/api';

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Cookie': `token=${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`\n🔍 Probando ${method} ${endpoint}...`);
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
      console.log(`📊 Datos recibidos:`, JSON.stringify(data, null, 2));
      return data;
    } else {
      console.log(`❌ ${method} ${endpoint} - Status: ${response.status}`);
      console.log(`🚨 Error:`, data);
      return null;
    }
  } catch (error) {
    console.log(`💥 Error de conexión en ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de APIs...\n');

  // 1. Probar API de roles
  console.log('='.repeat(50));
  console.log('👥 PRUEBAS DE ROLES');
  console.log('='.repeat(50));
  
  const roles = await testAPI('/roles');
  if (roles && roles.roles) {
    console.log(`📈 Total de roles encontrados: ${roles.roles.length}`);
    roles.roles.forEach(role => {
      console.log(`   • ${role.name}: ${role.paymentType} - ${role.currency}`);
    });
  }

  // 2. Probar API de empleados
  console.log('\n' + '='.repeat(50));
  console.log('👤 PRUEBAS DE EMPLEADOS');
  console.log('='.repeat(50));
  
  const employees = await testAPI('/employees');
  if (employees && employees.employees) {
    console.log(`📈 Total de empleados encontrados: ${employees.employees.length}`);
    employees.employees.forEach(emp => {
      console.log(`   • ${emp.firstName} ${emp.lastName}: ${emp.position} (${emp.department})`);
    });
  }

  // 3. Probar API de turnos
  console.log('\n' + '='.repeat(50));
  console.log('⏰ PRUEBAS DE TURNOS');
  console.log('='.repeat(50));
  
  const shifts = await testAPI('/work-shifts');
  if (shifts && shifts.workShifts) {
    console.log(`📈 Total de turnos encontrados: ${shifts.workShifts.length}`);
    shifts.workShifts.forEach(shift => {
      console.log(`   • ${shift.name}: ${shift.startTime} - ${shift.endTime}`);
    });
  }

  // 4. Probar API de feriados
  console.log('\n' + '='.repeat(50));
  console.log('🎉 PRUEBAS DE FERIADOS');
  console.log('='.repeat(50));
  
  const holidays = await testAPI('/holidays');
  if (holidays && holidays.holidays) {
    console.log(`📈 Total de feriados encontrados: ${holidays.holidays.length}`);
    holidays.holidays.forEach(holiday => {
      console.log(`   • ${holiday.name}: ${new Date(holiday.date).toLocaleDateString()}`);
    });
  }

  // 5. Probar API de horarios
  console.log('\n' + '='.repeat(50));
  console.log('📅 PRUEBAS DE HORARIOS');
  console.log('='.repeat(50));
  
  const schedules = await testAPI('/schedules');
  if (schedules && schedules.schedules) {
    console.log(`📈 Total de horarios encontrados: ${schedules.schedules.length}`);
    // Mostrar algunos ejemplos
    schedules.schedules.slice(0, 5).forEach(schedule => {
      console.log(`   • Empleado ID: ${schedule.employeeId} - Día: ${schedule.dayOfWeek} - Turno: ${schedule.workShiftId}`);
    });
  }

  // 6. Probar API de registros de tiempo
  console.log('\n' + '='.repeat(50));
  console.log('⏱️ PRUEBAS DE REGISTROS DE TIEMPO');
  console.log('='.repeat(50));
  
  const timeEntries = await testAPI('/time-entries');
  if (timeEntries && timeEntries.timeEntries) {
    console.log(`📈 Total de registros de tiempo encontrados: ${timeEntries.timeEntries.length}`);
    timeEntries.timeEntries.forEach(entry => {
      console.log(`   • Empleado ID: ${entry.employeeId} - Fecha: ${new Date(entry.date).toLocaleDateString()} - Horas: ${entry.totalHours || 'Pendiente'}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ PRUEBAS COMPLETADAS');
  console.log('='.repeat(50));
}

// Ejecutar las pruebas
runTests().catch(console.error); 