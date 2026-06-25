import mongoose from 'mongoose'

const dailyTaskSchema = new mongoose.Schema({
  description: { type: String, required: true },
  points_reward: { type: Number, default: 0 },
  coins_reward: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: true })

dailyTaskSchema.index({ is_active: 1, created_at: -1 })

export default mongoose.model('DailyTask', dailyTaskSchema)
