import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// IMPORTANTE: Configura esta variable de entorno antes de ejecutar
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: Debes configurar la variable de entorno MONGO_URI');
  console.error('Ejemplo: MONGO_URI="mongodb+srv://user:pass@host" node scripts/migrate-mongo-to-postgres.mjs');
  process.exit(1);
}

const prisma = new PrismaClient();

async function migrate() {
  console.log('=== MIGRACION MONGODB -> POSTGRESQL ===\n');
  
  // Conectar a MongoDB
  await mongoose.connect(MONGO_URI);
  console.log('Conectado a MongoDB');
  
  const db = mongoose.connection.db;
  
  // 1. Migrar grupos
  console.log('\n1. Migrando grupos...');
  const mongoGroups = await db.collection('groups').find().toArray();
  const groupMap = new Map(); // chatId -> postgresId
  
  for (const mg of mongoGroups) {
    const existing = await prisma.group.findUnique({ where: { chatId: mg.chatId } });
    if (existing) {
      groupMap.set(mg.chatId, existing.id);
      console.log('   [EXISTE] ' + mg.displayName);
    } else {
      const created = await prisma.group.create({
        data: { chatId: mg.chatId, name: mg.displayName }
      });
      groupMap.set(mg.chatId, created.id);
      console.log('   [CREADO] ' + mg.displayName);
    }
  }
  
  // 2. Obtener usuarios unicos de maniobras
  console.log('\n2. Migrando usuarios...');
  const mongoManiobras = await db.collection('maniobras').find().toArray();
  const uniqueAlertManagers = [...new Set(mongoManiobras.map(m => m.alertManagerId))];
  const userMap = new Map(); // alertManagerId -> postgresId
  
  for (const telegramId of uniqueAlertManagers) {
    const existing = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
    if (existing) {
      userMap.set(telegramId, existing.id);
      console.log('   [EXISTE] User ' + telegramId);
    } else {
      const created = await prisma.user.create({
        data: { telegramId: BigInt(telegramId), firstName: 'Usuario ' + telegramId }
      });
      userMap.set(telegramId, created.id);
      console.log('   [CREADO] User ' + telegramId);
    }
  }
  
  // 3. Migrar maniobras
  console.log('\n3. Migrando maniobras...');
  let created = 0, skipped = 0;
  
  for (const mm of mongoManiobras) {
    // Buscar o crear grupo si no existe en el map
    let groupId = groupMap.get(mm.chatId);
    if (!groupId) {
      const group = await prisma.group.upsert({
        where: { chatId: mm.chatId },
        create: { chatId: mm.chatId, name: mm.groupName || 'Grupo ' + mm.chatId },
        update: {}
      });
      groupId = group.id;
      groupMap.set(mm.chatId, groupId);
    }
    
    const userId = userMap.get(mm.alertManagerId);
    if (!userId) {
      console.log('   [SKIP] Sin userId para alertManagerId=' + mm.alertManagerId);
      skipped++;
      continue;
    }
    
    await prisma.maniobra.create({
      data: {
        groupId,
        userId,
        cantidad: mm.maniobras,
        descripcion: mm.descripcion,
        fecha: new Date(mm.fecha),
        createdAt: new Date(mm.fecha)
      }
    });
    created++;
  }
  
  console.log('   Creadas: ' + created + ', Omitidas: ' + skipped);
  
  // Resumen
  console.log('\n=== RESUMEN ===');
  const groupCount = await prisma.group.count();
  const userCount = await prisma.user.count();
  const maniobraCount = await prisma.maniobra.count();
  console.log('Grupos en PostgreSQL: ' + groupCount);
  console.log('Usuarios en PostgreSQL: ' + userCount);
  console.log('Maniobras en PostgreSQL: ' + maniobraCount);
  
  await mongoose.disconnect();
  await prisma.$disconnect();
  console.log('\nMigracion completada!');
}

migrate().catch(console.error);
