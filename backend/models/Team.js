import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  color: { type: String, default: '#6366f1' },
  cash: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.model('Team', teamSchema)
