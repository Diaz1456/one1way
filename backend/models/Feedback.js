import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema({
  sender_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: true })

feedbackSchema.index({ created_at: -1 })

export default mongoose.model('Feedback', feedbackSchema)
