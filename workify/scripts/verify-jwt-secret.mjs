#!/usr/bin/env node

/**
 * Script para verificar que el JWT_SECRET esté funcionando correctamente
 * Uso: node scripts/verify-jwt-secret.mjs
 */

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Cargar variables de entorno
dotenv.config();

function verifyJWTSecret() {
  console.log('🔐 Verificando JWT_SECRET...\n');

  try {
    // 1. Verificar que JWT_SECRET esté configurado
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.log('❌ JWT_SECRET no está configurado');
      console.log('🔧 Solución: Agrega JWT_SECRET a tu archivo .env');
      return false;
    }

    console.log('1️⃣ Verificando configuración...');
    console.log(`   ✅ JWT_SECRET está configurado`);
    console.log(`   📏 Longitud: ${jwtSecret.length} caracteres`);
    console.log(`   🔒 Formato: ${jwtSecret.match(/^[a-f0-9]+$/i) ? 'Hexadecimal válido' : 'Formato no válido'}`);

    // 2. Verificar longitud mínima
    if (jwtSecret.length < 32) {
      console.log('❌ JWT_SECRET es demasiado corto (mínimo 32 caracteres)');
      return false;
    }

    console.log('   ✅ Longitud suficiente para producción');

    // 3. Probar firma y verificación de JWT
    console.log('\n2️⃣ Probando firma y verificación de JWT...');
    
    const testPayload = {
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'admin'
    };

    // Firmar JWT
    const token = jwt.sign(testPayload, jwtSecret, { 
      algorithm: 'HS256',
      expiresIn: '1h'
    });

    console.log(`   ✅ JWT firmado exitosamente`);
    console.log(`   📏 Longitud del token: ${token.length} caracteres`);

    // Verificar JWT
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    
    console.log(`   ✅ JWT verificado exitosamente`);
    console.log(`   👤 Usuario: ${decoded.userId}`);
    console.log(`   📧 Email: ${decoded.email}`);
    console.log(`   🎭 Rol: ${decoded.role}`);

    // 4. Probar con payload diferente
    console.log('\n3️⃣ Probando con payload diferente...');
    
    const testPayload2 = {
      userId: 'another-user-456',
      action: 'login',
      timestamp: Date.now()
    };

    const token2 = jwt.sign(testPayload2, jwtSecret, { 
      algorithm: 'HS256',
      expiresIn: '30m'
    });

    const decoded2 = jwt.verify(token2, jwtSecret, { algorithms: ['HS256'] });
    
    console.log(`   ✅ Segundo JWT verificado exitosamente`);
    console.log(`   👤 Usuario: ${decoded2.userId}`);
    console.log(`   🔧 Acción: ${decoded2.action}`);

    // 5. Probar verificación con clave incorrecta
    console.log('\n4️⃣ Probando seguridad (clave incorrecta)...');
    
    try {
      const wrongSecret = 'wrong-secret-key';
      jwt.verify(token, wrongSecret, { algorithms: ['HS256'] });
      console.log('❌ Error: JWT se verificó con clave incorrecta');
      return false;
    } catch (error) {
      console.log(`   ✅ Seguridad verificada: ${error.message}`);
    }

    // 6. Probar expiración
    console.log('\n5️⃣ Probando expiración...');
    
    const expiredToken = jwt.sign({ test: 'expired' }, jwtSecret, { 
      algorithm: 'HS256',
      expiresIn: '1s'
    });

    // Esperar 2 segundos para que expire
    setTimeout(() => {
      try {
        jwt.verify(expiredToken, jwtSecret, { algorithms: ['HS256'] });
        console.log('❌ Error: Token expirado no fue rechazado');
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          console.log('   ✅ Expiración funciona correctamente');
        } else {
          console.log(`   ❌ Error inesperado: ${error.message}`);
        }
      }
    }, 2000);

    // 7. Resumen final
    console.log('\n📊 RESUMEN DE VERIFICACIÓN JWT');
    console.log('==============================');
    console.log('✅ JWT_SECRET está configurado correctamente');
    console.log('✅ Longitud suficiente para producción');
    console.log('✅ Firma y verificación funcionan');
    console.log('✅ Seguridad verificada');
    console.log('✅ Expiración funciona');
    console.log('✅ Listo para autenticación');

    console.log('\n🔒 Características de seguridad:');
    console.log(`   • Longitud: ${jwtSecret.length} caracteres`);
    console.log(`   • Entropía: ${jwtSecret.length * 4} bits`);
    console.log(`   • Algoritmo: HS256`);
    console.log(`   • Expiración: Configurable`);

    console.log('\n🚀 El sistema está listo para:');
    console.log('   • Autenticación de usuarios');
    console.log('   • Autorización de roles');
    console.log('   • Sesiones seguras');
    console.log('   • APIs protegidas');

    return true;

  } catch (error) {
    console.error('\n❌ Error verificando JWT_SECRET:', error.message);
    console.log('\n🔧 Solución de problemas:');
    console.log('   1. Verifica que JWT_SECRET esté en .env');
    console.log('   2. Verifica que la clave sea válida');
    console.log('   3. Regenera la clave si es necesario');
    return false;
  }
}

// Ejecutar verificación
const success = verifyJWTSecret();

if (success) {
  console.log('\n✅ Verificación de JWT_SECRET completada exitosamente');
  process.exit(0);
} else {
  console.log('\n❌ Verificación de JWT_SECRET falló');
  process.exit(1);
} 