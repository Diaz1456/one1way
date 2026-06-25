import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  player_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
}, { timestamps: true })

noteSchema.index({ player_user_id: 1 })

export default mongoose.model('Note', noteSchema)
