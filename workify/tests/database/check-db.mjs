import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Verificando estado de la base de datos...\n');

  try {
    // Verificar empresas
    const companies = await prisma.company.findMany();
    console.log(`📊 Empresas encontradas: ${companies.length}`);
    companies.forEach(company => {
      console.log(`   - ${company.name} (ID: ${company.id})`);
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
    console.log(`\n👥 Usuarios encontrados: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`);
      console.log(`     Empresa: ${user.company?.name || 'Sin empresa'}`);
      console.log(`     Roles: ${user.roles.map(ur => ur.role.name).join(', ') || 'Sin roles'}`);
      console.log(`     Password hash: ${user.password ? '✅ Presente' : '❌ Ausente'}`);
    });

    // Verificar roles
    const roles = await prisma.role.findMany();
    console.log(`\n🎭 Roles encontrados: ${roles.length}`);
    roles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id})`);
      console.log(`     Descripción: ${role.description}`);
      console.log(`     Activo: ${role.isActive ? '✅' : '❌'}`);
    });

    // Verificar userRoles
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

    // Verificar si el usuario admin existe y tiene password
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@techcorp.com' },
      include: {
        company: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (adminUser) {
      console.log(`\n✅ Usuario admin encontrado:`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Password: ${adminUser.password ? '✅ Hash presente' : '❌ Sin password'}`);
      console.log(`   Empresa: ${adminUser.company?.name}`);
      console.log(`   Roles: ${adminUser.roles.map(ur => ur.role.name).join(', ')}`);
      
      // Verificar si el password hash es válido
      if (adminUser.password) {
        const bcrypt = await import('bcryptjs');
        const isValidHash = bcrypt.default.getRounds(adminUser.password) > 0;
        console.log(`   Hash válido: ${isValidHash ? '✅' : '❌'}`);
      }
    } else {
      console.log(`\n❌ Usuario admin NO encontrado`);
    }

  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 