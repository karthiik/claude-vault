import React, { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, Calendar, Clock, Zap, Brain, Sparkles,
  RefreshCw, Loader2, X, ChevronRight, ChevronDown, Send, MapPin,
  Archive, CalendarDays, MoreHorizontal
} from 'lucide-react'
import { AreaDot } from '../components/AreaBadge'
import ErrorBoundary from '../components/ErrorBoundary'

// Full Circle Life Areas config
const LIFE_AREAS = {
  health: { emoji: '🏃', name: 'Health', color: '#10B981' },
  relationships: { emoji: '💛', name: 'Relationships', color: '#F59E0B' },
  career: { emoji: '🚀', name: 'Career', color: '#3B82F6' },
  finances: { emoji: '💰', name: 'Finances', color: '#22C55E' },
  learning: { emoji: '📚', name: 'Learning', color: '#8B5CF6' },
  joy: { emoji: '🎨', name: 'Joy', color: '#EC4899' },
  home: { emoji: '🏠', name: 'Home', color: '#06B6D4' },
  contribution: { emoji: '🌟', name: 'Legacy', color: '#F97316' },
}

// ============================================
// MAIN SMART NOW VIEW
// ============================================
export default function SmartNowView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dismissedInsights, setDismissedInsights] = useState([])
  const [completing, setCompleting] = useState(null)
  const [triageTask, setTriageTask] = useState(null)
  const [thingsProjects, setThingsProjects] = useState([])
  const [showLater, setShowLater] = useState(false)

  // Fetch Smart Now data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/smart-now')
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('[SmartNow] Fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch Things 3 projects for triage
  useEffect(() => {
    fetch('/api/tasks/things-projects')
      .then(res => res.json())
      .then(result => setThingsProjects(result.grouped || []))
      .catch(() => {})
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Complete a Things 3 task
  async function handleComplete(task) {
    setCompleting(task.id)
    try {
      await fetch('/api/tasks/complete-things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: task.text, uuid: task.thingsUuid })
      })
      // Optimistic update
      setData(prev => ({
        ...prev,
        focus: prev.focus.filter(t => t.id !== task.id),
        later: prev.later.filter(t => t.id !== task.id)
      }))
    } catch (err) {
      console.error('Failed to complete:', err)
    }
    setCompleting(null)
  }

  // Complete a vault task
  async function handleVaultComplete(task) {
    try {
      await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: task.filePath,
          lineNumber: task.lineNumber
        })
      })
      setData(prev => ({
        ...prev,
        vault: prev.vault.filter(t => t.id !== task.id)
      }))
    } catch (err) {
      console.error('Failed to complete vault task:', err)
    }
  }

  // Send vault task to Things 3
  async function handleSendToThings(task, options) {
    try {
      await fetch('/api/tasks/send-to-things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.text,
          project: options.project || null,
          when: options.when || 'today',
          deadline: options.deadline || null
        })
      })

      // Mark as triaged in vault
      await fetch('/api/tasks/mark-triaged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: task.filePath,
          lineNumber: task.lineNumber
        })
      })

      setData(prev => ({
        ...prev,
        vault: prev.vault.filter(t => t.id !== task.id)
      }))
      setTriageTask(null)
    } catch (err) {
      console.error('Failed to send to Things:', err)
    }
  }

  function dismissInsight(id) {
    setDismissedInsights(prev => [...prev, id])
  }

  // Filter insights
  const activeInsights = (data?.insights || []).filter(i => !dismissedInsights.includes(i.id))

  if (loading && !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading Smart Now...</span>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-red-400 mb-4">Failed to load: {error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    )
  }

  const focusTasks = data?.focus || []
  const laterTasks = data?.later || []
  const allTasks = [...focusTasks, ...laterTasks]
  const vaultTasks = data?.vault || []
  const calendar = data?.calendar || {}
  const importantEvents = calendar.important || []

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="px-6 py-5 border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">Now</h1>
            <span className="text-sm text-gray-500">
              {calendar.dayName}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6 space-y-6">

        {/* AI Insights */}
        {activeInsights.length > 0 && (
          <div className="space-y-2">
            {activeInsights.map(insight => (
              <AIInsight
                key={insight.id}
                insight={insight}
                onDismiss={dismissInsight}
              />
            ))}
          </div>
        )}

        {/* Focus Section - All Tasks */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-gray-500 uppercase tracking-wide">Focus</h2>
            <span className="text-xs text-gray-600">{allTasks.length} tasks</span>
          </div>
          <div className="bg-gray-800/30 rounded-xl px-3">
            {allTasks.length > 0 ? (
              allTasks.map((task, i) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isFirst={i === 0}
                  onComplete={handleComplete}
                  isCompleting={completing === task.id}
                />
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Sparkles size={24} className="mx-auto mb-2 text-gray-600" />
                <p>All caught up!</p>
              </div>
            )}
          </div>
        </section>

        {/* Calendar Section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-gray-500 uppercase tracking-wide">Today's Calendar</h2>
            <span className="text-xs text-gray-600">{importantEvents.length} key meetings</span>
          </div>
          <div className="bg-gray-800/30 rounded-xl px-3">
            {importantEvents.length > 0 ? (
              importantEvents.map((event, i) => (
                <CalendarEventRow key={i} event={event} isFirst={i === 0} />
              ))
            ) : (
              <div className="py-6 text-center text-gray-500">
                <Calendar size={20} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No key meetings today</p>
              </div>
            )}
          </div>
          {calendar.routineCount > 0 && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              {calendar.routineCount} routine meeting{calendar.routineCount > 1 ? 's' : ''} hidden
            </p>
          )}
        </section>

        {/* Triage Section - Bottom of page */}
        {vaultTasks.length > 0 && (
          <section className="pt-4 border-t border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📥</span>
                <h2 className="text-sm text-gray-500 uppercase tracking-wide">Triage</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                  {vaultTasks.length}
                </span>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-xl overflow-hidden">
              {vaultTasks.map((task, i) => (
                <TriageTaskRow
                  key={task.id}
                  task={task}
                  isFirst={i === 0}
                  onComplete={() => handleVaultComplete(task)}
                  onSendToday={() => handleSendToThings(task, { when: 'today' })}
                  onSchedule={() => setTriageTask(task)}
                  onSomeday={() => handleSendToThings(task, { when: 'someday' })}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Schedule Modal */}
      {triageTask && (
        <ScheduleModal
          task={triageTask}
          projects={thingsProjects}
          onSend={(options) => handleSendToThings(triageTask, options)}
          onComplete={() => {
            handleVaultComplete(triageTask)
            setTriageTask(null)
          }}
          onCancel={() => setTriageTask(null)}
        />
      )}
    </div>
  )
}

// ============================================
// AI INSIGHT COMPONENT
// ============================================
function AIInsight({ insight, onDismiss }) {
  const configs = {
    opportunity: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      iconBg: 'bg-purple-500/20',
      actionColor: 'text-purple-400 hover:text-purple-300',
      defaultIcon: '⏱️'
    },
    guardian: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20',
      actionColor: 'text-amber-400 hover:text-amber-300',
      defaultIcon: '🛡️'
    },
    balance: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20',
      actionColor: 'text-cyan-400 hover:text-cyan-300',
      defaultIcon: '⚖️'
    },
    nudge: {
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/30',
      iconBg: 'bg-gray-500/20',
      actionColor: 'text-gray-400 hover:text-gray-300',
      defaultIcon: '📥'
    },
    calendar: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      actionColor: 'text-blue-400 hover:text-blue-300',
      defaultIcon: '📅'
    },
  }
  const config = configs[insight.type] || configs.opportunity
  const icon = insight.icon || config.defaultIcon

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl px-4 py-3 flex items-start gap-3`}>
      <div className={`${config.iconBg} rounded-lg p-1.5 flex-shrink-0`}>
        <span className="text-base">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-relaxed">{insight.message}</p>
        {insight.action && (
          <button className={`text-xs font-medium ${config.actionColor} mt-1.5 flex items-center gap-1`}>
            {insight.action}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(insight.id)}
        className="text-gray-600 hover:text-gray-400 p-1 -mr-1 -mt-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ============================================
// TASK ROW COMPONENT (for Things 3 tasks)
// ============================================
function TaskRow({ task, onComplete, isFirst, isCompleting }) {
  const [showActions, setShowActions] = useState(false)
  const area = LIFE_AREAS[task.fullCircleArea] || LIFE_AREAS.career
  const energyIcons = { deep: '🧠', creative: '✨', quick: '⚡' }
  const today = new Date().toISOString().split('T')[0]

  return (
    <div
      className={`group flex items-center gap-3 py-3 px-2 hover:bg-gray-800/30 rounded-lg transition-colors ${
        isFirst ? '' : 'border-t border-gray-800/50'
      } ${isCompleting ? 'opacity-50' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Checkbox */}
      <button
        onClick={() => onComplete(task)}
        disabled={isCompleting}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center ${
          isCompleting
            ? 'border-green-500 bg-green-500'
            : 'border-gray-600 hover:border-green-500 hover:bg-green-500/20'
        }`}
      >
        {isCompleting && <CheckCircle size={12} className="text-white" />}
      </button>

      {/* Area dot */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: area.color }}
        title={area.name}
      />

      {/* Task text */}
      <span className="flex-1 text-gray-100">{task.text}</span>

      {/* Metadata */}
      <div className="flex items-center gap-2">
        {task.projectName && !showActions && (
          <span className="text-xs text-gray-600 hidden sm:inline max-w-28 truncate">
            {task.projectName}
          </span>
        )}

        {task.deadline && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            task.deadline === today
              ? 'bg-red-500/20 text-red-400'
              : 'bg-gray-700 text-gray-400'
          }`}>
            {task.deadline === today ? 'Today' : task.deadline.slice(5)}
          </span>
        )}

        <span className="text-sm" title={`${task.energy} energy`}>
          {energyIcons[task.energy] || '⚡'}
        </span>

        {/* Quick actions on hover */}
        <div className={`flex items-center gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <button
            className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-amber-400"
            title="Snooze"
          >
            <Clock size={14} />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white"
            title="More"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TRIAGE TASK ROW - List item with inline actions
// ============================================
function TriageTaskRow({ task, isFirst, onComplete, onSendToday, onSchedule, onSomeday }) {
  const [showActions, setShowActions] = useState(false)
  const area = LIFE_AREAS[task.fullCircleArea] || LIFE_AREAS.career
  const energyIcons = { deep: '🧠', creative: '✨', quick: '⚡' }

  // Clean up Obsidian wiki links and formatting
  const cleanText = (text) => {
    return text
      .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
      .replace(/—/g, '-')
      .replace(/·/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const displayText = cleanText(task.text)
  const sourceFile = task.filePath?.split('/').pop()?.replace('.md', '') || 'Vault'

  return (
    <div
      className={`group flex items-center gap-3 py-3 px-4 hover:bg-gray-800/50 transition-colors ${
        isFirst ? '' : 'border-t border-gray-700/30'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Area dot */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: area.color }}
        title={area.name}
      />

      {/* Task text & source */}
      <div className="flex-1 min-w-0">
        <span className="text-gray-200 block truncate">{displayText}</span>
        <span className="text-xs text-gray-600">{sourceFile}</span>
      </div>

      {/* Energy indicator */}
      <span className="text-sm opacity-60" title={`${task.energy} energy`}>
        {energyIcons[task.energy] || '⚡'}
      </span>

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className={`flex items-center gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'}`}>
        <button
          onClick={onComplete}
          className="p-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
          title="Done"
        >
          <CheckCircle size={14} />
        </button>
        <button
          onClick={onSendToday}
          className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
          title="Send to Today"
        >
          <Send size={14} />
        </button>
        <button
          onClick={onSchedule}
          className="p-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          title="Schedule for later"
        >
          <CalendarDays size={14} />
        </button>
        <button
          onClick={onSomeday}
          className="p-1.5 rounded-lg bg-gray-700/50 text-gray-500 hover:bg-gray-700 hover:text-gray-300 transition-colors"
          title="Someday"
        >
          <Archive size={14} />
        </button>
      </div>
    </div>
  )
}

