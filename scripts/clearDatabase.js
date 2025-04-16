require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { Maniobra } = require('../src/models');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado a MongoDB');

    rl.question('¿Estás seguro de que quieres borrar TODOS los datos? (escribe "CONFIRMAR" para proceder): ', async (answer) => {
      if (answer === 'CONFIRMAR') {
        await Maniobra.deleteMany({});
        console.log('Base de datos limpiada exitosamente');
      } else {
        console.log('Operación cancelada');
      }
      await mongoose.disconnect();
      rl.close();
    });
  } catch (error) {
    console.error('Error al limpiar la base de datos:', error);
    process.exit(1);
  }
}

clearDatabase();
