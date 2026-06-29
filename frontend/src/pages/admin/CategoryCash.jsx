import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiDollarSign, FiTrash2 } from 'react-icons/fi'
import api from '../../api'

export default function CategoryCash() {
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [cash, setCash] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/category-cash')
      setMappings(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load category cash values')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMappings() }, [fetchMappings])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!category.trim()) {
      toast.error('Category name is required')
      return
    }
    const cashVal = parseFloat(cash) || 0
    if (cashVal < 0) {
      toast.error('Cash value cannot be negative')
      return
    }
    try {
      setSaving(true)
      await api.post('/category-cash', { category: category.trim(), cash: cashVal })
      toast.success('Category cash value saved')
      setCategory('')
      setCash('')
      fetchMappings()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete cash mapping for "${cat}"?`)) return
    try {
      await api.delete(`/category-cash/${encodeURIComponent(cat)}`)
      toast.success('Mapping deleted')
      setMappings(prev => prev.filter(m => m.category !== cat))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
            <FiDollarSign className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add / Update Cash Value</h2>
        </div>
        <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
          <input placeholder="Category name *" value={category} onChange={e => setCategory(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
          <input placeholder="Cash value ($)" type="number" step="any" min="0" value={cash} onChange={e => setCash(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all whitespace-nowrap shadow-md shadow-emerald-500/20">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Category Cash Values ({mappings.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" /></div>
        ) : mappings.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">No cash values configured yet</p>
        ) : (
          <div className="space-y-2">
            {mappings.map(m => (
              <div key={m.id || m.category}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{m.category}</span>
                <span className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <FiDollarSign size={14} />
                  {(m.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button onClick={() => handleDelete(m.category)}
                  className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
