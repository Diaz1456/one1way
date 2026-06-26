import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineChatAlt2, HiOutlinePaperAirplane, HiOutlineTrash, HiOutlineUser } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playSwoosh, playClick } from '../../sound'

const FeedbackForm = () => {
  const { auth } = useStore()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedbacks, setFeedbacks] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const textareaRef = useRef(null)
  const userId = auth.user?.id

  useEffect(() => {
    if (!userId) { setLoadingHistory(false); return }
    api.get('/feedback')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.feedback || data.messages || data.results || []
        const mine = list.filter(f =>
          f.senderId === userId || f.userId === userId || f.sender?.id === userId
        )
        setFeedbacks(mine)
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [userId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      const { data } = await api.post('/feedback', { message: trimmed })
      playSwoosh()
      toast.success('Feedback sent!')
      setMessage('')
      const newItem = data.feedback || data.message || data || { message: trimmed, senderId: userId, createdAt: new Date().toISOString() }
      setFeedbacks(prev => [newItem, ...prev])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send feedback')
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleClear = () => {
    playClick()
    setMessage('')
    textareaRef.current?.focus()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <HiOutlineChatAlt2 className="w-6 h-6 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Send Feedback</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Share your thoughts, suggestions, or report an issue..."
              rows={4}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              disabled={sending}
            />
            <span className="absolute bottom-3 right-3 text-[10px] text-gray-400 dark:text-gray-500">
              {message.length}/1000
            </span>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={handleClear}
              disabled={!message.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <HiOutlineTrash className="w-4 h-4" />
              Clear
            </button>

            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <HiOutlinePaperAirplane className="w-4 h-4" />
              )}
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <HiOutlineChatAlt2 className="w-5 h-5 text-gray-400" />
          Your Feedback History
        </h3>

        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-400 dark:text-gray-500 text-sm">No feedback sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {feedbacks.map((fb, i) => (
                <motion.div
                  key={fb.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {fb.message || fb.text || fb.content || ''}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                      <HiOutlineUser className="w-3 h-3" />
                      You
                    </div>
                    {fb.createdAt && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {new Date(fb.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default FeedbackForm
