/**
 * Script para migrar usuarios existentes con sus roles
 * Ejecutar con: node scripts/seed-users.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs de usuarios existentes (del sistema anterior)
const existingUsers = [
  // Alert Managers (pueden activar y desactivar alertas, generar reportes)
  { telegramId: 7143094298n, role: 'ALERT_MANAGER', firstName: 'Alert Manager 1' },
  { telegramId: 1022124142n, role: 'ALERT_MANAGER', firstName: 'Alert Manager 2' },
  { telegramId: 7758965062n, role: 'ALERT_MANAGER', firstName: 'Alert Manager 3' },
  { telegramId: 5660087041n, role: 'ALERT_MANAGER', firstName: 'Alert Manager 4' },
  { telegramId: 6330970125n, role: 'ALERT_MANAGER', firstName: 'Alert Manager 5' },

  // Operators (solo pueden activar alertas)
  { telegramId: 7754458578n, role: 'OPERATOR', firstName: 'Operator 1' },
  { telegramId: 7509818905n, role: 'OPERATOR', firstName: 'Operator 2' },
  { telegramId: 8048487029n, role: 'OPERATOR', firstName: 'Operator 3' },
  { telegramId: 7241170867n, role: 'OPERATOR', firstName: 'Operator 4' },
];

async function seedUsers() {
  console.log('Iniciando migración de usuarios...\n');

  for (const userData of existingUsers) {
    try {
      const existing = await prisma.user.findUnique({
        where: { telegramId: userData.telegramId },
      });

      if (existing) {
        // Actualizar rol si ya existe
        const updated = await prisma.user.update({
          where: { telegramId: userData.telegramId },
          data: { role: userData.role },
        });
        console.log(
          `  ✅ Actualizado: ${updated.firstName || updated.telegramId} -> ${updated.role}`,
        );
      } else {
        // Crear usuario nuevo
        const created = await prisma.user.create({
          data: {
            telegramId: userData.telegramId,
            firstName: userData.firstName,
            role: userData.role,
            isActive: true,
          },
        });
        console.log(`  ➕ Creado: ${created.firstName} (${created.telegramId}) -> ${created.role}`);
      }
    } catch (error) {
      console.error(`  ❌ Error con usuario ${userData.telegramId}:`, error.message);
    }
  }

  console.log('\n✅ Migración completada');

  // Mostrar resumen
  const counts = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true },
  });

  console.log('\n📊 Resumen de usuarios:');
  for (const c of counts) {
    console.log(`   ${c.role}: ${c._count.role}`);
  }
}

seedUsers()
  .catch((error) => {
    console.error('Error en migración:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
