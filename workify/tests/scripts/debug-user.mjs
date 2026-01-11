import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugUser() {
  console.log('🔍 Debug del usuario admin...\n');

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@techcorp.com' },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Company ID: ${user.companyId}`);
      console.log(`   Company:`, user.company);
      console.log(`   Password: ${user.password ? '✅ Presente' : '❌ Ausente'}`);
      
      // Verificar si la empresa existe
      const company = await prisma.company.findUnique({
        where: { id: user.companyId }
      });
      
      console.log(`\n🏢 Empresa verificada:`, company);
      
      // Verificar si el password es válido
      if (user.password) {
        const bcrypt = await import('bcryptjs');
        const isValidHash = bcrypt.default.getRounds(user.password) > 0;
        console.log(`\n🔐 Hash válido: ${isValidHash ? '✅' : '❌'}`);
        
        // Probar la contraseña
        const isValidPassword = await bcrypt.default.compare('admin123', user.password);
        console.log(`🔑 Contraseña válida: ${isValidPassword ? '✅' : '❌'}`);
      }
      
    } else {
      console.log('❌ Usuario no encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugUser(); 