import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://ferchomap:XbL4aTOIgU8KiQyS@maniobras.4n5xq.mongodb.net/?retryWrites=true&w=majority&appName=maniobras';

async function checkMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    console.log('=== MANIOBRAS (3 ejemplos) ===');
    const maniobras = await db.collection('maniobras').find().limit(3).toArray();
    maniobras.forEach(m => console.log(JSON.stringify(m, null, 2)));
    
    console.log('\n=== GRUPOS (todos) ===');
    const groups = await db.collection('groups').find().toArray();
    groups.forEach(g => console.log(JSON.stringify(g)));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkMongo();