// ============================================
// CALENDAR EVENT ROW
// ============================================
function CalendarEventRow({ event, isFirst }) {
  const area = event.fullCircleArea ? LIFE_AREAS[event.fullCircleArea] : null

  function formatTime(timeStr) {
    if (!timeStr || timeStr === 'All day') return timeStr
    const [h, m] = timeStr.split(':').map(Number)
    const period = h >= 12 ? 'pm' : 'am'
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour12}:${m.toString().padStart(2, '0')}${period}`
  }

  function getEndTime(startTime, durationMins) {
    if (!startTime || !durationMins) return null
    const [h, m] = startTime.split(':').map(Number)
    const totalMins = h * 60 + m + durationMins
    const endH = Math.floor(totalMins / 60)
    const endM = totalMins % 60
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  }

  const endTime = getEndTime(event.time, event.duration)

  return (
    <div className={`flex items-start gap-3 py-3 px-2 hover:bg-gray-800/30 rounded-lg transition-colors ${
      isFirst ? '' : 'border-t border-gray-800/50'
    }`}>
      {/* Time column */}
      <div className="w-16 flex-shrink-0">
        <div className="text-sm font-medium text-white">{formatTime(event.time)}</div>
        {event.duration && (
          <div className="text-xs text-gray-600">{event.duration}min</div>
        )}
      </div>

      {/* Area dot */}
      {area && (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: area.color }}
          title={area.name}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-gray-100">{event.title}</div>
        {event.attendees && event.attendees.length > 0 && (
          <div className="text-xs text-gray-500 mt-0.5">
            {event.attendees.join(', ')}
          </div>
        )}
        {event.location && (
          <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
            <MapPin size={10} />
            {event.location}
          </div>
        )}
        {event.aiNote && (
          <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
            <Sparkles size={10} />
            {event.aiNote}
          </div>
        )}
      </div>

      {/* Time range */}
      {endTime && (
        <span className="text-xs text-gray-600 flex-shrink-0">
          {formatTime(event.time)} – {formatTime(endTime)}
        </span>
      )}
    </div>
  )
}

// ============================================
// SCHEDULE MODAL
// ============================================
function ScheduleModal({ task, projects, onSend, onComplete, onCancel }) {
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedWhen, setSelectedWhen] = useState('tomorrow')
  const [deadline, setDeadline] = useState('')

  const area = LIFE_AREAS[task.fullCircleArea] || LIFE_AREAS.career

  const cleanText = (text) => {
    return text
      .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
      .replace(/—/g, '-')
      .replace(/·/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const displayText = cleanText(task.text)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-start gap-3">
            <span
              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: area.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-white leading-snug">
                {displayText}
              </h3>
              <p className="text-xs text-gray-500 mt-1" style={{ color: area.color }}>
                {area.name}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-white p-1 -mr-1 -mt-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="p-5 space-y-4">
          {/* When selector */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Schedule for</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'tomorrow', label: 'Tomorrow', icon: '🌙' },
                { key: 'weekend', label: 'Weekend', icon: '☀️' },
                { key: 'nextweek', label: 'Next Week', icon: '📅' }
              ].map(w => (
                <button
                  key={w.key}
                  onClick={() => setSelectedWhen(w.key)}
                  className={`py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5 ${
                    selectedWhen === w.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span>{w.icon}</span>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project selector */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Project (optional)</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">📥 Inbox (no project)</option>
              {projects.map(group => (
                <optgroup key={group.area} label={group.area}>
                  {group.projects.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Deadline (optional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Submit */}
          <button
            onClick={() => onSend({ project: selectedProject, when: selectedWhen, deadline })}
            className="w-full py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Send size={16} />
            Schedule Task
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 text-center">
          <span className="text-xs text-gray-600">Press Esc to cancel</span>
        </div>
      </div>
    </div>
  )
}
