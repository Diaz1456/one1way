import mongoose from 'mongoose'

const coinSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  amount: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.model('Coin', coinSchema)
