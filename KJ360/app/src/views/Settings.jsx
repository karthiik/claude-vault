import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Save, RotateCcw, ChevronDown, ChevronRight,
  FileText, Calendar, Sun, Moon, AlertCircle, CheckCircle2, Loader2,
  Edit3, Eye
} from 'lucide-react'

export default function SettingsView() {
  const [prompts, setPrompts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [expandedPrompt, setExpandedPrompt] = useState(null)
  const [editMode, setEditMode] = useState({})
  const [editedPrompts, setEditedPrompts] = useState({})

  useEffect(() => {
    fetchPrompts()
  }, [])

  async function fetchPrompts() {
    try {
      const res = await fetch('/api/brief/prompts')
      if (res.ok) {
        const data = await res.json()
        setPrompts(data)
      }
    } catch (err) {
      setError('Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  async function savePrompt(type) {
    setSaving(type)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/brief/prompts/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editedPrompts[type] })
      })

      if (res.ok) {
        setPrompts(prev => ({
          ...prev,
          [type]: { ...prev[type], prompt: editedPrompts[type] }
        }))
        setEditMode(prev => ({ ...prev, [type]: false }))
        setSuccess(`${prompts[type].name} saved successfully`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function resetPrompts() {
    if (!confirm('Reset all prompts to defaults? This cannot be undone.')) return

    setSaving('reset')
    try {
      const res = await fetch('/api/brief/prompts/reset', { method: 'POST' })
      if (res.ok) {
        await fetchPrompts()
        setEditMode({})
        setEditedPrompts({})
        setSuccess('Prompts reset to defaults')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Failed to reset prompts')
    } finally {
      setSaving(null)
    }
  }

  function startEditing(type) {
    setEditedPrompts(prev => ({ ...prev, [type]: prompts[type].prompt }))
    setEditMode(prev => ({ ...prev, [type]: true }))
  }

  function cancelEditing(type) {
    setEditMode(prev => ({ ...prev, [type]: false }))
    setEditedPrompts(prev => {
      const updated = { ...prev }
      delete updated[type]
      return updated
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <SettingsIcon size={28} className="text-gray-400" />
            Settings
          </h1>
          <p className="text-gray-400 mt-1">Configure your Brief prompts and preferences</p>
        </div>

        <button
          onClick={resetPrompts}
          disabled={saving === 'reset'}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
        >
          <RotateCcw size={16} className={saving === 'reset' ? 'animate-spin' : ''} />
          Reset to Defaults
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Brief Prompts Section */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={20} className="text-kj-primary" />
            Brief Generation Prompts
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Customize the AI prompts for your daily briefs. Weekday briefs are tactical, weekend briefs are reflective.
          </p>
        </div>

        <div className="divide-y divide-gray-700/50">
          {prompts && Object.entries(prompts).map(([type, config]) => (
            <div key={type} className="p-4">
              {/* Prompt Header */}
              <button
                onClick={() => setExpandedPrompt(expandedPrompt === type ? null : type)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  {type === 'weekday' ? (
                    <Sun size={20} className="text-amber-400" />
                  ) : (
                    <Moon size={20} className="text-indigo-400" />
                  )}
                  <div>
                    <h3 className="font-medium text-white">{config.name}</h3>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </div>
                {expandedPrompt === type ? (
                  <ChevronDown size={20} className="text-gray-400" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
              </button>

              {/* Expanded Prompt Content */}
              {expandedPrompt === type && (
                <div className="mt-4 space-y-4">
                  {editMode[type] ? (
                    <>
                      <textarea
                        value={editedPrompts[type] || ''}
                        onChange={(e) => setEditedPrompts(prev => ({ ...prev, [type]: e.target.value }))}
                        className="w-full h-96 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 font-mono text-sm focus:outline-none focus:border-kj-primary resize-y"
                        placeholder="Enter your prompt..."
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => savePrompt(type)}
                          disabled={saving === type}
                          className="flex items-center gap-2 px-4 py-2 bg-kj-primary hover:bg-kj-primary/80 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {saving === type ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Save size={16} />
                          )}
                          Save Changes
                        </button>
                        <button
                          onClick={() => cancelEditing(type)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <pre className="w-full p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-400 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-64">
                          {config.prompt}
                        </pre>
                        <button
                          onClick={() => startEditing(type)}
                          className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Brief Schedule Info */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
          <Calendar size={20} className="text-blue-400" />
          Brief Schedule
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Sun size={16} />
              <span className="font-medium">Weekdays (Mon-Fri)</span>
            </div>
            <p className="text-sm text-gray-500">Tactical brief at 6:00 AM</p>
            <p className="text-xs text-gray-600 mt-1">Focus: "The One Thing", calendar, deadlines</p>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Moon size={16} />
              <span className="font-medium">Weekends (Sat-Sun)</span>
            </div>
            <p className="text-sm text-gray-500">Reflective brief at 6:00 AM</p>
            <p className="text-xs text-gray-600 mt-1">Focus: Week review, themes, coaching</p>
          </div>
        </div>
      </div>

      {/* Full Circle Area Targets (Future) */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 opacity-60">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          🎯 Full Circle Area Targets
          <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">Coming Soon</span>
        </h2>
        <p className="text-sm text-gray-500">
          Configure target percentages for each life area to customize your balance goals.
        </p>
      </div>
    </div>
  )
}
