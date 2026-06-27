import { useState } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineCog, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'
import toast from 'react-hot-toast'
import api from '../../api'
import useStore from '../../store'
import { playClick, playCoinUp } from '../../sound'

const Settings = ({ userDetails }) => {
  const { auth } = useStore()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!oldPassword) {
      toast.error('Current password is required')
      return
    }
    if (!newPassword) {
      toast.error('New password is required')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      playClick()
      await api.post('/auth/change-password', {
        current_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      playCoinUp()
      toast.success('Password changed!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <HiOutlineCog className="w-6 h-6 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showOld ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showOld ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)" minLength={6}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showNew ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showConfirm ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500 dark:text-red-400">Passwords do not match</p>
          )}

          <div className="pt-2">
            <button type="submit" disabled={savingPassword || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none">
              {savingPassword ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <HiOutlineCog className="w-4 h-4" />
              )}
              {savingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

export default Settings
