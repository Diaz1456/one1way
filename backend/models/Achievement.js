import mongoose from 'mongoose'

const achievementSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: null },
  points: { type: Number, default: 0 },
  date_earned: { type: Date, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true })

achievementSchema.index({ user_id: 1, category: 1 })

export default mongoose.model('Achievement', achievementSchema)
