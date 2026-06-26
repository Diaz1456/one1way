import mongoose from 'mongoose'

const dailyTaskCompletionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyTask', required: true },
  date: { type: String, required: true },
  completed: { type: Boolean, default: false },
}, { timestamps: true })

dailyTaskCompletionSchema.index({ user_id: 1, task_id: 1, date: 1 }, { unique: true })

export default mongoose.model('DailyTaskCompletion', dailyTaskCompletionSchema)
