import mongoose from 'mongoose'

const presenceLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: String },
  timestamp: { type: Date, default: Date.now },
})

presenceLogSchema.index({ timestamp: -1 })

export default mongoose.model('PresenceLog', presenceLogSchema)
