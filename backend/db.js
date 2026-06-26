import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/oneway'

export async function connectDB() {
  try {
    await mongoose.connect(uri)
    console.log('MongoDB connected:', uri)
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}

export default mongoose
