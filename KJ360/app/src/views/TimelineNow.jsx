import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckCircle, Calendar, Clock, Zap, Brain, Sparkles,
  RefreshCw, Loader2, X, ChevronRight, ChevronLeft, Send, MapPin,
  Play, SkipForward, CalendarDays, Archive
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

// Energy icons
const ENERGY_ICONS = {
  deep: { icon: Brain, label: 'Deep work', color: 'text-purple-400' },
  creative: { icon: Sparkles, label: 'Creative', color: 'text-pink-400' },
  quick: { icon: Zap, label: 'Quick task', color: 'text-yellow-400' },
}

// ============================================
// MAIN TIMELINE NOW VIEW
// ============================================
export default function TimelineNowView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [triageIndex, setTriageIndex] = useState(0)
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
      console.error('[TimelineNow] Fetch error:', err)
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
      removeVaultTask(task.id)
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

      removeVaultTask(task.id)
      setTriageTask(null)
    } catch (err) {
      console.error('Failed to send to Things:', err)
    }
  }

  function removeVaultTask(taskId) {
    setData(prev => ({
      ...prev,
      vault: prev.vault.filter(t => t.id !== taskId)
    }))
    // Adjust triage index if needed
    setTriageIndex(prev => {
      const newVaultLength = (data?.vault?.length || 1) - 1
      if (prev >= newVaultLength && newVaultLength > 0) {
        return newVaultLength - 1
      }
      return prev
    })
  }

  function nextTriageTask() {
    const vaultLength = data?.vault?.length || 0
    if (triageIndex < vaultLength - 1) {
      setTriageIndex(prev => prev + 1)
    }
  }

  function prevTriageTask() {
    if (triageIndex > 0) {
      setTriageIndex(prev => prev - 1)
    }
  }

  // Build timeline blocks from calendar and tasks
  const timelineBlocks = useMemo(() => {
    if (!data) return []

    const blocks = []
    const now = new Date()
    const currentHour = now.getHours()
    const calendar = data.calendar || {}
    const events = calendar.important || []
    const focusTasks = data.focus || []
    const laterTasks = data.later || []

    // Find open blocks (simplified - would use real calendar gaps in production)
    // For now, assume morning block if before noon, afternoon if after
    const hasOpenBlock = events.length === 0 || true // Always show at least one open block

    if (hasOpenBlock) {
      // Calculate time until next event or EOD
      let blockEnd = '6:00 PM'
      let blockDuration = '7h+'

      if (events.length > 0) {
        const nextEvent = events[0]
        blockEnd = nextEvent.time
        // Rough duration calc
        const [h, m] = (nextEvent.time || '18:00').split(':').map(Number)
        const hoursUntil = h - currentHour
        blockDuration = hoursUntil > 0 ? `${hoursUntil}h+` : '1h+'
      }

      blocks.push({
        type: 'open',
        time: currentHour < 12 ? '9:00 AM' : `${currentHour}:00`,
        label: `OPEN (${blockDuration})`,
        tasks: focusTasks.slice(0, 3),
        nextTasks: [...focusTasks.slice(3), ...laterTasks].slice(0, 2)
      })
    }

    // Add calendar events
    events.forEach(event => {
      blocks.push({
        type: 'meeting',
        time: formatTime(event.time),
        label: `MEETING`,
        duration: event.duration ? `${event.duration} min` : null,
        event
      })
    })

    // Add wrap-up block if there's time after last meeting
    if (events.length > 0) {
      const lastEvent = events[events.length - 1]
      const [h] = (lastEvent.time || '17:00').split(':').map(Number)
      const endHour = h + Math.ceil((lastEvent.duration || 30) / 60)

      if (endHour < 18) {
        blocks.push({
          type: 'wrapup',
          time: `${endHour}:00 PM`,
          label: 'WRAP UP',
          tasks: laterTasks.filter(t => t.energy === 'quick').slice(0, 2)
        })
      }
    }

    return blocks
  }, [data])

  if (loading && !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading your day...</span>
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

  const vaultTasks = data?.vault || []
  const currentTriageTask = vaultTasks[triageIndex]
  const calendar = data?.calendar || {}

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="px-6 py-5 border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">
              {calendar.dayName || 'Today'}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6 space-y-6">

        {/* Timeline Progress Bar */}
        <TimelineProgressBar />

        {/* Timeline Blocks */}
        <div className="space-y-4">
          {timelineBlocks.map((block, idx) => (
            <ErrorBoundary key={idx} compact fallbackMessage="Failed to load block">
              {block.type === 'open' && (
                <OpenBlock
                  block={block}
                  onComplete={handleComplete}
                  completing={completing}
                />
              )}
              {block.type === 'meeting' && (
                <MeetingBlock block={block} />
              )}
              {block.type === 'wrapup' && (
                <WrapUpBlock block={block} />
              )}
            </ErrorBoundary>
          ))}
        </div>

        {/* Divider */}
        {vaultTasks.length > 0 && (
          <div className="border-t border-gray-700/50 pt-6">
            {/* Triage Section */}
            <TriageCarousel
              tasks={vaultTasks}
              currentIndex={triageIndex}
              currentTask={currentTriageTask}
              onNext={nextTriageTask}
              onPrev={prevTriageTask}
              onComplete={handleVaultComplete}
              onSendToday={(task) => handleSendToThings(task, { when: 'today' })}
              onSchedule={(task) => setTriageTask(task)}
              onSomeday={(task) => handleSendToThings(task, { when: 'someday' })}
            />
          </div>
        )}
      </main>

      {/* Schedule Modal */}
      {triageTask && (
        <ScheduleModal
          task={triageTask}
          projects={thingsProjects}
          onSend={(options) => handleSendToThings(triageTask, options)}
          onCancel={() => setTriageTask(null)}
        />
      )}
    </div>
  )
}

