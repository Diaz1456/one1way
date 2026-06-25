import mongoose from 'mongoose'

const globalCountdownSchema = new mongoose.Schema({
  end_time: { type: Date, default: null },
  duration_seconds: { type: Number, default: 0 },
  is_active: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('GlobalCountdown', globalCountdownSchema)
