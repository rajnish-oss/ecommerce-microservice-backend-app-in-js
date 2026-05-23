import mongoose from 'mongoose';

const uri = process.env.MONGODB_URL || "mongodb://localhost:27017/prodCatalog";

export async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB via Mongoose");
  } catch (error) {
    console.error("Mongoose connection error:", error);
    throw error;
  }
}