// ============================================
// TIMELINE PROGRESS BAR
// ============================================
function TimelineProgressBar() {
  const now = new Date()
  const currentHour = now.getHours()
  const startHour = 9
  const endHour = 18
  const progress = Math.min(100, Math.max(0, ((currentHour - startHour) / (endHour - startHour)) * 100))

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span>NOW</span>
      <div className="flex-1 relative h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg"
          style={{ left: `${progress}%`, marginLeft: '-4px' }}
        />
      </div>
      <span>6PM</span>
    </div>
  )
}

// ============================================
// OPEN BLOCK - Shows tasks that fit this time
// ============================================
function OpenBlock({ block, onComplete, completing }) {
  const primaryTask = block.tasks?.[0]
  const nextTasks = block.nextTasks || []
  const area = primaryTask ? LIFE_AREAS[primaryTask.fullCircleArea] : null
  const energy = primaryTask ? ENERGY_ICONS[primaryTask.energy] : ENERGY_ICONS.quick
  const EnergyIcon = energy?.icon || Zap

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Block Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/30 bg-gray-800/30">
        <Clock size={14} className="text-gray-500" />
        <span className="text-sm text-gray-400">{block.time}</span>
        <span className="text-xs text-gray-600">—</span>
        <span className="text-xs font-medium text-green-400">{block.label}</span>
      </div>

      {/* Primary Task */}
      {primaryTask ? (
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            <button
              onClick={() => onComplete(primaryTask)}
              disabled={completing === primaryTask.id}
              className={`mt-1 w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center ${
                completing === primaryTask.id
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-500 hover:border-green-500 hover:bg-green-500/20'
              }`}
            >
              {completing === primaryTask.id && <CheckCircle size={14} className="text-white" />}
            </button>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-white leading-snug">
                    {primaryTask.text}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500">
                    {primaryTask.projectName && (
                      <span>{primaryTask.projectName}</span>
                    )}
                    {area && (
                      <>
                        <span className="text-gray-700">·</span>
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: area.color }}
                          />
                          {area.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Start Focus Button */}
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0">
                  <Play size={14} />
                  Start Focus
                </button>
              </div>

              {/* Energy & metadata */}
              <div className="flex items-center gap-3 mt-3">
                <span className={`flex items-center gap-1.5 text-xs ${energy.color}`}>
                  <EnergyIcon size={12} />
                  {energy.label}
                </span>
                {primaryTask.deadline && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                    Due today
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Next tasks preview */}
          {(block.tasks?.length > 1 || nextTasks.length > 0) && (
            <div className="mt-4 pt-3 border-t border-gray-700/30">
              <p className="text-xs text-gray-500 mb-2">Next up:</p>
              <div className="flex flex-wrap gap-2">
                {block.tasks?.slice(1).concat(nextTasks).slice(0, 3).map((task, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-400"
                  >
                    {task.text.length > 30 ? task.text.slice(0, 30) + '...' : task.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-gray-500">
          <Sparkles size={24} className="mx-auto mb-2 text-gray-600" />
          <p>No tasks scheduled for this block</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// MEETING BLOCK
// ============================================
function MeetingBlock({ block }) {
  const event = block.event
  const area = event?.fullCircleArea ? LIFE_AREAS[event.fullCircleArea] : null

  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
      {/* Block Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/30">
        <Calendar size={14} className="text-blue-400" />
        <span className="text-sm text-gray-400">{block.time}</span>
        <span className="text-xs text-gray-600">—</span>
        <span className="text-xs font-medium text-blue-400">{block.label}</span>
        {block.duration && (
          <span className="text-xs text-gray-600">({block.duration})</span>
        )}
      </div>

      {/* Event Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {area && (
            <span
              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: area.color }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium">{event?.title || 'Meeting'}</h3>
            {event?.attendees && event.attendees.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {event.attendees.join(', ')}
              </p>
            )}
            {event?.location && (
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                <MapPin size={10} />
                {event.location}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// WRAP UP BLOCK
// ============================================
function WrapUpBlock({ block }) {
  const tasks = block.tasks || []

  return (
    <div className="bg-gray-800/20 rounded-xl border border-gray-700/20 overflow-hidden">
      {/* Block Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/20">
        <Zap size={14} className="text-yellow-400" />
        <span className="text-sm text-gray-400">{block.time}</span>
        <span className="text-xs text-gray-600">—</span>
        <span className="text-xs font-medium text-yellow-400">{block.label}</span>
      </div>

      {/* Quick tasks */}
      <div className="p-3">
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
                <span className="truncate">{task.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-2">
            Quick tasks if time permits
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// TRIAGE CAROUSEL
// ============================================
function TriageCarousel({
  tasks,
  currentIndex,
  currentTask,
  onNext,
  onPrev,
  onComplete,
  onSendToday,
  onSchedule,
  onSomeday
}) {
  if (!currentTask) return null

  const area = LIFE_AREAS[currentTask.fullCircleArea] || LIFE_AREAS.career
  const cleanText = (text) => {
    return text
      .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
      .replace(/—/g, '-')
      .replace(/·/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const displayText = cleanText(currentTask.text)
  const sourceFile = currentTask.filePath?.split('/').pop()?.replace('.md', '') || 'Vault'

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">📥</span>
          <span className="font-medium text-white">Triage</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
            {tasks.length}
          </span>
        </div>
        <button className="text-xs text-gray-500 hover:text-white transition-colors">
          Skip All →
        </button>
      </div>

      {/* Task Card */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <span
            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: area.color }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium leading-snug">{displayText}</h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
              <span>📁 {sourceFile}</span>
              <span className="text-gray-700">·</span>
              <span style={{ color: area.color }}>{area.name}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onComplete(currentTask)}
            className="flex-1 py-2.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={14} />
            Done
          </button>
          <button
            onClick={() => onSendToday(currentTask)}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Send size={14} />
            Today
          </button>
          <button
            onClick={() => onSchedule(currentTask)}
            className="flex-1 py-2.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <CalendarDays size={14} />
            Later...
          </button>
          <button
            onClick={() => onSomeday(currentTask)}
            className="py-2.5 px-3 rounded-lg bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300 text-sm transition-colors"
            title="Someday"
          >
            <Archive size={14} />
          </button>
        </div>
      </div>

      {/* Carousel Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/30 bg-gray-800/30">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5">
          {tasks.slice(0, 10).map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-gray-600'
              }`}
            />
          ))}
          {tasks.length > 10 && (
            <span className="text-xs text-gray-600 ml-1">+{tasks.length - 10}</span>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={currentIndex >= tasks.length - 1}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

// ============================================
// SCHEDULE MODAL
// ============================================
function ScheduleModal({ task, projects, onSend, onCancel }) {
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

// ============================================
// HELPERS
// ============================================
function formatTime(timeStr) {
  if (!timeStr || timeStr === 'All day') return timeStr
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour12}:${m?.toString().padStart(2, '0') || '00'} ${period}`
}
