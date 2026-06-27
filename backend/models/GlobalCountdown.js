import mongoose from 'mongoose'

const globalCountdownSchema = new mongoose.Schema({
  end_time: { type: Date, default: null },
  duration_seconds: { type: Number, default: 0 },
  is_active: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      ret.endTime = ret.end_time;
      ret.isActive = ret.is_active;
      ret.duration = ret.duration_seconds;
      delete ret.end_time;
      delete ret.is_active;
      delete ret.duration_seconds;
      delete ret.__v;
      return ret;
    },
  },
})

export default mongoose.model('GlobalCountdown', globalCountdownSchema)
