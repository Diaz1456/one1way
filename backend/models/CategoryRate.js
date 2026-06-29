import mongoose from 'mongoose'

const categoryRateSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true, trim: true },
  rate: { type: Number, default: 0, min: 0 },
}, { timestamps: true })

export default mongoose.model('CategoryRate', categoryRateSchema)
