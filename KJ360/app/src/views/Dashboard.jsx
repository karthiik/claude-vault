import { useState, useEffect, memo, useCallback } from 'react'
import {
  Calendar, CheckCircle2, AlertCircle, Inbox, ChevronDown, ChevronRight,
  Settings, ChevronLeft, Star, Clock, Zap, Palette, Brain, Target,
  Flag, FileText, Users, X, Check, RotateCcw, RefreshCw, Loader2,
  Mail, Bell, TrendingUp, TrendingDown, Minus, Sparkles, Archive,
  MapPin, Coffee, MessageSquare, ArrowUpRight,
  Heart, Rocket, DollarSign, GraduationCap, Home
} from 'lucide-react'
import { LIFE_AREAS, AREAS_LIST, getAreaFromThingsArea } from '../constants/areas'
import { AreaIcon, AreaDot } from '../components/AreaBadge'
import MarkdownRenderer from '../components/MarkdownRenderer'
import ErrorBoundary from '../components/ErrorBoundary'
import { useSkillStatus, useThingsData, useCalendarData } from '../hooks/useSkillStatus'

// ============================================
// MAIN DASHBOARD VIEW
// ============================================
export default function DashboardView() {
  // Use custom hooks with request deduplication
  const { thingsData, lastBrief, loading: statusLoading, refresh: refreshStatus } = useSkillStatus({
    autoRefresh: true,
    refreshInterval: 60000
  })

  const { data: freshThingsData, loading: thingsLoading, refresh: refreshThings } = useThingsData({
    autoRefresh: false
  })

  const [statusBrief, setStatusBrief] = useState(null)
  const [briefHistory, setBriefHistory] = useState([])
  const [briefLoading, setBriefLoading] = useState(false)

  // Use fresh data if available, otherwise use cached data from skill status
  const displayThingsData = freshThingsData || thingsData

  // Set brief from skill status cache
  useEffect(() => {
    if (lastBrief && !statusBrief) {
      setStatusBrief({
        brief: lastBrief.content || lastBrief,
        overview: lastBrief.content || lastBrief,
        generatedAt: lastBrief.generatedAt,
        type: lastBrief.type,
        fromCache: true
      })
    }
  }, [lastBrief, statusBrief])

  // Check for today's brief on mount, auto-generate if missing/stale
  useEffect(() => {
    async function checkAndFetchBrief() {
      try {
        // First check if today's brief exists
        const checkRes = await fetch('/api/skill/brief/today?autoGenerate=false')
        if (!checkRes.ok) return

        const checkResult = await checkRes.json()

        // If we have a valid cached brief, use it
        if (checkResult.status === 'cached' && checkResult.brief) {
          setStatusBrief({
            brief: checkResult.brief.content,
            overview: checkResult.brief.content,
            generatedAt: checkResult.brief.generatedAt,
            type: checkResult.brief.type,
            fromCache: true,
            age: checkResult.age
          })
          return
        }

        // If missing or stale, show what we have (if any) and trigger generation
        if (checkResult.brief) {
          setStatusBrief({
            brief: checkResult.brief.content,
            overview: checkResult.brief.content,
            generatedAt: checkResult.brief.generatedAt,
            type: checkResult.brief.type,
            fromCache: true,
            isStale: true
          })
        }

        // Auto-generate in background
        if (checkResult.needsGeneration || checkResult.status === 'missing' || checkResult.status === 'stale') {
          console.log('[Dashboard] Auto-generating brief...')
          setBriefLoading(true)

          try {
            const genRes = await fetch('/api/skill/brief/generate', { method: 'POST' })
            if (genRes.ok) {
              const genResult = await genRes.json()
              setStatusBrief({
                brief: genResult.result,
                overview: genResult.result,
                generatedAt: genResult.timestamp,
                type: genResult.isWeekend ? 'weekend' : 'weekday',
                fromCache: false
              })
              // Refresh status cache
              refreshStatus()
            }
          } catch (genErr) {
            console.error('Failed to auto-generate brief:', genErr)
          } finally {
            setBriefLoading(false)
          }
        }
      } catch (err) {
        console.error('Failed to check brief:', err)

        // Fallback to latest endpoint
        try {
          const res = await fetch('/api/skill/brief/latest')
          if (res.ok) {
            const result = await res.json()
            if (result.brief) {
              setStatusBrief({
                brief: result.brief.content,
                overview: result.brief.content,
                generatedAt: result.brief.generatedAt,
                type: result.brief.type,
                fromCache: true
              })
            }
          }
        } catch {}
      }
    }
    checkAndFetchBrief()
  }, [refreshStatus])

  async function generateBrief() {
    setBriefLoading(true)
    try {
      // Refresh caches in parallel with brief generation for faster Now page
      fetch('/api/skill/refresh/tasks', { method: 'POST' }).catch(() => {})
      fetch('/api/skill/refresh/calendar', { method: 'POST' }).catch(() => {})

      // Determine which skill to use based on day of week
      const isWeekend = [0, 6].includes(new Date().getDay())
      const skillName = isWeekend ? 'weekly-review' : 'morning-brief'

      const res = await fetch(`/api/skill/invoke/${skillName}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setStatusBrief({
          brief: data.result,
          overview: data.result,
          generatedAt: data.timestamp,
          type: isWeekend ? 'weekend' : 'weekday'
        })
        // Refresh skill status to update cache
        refreshStatus()
      } else {
        const errData = await res.json()
        console.error('Brief generation failed:', errData.error)
      }
    } catch (err) {
      console.error('Failed to generate brief:', err)
    } finally {
      setBriefLoading(false)
    }
  }

  async function fetchBriefForDay(dayOffset) {
    // Day 0 = today (already loaded), Day 1 = yesterday, etc.
    if (dayOffset === 0) return
  }

  // Show loading only on initial load with no cached data
  const isInitialLoading = statusLoading && !displayThingsData && !statusBrief

  if (isInitialLoading) {
    return (
      <div className="max-w-7xl mx-auto animate-pulse space-y-4 p-4">
        <div className="h-8 bg-gray-800 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-gray-800 rounded-xl" />
          <div className="h-64 bg-gray-800 rounded-xl" />
          <div className="h-48 bg-gray-800 rounded-xl" />
          <div className="h-48 bg-gray-800 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Row 1: Status Brief (full width) */}
      <ErrorBoundary compact fallbackMessage="Failed to load status brief">
        <StatusBriefWidget
          brief={statusBrief}
          briefHistory={briefHistory}
          loading={briefLoading}
          onRefresh={generateBrief}
          onNavigate={fetchBriefForDay}
        />
      </ErrorBoundary>

      {/* Row 2: Focus & Recommendations + Goal Alignment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ErrorBoundary compact fallbackMessage="Failed to load recommendations">
          <FocusRecommendationsWidget thingsData={displayThingsData} />
        </ErrorBoundary>
        <ErrorBoundary compact fallbackMessage="Failed to load goal alignment">
          <GoalAlignmentWidget brief={statusBrief} thingsData={displayThingsData} />
        </ErrorBoundary>
      </div>

      {/* Row 3: Schedule + Email */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ErrorBoundary compact fallbackMessage="Failed to load schedule">
          <ScheduleWidgetWithHook />
        </ErrorBoundary>
        <ErrorBoundary compact fallbackMessage="Failed to load email">
          <EmailWidget />
        </ErrorBoundary>
      </div>

      {/* Row 4: Relationships + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ErrorBoundary compact fallbackMessage="Failed to load relationships">
          <RelationshipsWidget />
        </ErrorBoundary>
        <ErrorBoundary compact fallbackMessage="Failed to load reminders">
          <RemindersWidget thingsData={displayThingsData} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

// ============================================
// SCHEDULE WIDGET WRAPPER - Uses custom hook for deduplication
// ============================================
const ScheduleWidgetWithHook = memo(function ScheduleWidgetWithHook() {
  const { today: calendarData, tomorrow: tomorrowData, blocks: availableBlocks, loading } = useCalendarData()

  const events = calendarData?.events || []
  const tomorrowEvents = tomorrowData?.events || []

  // Block type labels
  const blockLabels = {
    deep: 'Deep work block',
    focus: 'Focused tasks',
    quick: 'Quick tasks',
    wrap: 'Wrap-up work'
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Calendar size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Today's Schedule</h2>
            {calendarData?.dayName && (
              <p className="text-xs text-gray-500">{calendarData.dayName}</p>
            )}
          </div>
        </div>
        {calendarData?.hasConflicts && (
          <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
            Conflicts
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="py-4 text-center text-gray-500">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            Loading calendar...
          </div>
        ) : (
          <>
            {/* Available Blocks */}
            {availableBlocks?.length > 0 && (
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Available Blocks</h4>
                <div className="space-y-1">
                  {availableBlocks.map((block, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className={
                        block.type === 'deep' ? 'text-purple-400' :
                        block.type === 'focus' ? 'text-blue-400' :
                        'text-green-400'
                      } />
                      <span className="text-white">{block.start}-{block.end}:</span>
                      <span className="text-gray-400">{blockLabels[block.type] || block.type} ({block.duration})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meetings */}
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      event.isAllDay ? 'bg-purple-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{event.time}</span>
                        {event.duration && (
                          <span className="text-xs text-gray-500">({event.duration})</span>
                        )}
                      </div>
                      <p className="text-sm text-white truncate">{event.title}</p>
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin size={10} />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">No events scheduled today</p>
            )}

            {/* Tomorrow Preview */}
            <div className="pt-2 border-t border-gray-700/50">
              <h4 className="text-xs text-gray-500 mb-2">
                Tomorrow {tomorrowData?.dayName && `(${tomorrowData.dayName})`}
              </h4>
              {tomorrowEvents.length > 0 ? (
                <ul className="space-y-1">
                  {tomorrowEvents.slice(0, 4).map((event, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-gray-600">•</span>
                      <span>
                        {event.isAllDay ? event.title : `${event.time} - ${event.title}`}
                      </span>
                    </li>
                  ))}
                  {tomorrowEvents.length > 4 && (
                    <li className="text-xs text-gray-500 pl-4">
                      +{tomorrowEvents.length - 4} more events
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">No events scheduled</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
})

// ============================================
// STATUS BRIEF WIDGET (Memoized for performance)
// ============================================
const StatusBriefWidget = memo(function StatusBriefWidget({ brief, loading, onRefresh, onNavigate, briefHistory }) {
  const [expanded, setExpanded] = useState(true)
  const [currentDayOffset, setCurrentDayOffset] = useState(0) // 0 = today, 1 = yesterday, etc.

  const totalDays = 10 // Last 10 days of briefs
  const currentBrief = currentDayOffset === 0 ? brief : briefHistory?.[currentDayOffset - 1]

  const isStale = currentDayOffset === 0 && brief?.generatedAt &&
    (Date.now() - new Date(brief.generatedAt).getTime()) > 4 * 60 * 60 * 1000 // 4 hours

  // Get date label for current view
  function getDateLabel(offset) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    if (offset === 0) return 'Today'
    if (offset === 1) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function handlePrev() {
    if (currentDayOffset < totalDays - 1) {
      const newOffset = currentDayOffset + 1
      setCurrentDayOffset(newOffset)
      onNavigate?.(newOffset)
    }
  }

  function handleNext() {
    if (currentDayOffset > 0) {
      const newOffset = currentDayOffset - 1
      setCurrentDayOffset(newOffset)
      onNavigate?.(newOffset)
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <FileText size={20} className="text-gray-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">Status Brief</h2>
              {isStale && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  <AlertCircle size={10} />
                  Stale
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {currentBrief?.generatedAt
                ? new Date(currentBrief.generatedAt).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })
                : getDateLabel(currentDayOffset)
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Day Navigation - 1 of 10 means today (most recent) */}
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <button
              onClick={handleNext}
              disabled={currentDayOffset === 0}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[60px] text-center">
              {currentDayOffset + 1} of {totalDays}
            </span>
            <button
              onClick={handlePrev}
              disabled={currentDayOffset >= totalDays - 1}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-700 rounded text-gray-400"
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Full Brief Section - Rendered as Markdown */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-kj-primary" />
              <span className="text-sm font-medium text-white">Full Brief</span>
            </div>

            {currentBrief?.overview ? (
              <div className="text-sm leading-relaxed max-h-[500px] overflow-y-auto">
                <MarkdownRenderer content={currentBrief.overview} />
              </div>
            ) : currentDayOffset === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-3">No brief generated yet for today</p>
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="px-4 py-2 bg-kj-primary hover:bg-kj-primary/80 text-white rounded-lg text-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate Brief
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                No brief was generated for {getDateLabel(currentDayOffset)}
              </p>
            )}
          </div>

          {/* Refresh button when viewing today and brief exists */}
          {currentDayOffset === 0 && currentBrief?.overview && (
            <div className="flex justify-end">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Refresh Brief
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// ============================================
// FOCUS & RECOMMENDATIONS WIDGET (Memoized)
// ============================================
const FocusRecommendationsWidget = memo(function FocusRecommendationsWidget({ thingsData }) {
  const [completing, setCompleting] = useState(null)

  // Get today's tasks
  const todayTasks = thingsData?.days?.[0]?.tasks || []
  const totalTasks = thingsData?.totalTasks || 0
  const projectCount = new Set(todayTasks.map(t => t.projectName)).size

  // Sample AI recommendations (will be generated by Claude skill later)
  const recommendations = [
    {
      id: 1,
      title: 'Use morning block for quick wins',
      description: '8-10am is wide open. Quick tasks can build momentum before deep work.',
      confidence: 90,
      priority: 'high'
    },
    {
      id: 2,
      title: 'Batch similar tasks together',
      description: 'Group related tasks to reduce context switching overhead.',
      confidence: 85,
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Review pending items before EOD',
      description: 'Several tasks approaching deadline need attention.',
      confidence: 80,
      priority: 'medium'
    }
  ]

  async function completeTask(task) {
    setCompleting(task.id)
    try {
      await fetch('/api/tasks/complete-things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: task.text, uuid: task.thingsUuid })
      })
      // Would update state here in real implementation
    } catch (err) {
      console.error('Failed to complete:', err)
    }
    setCompleting(null)
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700/50">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Target size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className="font-semibold text-white">Focus & Recommendations</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Priorities Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-white">Top Priorities</span>
            <span className="text-xs text-gray-500">{totalTasks}+ tasks across {projectCount} projects</span>
          </div>

          <div className="space-y-2">
            {todayTasks.slice(0, 3).map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  completing === task.id
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-gray-900/50 border border-gray-700/30 hover:border-gray-600'
                }`}
              >
                <button
                  onClick={() => completeTask(task)}
                  disabled={completing === task.id}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center ${
                    completing === task.id
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-500 hover:border-kj-primary'
                  }`}
                >
                  {completing === task.id && <Check size={12} className="text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${completing === task.id ? 'text-gray-500 line-through' : 'text-white'}`}>
                    {task.text}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <AreaDot thingsArea={task.areaName} projectName={task.projectName} size="sm" />
                    {task.projectName && (
                      <p className="text-xs text-gray-500">{task.projectName}</p>
                    )}
                  </div>
                </div>

                {task.deadline && (
                  <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 flex-shrink-0">
                    Due Today
                  </span>
                )}
              </div>
            ))}

            {todayTasks.length === 0 && (
              <p className="text-gray-500 text-sm py-4 text-center">No priority tasks for today</p>
            )}
          </div>
        </div>

        {/* Recommendations Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-white">Recommendations</span>
          </div>

          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div
                key={rec.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/30"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{rec.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
                </div>

                <div className="flex items-center gap-1 text-xs flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded ${
                    rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-green-400 flex items-center gap-0.5">
                    <Sparkles size={10} />
                    {rec.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

// ============================================
// GOAL ALIGNMENT WIDGET - Full Circle Life Areas (Memoized)
// ============================================
const GoalAlignmentWidget = memo(function GoalAlignmentWidget({ brief, thingsData }) {
  // Calculate area distribution from Things 3 tasks
  const todayTasks = thingsData?.days?.[0]?.tasks || []
  const allTasks = thingsData?.days?.flatMap(d => d.tasks) || []

  // Count tasks per area
  const areaCounts = {}
  AREAS_LIST.forEach(area => {
    areaCounts[area.id] = 0
  })

  // Match tasks to areas based on project/area names
  allTasks.forEach(task => {
    const area = getAreaFromThingsArea(task.areaName) ||
                 getAreaFromThingsArea(task.projectName)
    if (area) {
      areaCounts[area.id]++
    }
  })

  const totalTasksWithArea = Object.values(areaCounts).reduce((a, b) => a + b, 0)

  // Build area progress data with percentages
  const areaProgress = AREAS_LIST.map(area => {
    const count = areaCounts[area.id]
    const currentPercent = totalTasksWithArea > 0
      ? Math.round((count / totalTasksWithArea) * 100)
      : 0
    // Default targets from areas.js (will be configurable later)
    const targets = {
      health: 15, relationships: 15, career: 15, finances: 10,
      learning: 10, joy: 15, home: 10, contribution: 10
    }
    const targetPercent = targets[area.id] || 12

    return {
      ...area,
      count,
      currentPercent,
      targetPercent,
      change: currentPercent - targetPercent,
      isAboveTarget: currentPercent >= targetPercent
    }
  }).sort((a, b) => b.currentPercent - a.currentPercent)

  // Sample patterns (will be AI-generated based on task distribution later)
  const generatePatterns = () => {
    const patterns = []
    const highAreas = areaProgress.filter(a => a.currentPercent > a.targetPercent)
    const lowAreas = areaProgress.filter(a => a.currentPercent < a.targetPercent && a.currentPercent > 0)
    const neglectedAreas = areaProgress.filter(a => a.currentPercent === 0)

    if (highAreas.length > 0) {
      patterns.push(`Strong focus on ${highAreas.slice(0, 2).map(a => a.shortName).join(' & ')} - above target allocation`)
    }
    if (neglectedAreas.length > 0) {
      patterns.push(`${neglectedAreas.map(a => a.shortName).join(', ')} have no active tasks - consider balance`)
    }
    if (lowAreas.length > 0) {
      patterns.push(`${lowAreas[0].shortName} is ${lowAreas[0].targetPercent - lowAreas[0].currentPercent}% below target`)
    }
    return patterns.length > 0 ? patterns : ['Analyzing task distribution patterns...']
  }

  const patterns = generatePatterns()

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700/50">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
          <Target size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="font-semibold text-white">Full Circle Balance</h2>
          <p className="text-xs text-gray-500">{totalTasksWithArea} tasks across {areaProgress.filter(a => a.count > 0).length} areas</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* AI Balance Insight */}
        {brief?.areaInsight && (
          <div className="text-sm text-gray-300 leading-relaxed pb-2 border-b border-gray-700/30">
            <p>{brief.areaInsight}</p>
          </div>
        )}

        {/* Area Progress Bars - Compact 2-column grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {areaProgress.map(area => (
            <div key={area.id} className="group">
              <div className="flex items-center gap-2 mb-1">
                <AreaIcon areaId={area.id} size="sm" />
                <span className="text-xs font-medium text-white flex-1 truncate">{area.shortName}</span>
                <span className="text-xs text-gray-400">{area.currentPercent}%</span>
                {area.change !== 0 && (
                  <span className={`flex items-center gap-0.5 text-[10px] ${
                    area.isAboveTarget ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {area.isAboveTarget ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${area.bgColor} rounded-full transition-all`}
                  style={{ width: `${Math.min(area.currentPercent, 100)}%` }}
                />
                {/* Target marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/30"
                  style={{ left: `${area.targetPercent}%` }}
                  title={`Target: ${area.targetPercent}%`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Patterns Detected */}
        <div className="pt-2 border-t border-gray-700/50">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Balance Insights</h4>
          <ul className="space-y-1">
            {patterns.map((pattern, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-gray-600 mt-0.5">•</span>
                {pattern}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
})

// ============================================
// EMAIL WIDGET (Placeholder, Memoized)
// ============================================
const EmailWidget = memo(function EmailWidget() {
  // Sample email data
  const stats = [
    { label: 'Urgent', count: 1, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Today', count: 6, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', active: true },
    { label: 'Upcoming', count: 13, icon: Calendar, color: 'text-gray-400', bg: 'bg-gray-700' },
    { label: 'Anytime', count: 11, icon: Inbox, color: 'text-gray-400', bg: 'bg-gray-700' }
  ]

  const timeSensitive = [
    {
      title: 'Ryan Harb - WAWP Session on Monday Dec 15 - received graphic to share',
      highlight: true
    }
  ]

  const actionNeeded = [
    'Skype A Scientist - Board meeting scheduling (fill out When2Meet) + confirm 2026 board service',
    'Travis Southard - Code for Philly hackathon planning (needs response about next steps)',
    'Marquise Richards - Spill the Beans shifting to quarterly, needs follow-up on policy involvement'
  ]

  const anytime = [
    "Follow up on Jules' idea: Office hours with Indy Hall",
    'Ask Sarah Mack for promotion channel'
  ]

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Mail size={20} className="text-purple-400" />
          </div>
          <h2 className="font-semibold text-white">Email</h2>
        </div>
        <span className="text-2xl font-bold text-white">16</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Featured Email */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/30">
          <div className="w-5 h-5 rounded-full border-2 border-gray-500 mt-0.5" />
          <div>
            <p className="text-sm text-white">Email intro: Dylan (City Works) to Jigar and Tanya (from Tanya/Jigar meeting on 2025-12...</p>
            <p className="text-xs text-amber-400 mt-1">10:00 AM</p>
          </div>
        </div>

        {/* Anytime Section */}
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Inbox size={12} />
            <span>ANYTIME</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {anytime.map((item, idx) => (
              <span key={idx} className="text-xs px-2 py-1.5 rounded bg-gray-900/50 border border-gray-700/30 text-gray-300">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center p-2 rounded-lg ${stat.bg} ${stat.active ? 'ring-1 ring-amber-500/50' : ''}`}
            >
              <stat.icon size={16} className={stat.color} />
              <span className={`text-lg font-bold ${stat.active ? 'text-amber-400' : 'text-white'}`}>{stat.count}</span>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Time Sensitive */}
        <div>
          <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Time-Sensitive</h4>
          {timeSensitive.map((item, idx) => (
            <div key={idx} className="p-2 rounded bg-red-500/10 border-l-2 border-red-500 text-sm text-gray-300">
              {item.title}
            </div>
          ))}
        </div>

        {/* Action Needed */}
        <div>
          <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Action Needed</h4>
          <div className="space-y-2">
            {actionNeeded.map((item, idx) => (
              <div key={idx} className="p-2 rounded bg-amber-500/10 border-l-2 border-amber-500 text-sm text-gray-300">
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder notice */}
        <p className="text-xs text-gray-600 text-center pt-2">
          📧 Email integration coming soon
        </p>
      </div>
    </div>
  )
})

// ============================================
// RELATIONSHIPS WIDGET (Placeholder, Memoized)
// ============================================
const RelationshipsWidget = memo(function RelationshipsWidget() {
  // Sample relationship data
  const upcomingMeetings = [
    {
      initials: 'JM',
      name: 'Jigar Mehta',
      time: '10:00am',
      lastContact: '3d ago',
      context: 'Leading BIRT tax reform initiative with De...',
      color: 'bg-orange-500',
      warming: true
    },
    {
      initials: 'WR',
      name: 'Wil Reynolds',
      time: '2:00pm',
      lastContact: '3d ago',
      context: 'Quarterly Mindmeld Mastermind...',
      color: 'bg-green-500',
      warming: true
    },
    {
      initials: 'DM',
      name: 'Dan Mall',
      time: '2:00pm',
      lastContact: '8d ago',
      context: 'Quarterly Mindmeld Mastermind...',
      color: 'bg-blue-500',
      cooling: true
    }
  ]

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Users size={20} className="text-cyan-400" />
          </div>
          <h2 className="font-semibold text-white">Relationships</h2>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
          <TrendingUp size={12} />
          64 warming
        </span>
      </div>

      <div className="p-4 space-y-4">
        <h4 className="text-xs text-gray-500 uppercase tracking-wide">Upcoming Meetings</h4>

        <div className="space-y-3">
          {upcomingMeetings.map((person, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${person.color} flex items-center justify-center text-white font-medium text-sm`}>
                {person.initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{person.name}</span>
                  {person.warming && <TrendingUp size={12} className="text-amber-400" />}
                  {person.cooling && <TrendingDown size={12} className="text-blue-400" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{person.time}</span>
                  <span>·</span>
                  <span>{person.lastContact}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{person.context}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder notice */}
        <p className="text-xs text-gray-600 text-center pt-2">
          👥 Relationship tracking coming in Phase 5
        </p>
      </div>
    </div>
  )
})

// ============================================
// REMINDERS WIDGET (Memoized)
// ============================================
const RemindersWidget = memo(function RemindersWidget({ thingsData }) {
  const days = thingsData?.days || []

  // Calculate stats from Things 3 data
  const todayTasks = days[0]?.tasks || []
  const overdueTasks = todayTasks.filter(t => t.isOverdue)
  const upcomingTasks = days.slice(1).flatMap(d => d.tasks)
  const anytimeTasks = [] // Would come from Things 3 "Anytime" list

  // Sample reminders (would come from Things 3)
  const overdueReminders = [
    {
      title: 'Prep Cameron interview for Instagram (article draft ready, need to create social content) -...',
      date: 'Dec 12'
    }
  ]

  const dueTodayReminders = [
    { title: 'Buy 6 pieces of wood (35" x 2.5")', time: '9:00 AM' },
    { title: 'Confirm availability for Dec 22 BIRT coalition Zoom (12pm and 6pm sessions) (from...', time: '9:00 AM' }
  ]

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Bell size={20} className="text-red-400" />
          </div>
          <h2 className="font-semibold text-white">Reminders</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
            {overdueTasks.length || 1} overdue
          </span>
          <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">
            {todayTasks.length || 6} today
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overdue Section */}
        {overdueReminders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
              <AlertCircle size={12} />
              <span>OVERDUE</span>
            </div>
            {overdueReminders.map((reminder, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded bg-red-500/10 border-l-2 border-red-500">
                <div className="w-4 h-4 rounded-full border-2 border-red-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">{reminder.title}</p>
                  <p className="text-xs text-red-400 mt-1">{reminder.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Due Today Section */}
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Clock size={12} />
            <span>DUE TODAY</span>
          </div>
          <div className="space-y-2">
            {dueTodayReminders.map((reminder, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded bg-gray-900/50 border-l-2 border-amber-500">
                <div className="w-4 h-4 rounded-full border-2 border-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">{reminder.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{reminder.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-700/50">
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{overdueTasks.length || 1}</div>
            <div className="text-xs text-gray-500">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{todayTasks.length || 6}</div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-400">{upcomingTasks.length || 13}</div>
            <div className="text-xs text-gray-500">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-400">{anytimeTasks.length || 11}</div>
            <div className="text-xs text-gray-500">Anytime</div>
          </div>
        </div>
      </div>
    </div>
  )
})
