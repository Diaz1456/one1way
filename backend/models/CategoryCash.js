import mongoose from 'mongoose'

const categoryCashSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true, trim: true },
  cash: { type: Number, default: 0, min: 0 },
}, { timestamps: true })

export default mongoose.model('CategoryCash', categoryCashSchema)
