const mongoose = require('mongoose');

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');
    return true;
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err);
    return false;
  }
};

module.exports = {
  connect,
  mongoose
};