import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediqueue', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MediQueue DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[MediQueue DB Warning] Direct MongoDB connection failed (${error.message}).`);
    console.warn(`[MediQueue DB Notice] Ensure local MongoDB service or MongoDB Atlas URI is set in MONGODB_URI.`);
    // We attempt reconnection or handle gracefully so app process doesn't immediately crash if Mongo is starting up
    return null;
  }
};
