const mongoose = require('mongoose');

// Disable command buffering so disconnected queries fail fast rather than hanging indefinitely
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 1500);

let isConnected = false;

async function connectMongoDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technova', {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
}

module.exports = {
  connectMongoDB,
  mongoose,
  isMongoConnected: () => mongoose.connection.readyState === 1
};
