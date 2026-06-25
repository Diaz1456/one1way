import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'player'], default: 'player' },
  display_name: { type: String, trim: true },
  avatar_url: { type: String, default: null },
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
}, { timestamps: true })

userSchema.index({ username: 1 })
userSchema.index({ role: 1 })
userSchema.index({ team_id: 1 })

export default mongoose.model('User', userSchema)
