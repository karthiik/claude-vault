import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, Star, Calendar, Clock, Zap, Brain, Sparkles,
  RefreshCw, Loader2, X, ChevronRight, Send, MapPin
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
  const [showVaultDrawer, setShowVaultDrawer] = useState(false)
  const [dismissedInsights, setDismissedInsights] = useState([])
  const [completing, setCompleting] = useState(null)
  const [triageTask, setTriageTask] = useState(null)
  const [thingsProjects, setThingsProjects] = useState([])

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
            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Vault Triage Button */}
            <button
              onClick={() => setShowVaultDrawer(!showVaultDrawer)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showVaultDrawer
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              📥 Triage
              {vaultTasks.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  showVaultDrawer ? 'bg-white/20' : 'bg-purple-500/30 text-purple-400'
                }`}>
                  {vaultTasks.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto flex">
        {/* Main Content */}
        <main className={`flex-1 px-6 py-6 space-y-6 transition-all ${showVaultDrawer ? 'pr-2' : ''}`}>

          {/* AI Insights - All three strategies shown in a stack */}
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

          {/* Focus Section */}
          <section>
            <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-2">Focus</h2>
            <div className="bg-gray-800/30 rounded-xl px-3">
              {focusTasks.length > 0 ? (
                focusTasks.map((task, i) => (
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

          {/* Later Section */}
          {laterTasks.length > 0 && (
            <section>
              <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-2">Later</h2>
              <div className="bg-gray-800/20 rounded-xl px-3">
                {laterTasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isFirst={i === 0}
                    onComplete={handleComplete}
                    isCompleting={completing === task.id}
                  />
                ))}
              </div>
            </section>
          )}

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
                {calendar.routineCount} routine meeting{calendar.routineCount > 1 ? 's' : ''} hidden (standups, syncs, lunch)
              </p>
            )}
          </section>

        </main>

        {/* Vault Triage Drawer */}
        {showVaultDrawer && (
          <aside className="w-80 border-l border-gray-800/50 bg-gray-900/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                📥 Vault Triage
                <span className="text-xs text-gray-500 font-normal">{vaultTasks.length}</span>
              </h2>
              <button
                onClick={() => setShowVaultDrawer(false)}
                className="text-gray-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Tasks from your vault. Send to Things 3 or complete here.
            </p>

            {vaultTasks.length > 0 ? (
              <div className="space-y-1">
                {vaultTasks.map(task => (
                  <VaultTaskRow
                    key={task.id}
                    task={task}
                    onTriage={() => setTriageTask(task)}
                    onComplete={() => handleVaultComplete(task)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="text-3xl mb-2">✨</div>
                <p className="text-sm text-gray-500">Vault inbox zero!</p>
              </div>
            )}

            {/* Triage nudge */}
            {activeInsights.find(i => i.type === 'nudge') && vaultTasks.length > 0 && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-300">
                  💡 {activeInsights.find(i => i.type === 'nudge').message}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Triage Modal */}
      {triageTask && (
        <TriageModal
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
// Three insight types:
// - opportunity (Gap Finder): purple, ⏱️
// - guardian (Strategic Guardian): amber/orange, 🛡️
// - balance (Full Circle Pulse): teal/cyan, ⚖️
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
// TASK ROW COMPONENT
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
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// VAULT TASK ROW
// ============================================
function VaultTaskRow({ task, onTriage, onComplete }) {
  const area = LIFE_AREAS[task.fullCircleArea] || LIFE_AREAS.career
  const sourceLabels = { daily: '📅', project: '📁', carrier_goal: '🎯' }

  return (
    <div className="flex items-center gap-3 py-2.5 px-2 hover:bg-gray-700/30 rounded-lg transition-colors">
      <button
        onClick={onComplete}
        className="w-4 h-4 rounded-full border-2 border-gray-600 hover:border-green-500 hover:bg-green-500/20 transition-all flex-shrink-0"
        title="Complete in vault"
      />

      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: area.color }}
      />

      <span className="flex-1 text-sm text-gray-300 truncate">{task.text}</span>

      <span className="text-xs text-gray-600" title={task.filePath}>
        {sourceLabels[task.sourceType] || '📄'}
      </span>

      <button
        onClick={onTriage}
        className="px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center gap-1"
      >
        <Send size={10} />
        Things
      </button>
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
// TRIAGE MODAL
// ============================================
function TriageModal({ task, projects, onSend, onComplete, onCancel }) {
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedWhen, setSelectedWhen] = useState('today')
  const [deadline, setDeadline] = useState('')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-1">Send to Things 3</h3>
        <p className="text-sm text-gray-400 mb-4 truncate">{task.text}</p>

        {/* Project selector */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Inbox (no project)</option>
            {projects.map(group => (
              <optgroup key={group.area} label={group.area}>
                {group.projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* When selector */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1">When</label>
          <div className="flex gap-2">
            {['today', 'tomorrow', 'someday'].map(w => (
              <button
                key={w}
                onClick={() => setSelectedWhen(w)}
                className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${
                  selectedWhen === w
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div className="mb-6">
          <label className="text-xs text-gray-500 block mb-1">Deadline (optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            className="flex-1 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 text-sm transition-colors"
          >
            ✓ Done
          </button>
          <button
            onClick={() => onSend({ project: selectedProject, when: selectedWhen, deadline })}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm transition-colors"
          >
            → Send
          </button>
        </div>
      </div>
    </div>
  )
}
