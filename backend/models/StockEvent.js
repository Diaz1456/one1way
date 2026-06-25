import mongoose from 'mongoose'

const stockEventSchema = new mongoose.Schema({
  type: { type: String },
  message: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

stockEventSchema.index({ created_at: -1 })

export default mongoose.model('StockEvent', stockEventSchema)
