import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import api from '../../api'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/categories')
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      setCreating(true)
      await api.post('/categories', { name: name.trim(), description })
      toast.success('Category created')
      setName('')
      setDescription('')
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (cat) => {
    setEditingId(cat.id || cat._id)
    setEditName(cat.name)
    setEditDescription(cat.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  const saveEdit = async (id) => {
    try {
      await api.put(`/categories/${id}`, { name: editName.trim(), description: editDescription })
      toast.success('Category updated')
      setEditingId(null)
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update category')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return
    try {
      await api.delete(`/categories/${id}`)
      toast.success('Category deleted')
      setCategories(prev => prev.filter(c => (c.id || c._id) !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete category')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Category</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input placeholder="Category name *" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          <button type="submit" disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors whitespace-nowrap">
            {creating ? 'Adding...' : 'Add Category'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Categories ({categories.length})</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">No categories yet</p>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => {
              const catId = cat.id || cat._id
              const isEditing = editingId === catId
              return (
                <div key={catId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  {isEditing ? (
                    <>
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      <input value={editDescription} onChange={e => setEditDescription(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Description" />
                      <button onClick={() => saveEdit(catId)} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded hover:bg-green-200">Save</button>
                      <button onClick={cancelEdit} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{cat.name}</span>
                      <span className="flex-1 text-sm text-gray-500 dark:text-gray-400">{cat.description || '-'}</span>
                      <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(catId)} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><FiTrash2 size={14} /></button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
