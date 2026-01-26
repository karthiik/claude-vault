import React, { useState, useEffect, useRef } from 'react'
import {
  CheckCircle, Star, FileText, Flag, Calendar, AlertCircle, Clock,
  Zap, Palette, Brain, X, ChevronRight, ChevronLeft, Send, ArrowRight,
  Inbox, FolderOpen, Tag, Loader2, RefreshCw, Layers, BookOpen
} from 'lucide-react'
import { getAreaFromThingsArea } from '../constants/areas'
import { AreaDot } from '../components/AreaBadge'
import { useSkillStatus, useThingsData } from '../hooks/useSkillStatus'
import ErrorBoundary from '../components/ErrorBoundary'

export default function NowView() {
  const [activeTab, setActiveTab] = useState('things3')

  // Use custom hooks with deduplication (shared cache with Dashboard)
  const { thingsData: cachedThingsData, loading: statusLoading } = useSkillStatus({
    autoRefresh: false
  })

  const {
    data: freshThingsData,
    loading: thingsLoading,
    refresh: refreshThings
  } = useThingsData()

  // Use fresh data if available, otherwise use cached data
  const thingsData = freshThingsData || cachedThingsData

  const [vaultTasks, setVaultTasks] = useState([])
  const [vaultLoading, setVaultLoading] = useState(true)
  const [vaultLastScan, setVaultLastScan] = useState(null)
  const [vaultFromCache, setVaultFromCache] = useState(false)

  const [thingsProjects, setThingsProjects] = useState([])

  // Fetch vault data on mount (Things data handled by hooks)
  useEffect(() => {
    // Load vault cache (GET = cached, doesn't force scan)
    fetch('/api/tasks/scan-vault')
      .then(res => res.json())
      .then(data => {
        setVaultTasks(data.tasks || [])
        setVaultLastScan(data.scannedAt)
        setVaultFromCache(data.fromCache || false)
        setVaultLoading(false)

        // Auto-scan if no cache exists (first visit UX improvement)
        if (data.needsScan) {
          fetch('/api/tasks/scan-vault', { method: 'POST' })
            .then(res => res.json())
            .then(scanData => {
              setVaultTasks(scanData.tasks || [])
              setVaultLastScan(scanData.scannedAt)
              setVaultFromCache(false)
            })
        }
      })
      .catch(err => {
        console.error('Failed to load vault:', err)
        setVaultLoading(false)
      })

    // Load Things 3 projects for triage dropdown
    fetch('/api/tasks/things-projects')
      .then(res => res.json())
      .then(data => setThingsProjects(data.grouped || []))
      .catch(err => console.error('Failed to fetch Things projects:', err))
  }, [])

  // Calculate counts for tab badges
  const thingsTodayCount = thingsData?.days?.[0]?.tasks?.length || 0
  const vaultCount = vaultTasks.length

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Now</h1>
        <p className="text-gray-400">Your tasks from Things 3 and vault</p>
      </div>

      {/* Main Tab Switcher with Counts */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-800/50 rounded-xl">
        <button
          onClick={() => setActiveTab('things3')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'things3'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Star size={18} />
          Things 3
          {thingsTodayCount > 0 && (
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'things3' ? 'bg-white/20' : 'bg-blue-500/30 text-blue-400'
            }`}>
              {thingsTodayCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'vault'
              ? 'bg-kj-primary text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <BookOpen size={18} />
          Vault Triage
          {vaultCount > 0 && (
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'vault' ? 'bg-white/20' : 'bg-kj-primary/30 text-kj-primary'
            }`}>
              {vaultCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content - pass lifted state */}
      {activeTab === 'things3' ? (
        <ErrorBoundary compact fallbackMessage="Failed to load Things 3 tasks">
          <Things3Tab
            data={thingsData}
            loading={thingsLoading || statusLoading}
            onRefresh={refreshThings}
          />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary compact fallbackMessage="Failed to load Vault tasks">
          <VaultTab
            tasks={vaultTasks}
            setTasks={setVaultTasks}
            loading={vaultLoading}
            setLoading={setVaultLoading}
            lastScan={vaultLastScan}
            setLastScan={setVaultLastScan}
            fromCache={vaultFromCache}
            setFromCache={setVaultFromCache}
            thingsProjects={thingsProjects}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}

// ============================================
// Things 3 Tab - 7-day calendar scroll
// ============================================
function Things3Tab({ data, loading, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [completing, setCompleting] = useState(null)
  const [localData, setLocalData] = useState(null) // For optimistic updates
  const scrollContainerRef = useRef(null)

  // Use local data for optimistic updates, fall back to prop data
  const displayData = localData || data

  async function fetchUpcoming() {
    setRefreshing(true)
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
        const res = await fetch('/api/tasks/things-upcoming?refresh=true')
        const result = await res.json()
        setLocalData(result)
      }
    } catch (err) {
      console.error('Failed to fetch Things 3 upcoming:', err)
    } finally {
      setRefreshing(false)
    }
  }

  async function completeTask(task) {
    setCompleting(task.id)
    try {
      await fetch('/api/tasks/complete-things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: task.text, uuid: task.thingsUuid })
      })
      // Optimistic update
      const currentData = displayData || data
      setLocalData(prev => {
        const base = prev || currentData
        return {
          ...base,
          days: base.days.map(day => ({
            ...day,
            tasks: day.tasks.filter(t => t.id !== task.id)
          })),
          totalTasks: (base.totalTasks || 0) - 1
        }
      })
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
    setCompleting(null)
  }

  if (loading) {
    return (
      <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading Things 3...</span>
        </div>
      </div>
    )
  }

  const days = displayData?.days || []
  const selectedDay = days[selectedDayIndex]

  return (
    <div className="space-y-4">
      {/* Day Selector - Swipeable with fade edges */}
      <div className="relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900 to-transparent z-10 pointer-events-none" />
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-2 py-1 scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {days.map((day, idx) => (
            <button
              key={day.date}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl transition-all scroll-snap-align-start ${
                idx === selectedDayIndex
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : day.tasks.length > 0
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-gray-800/50 text-gray-500 hover:bg-gray-800'
              }`}
              style={{ scrollSnapAlign: 'start' }}
            >
              <span className="text-xs font-medium opacity-70">
                {day.isToday ? 'Today' : day.isTomorrow ? 'Tomorrow' : day.dayShort}
              </span>
              <span className="text-lg font-bold">{new Date(day.date + 'T12:00:00').getDate()}</span>
              {day.tasks.length > 0 && (
                <span className={`text-xs mt-1 px-1.5 py-0.5 rounded-full ${
                  idx === selectedDayIndex ? 'bg-white/20' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {day.tasks.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh Button + Cache Status */}
      <div className="flex items-center justify-between">
        {data?.fromCache && (
          <span className="text-xs text-gray-500">
            {displayData?.cacheAge ? `Cached ${Math.round(displayData.cacheAge / 1000)}s ago` : 'From cache'}
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => fetchUpcoming(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Selected Day Tasks */}
      <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 min-h-[300px]">
        {selectedDay && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700/50">
              <Calendar size={18} className="text-blue-400" />
              <span className="font-semibold text-white">
                {selectedDay.isToday ? 'Today' : selectedDay.isTomorrow ? 'Tomorrow' : selectedDay.dayName}
              </span>
              <span className="text-gray-500">{selectedDay.monthDay}</span>
              <span className="ml-auto text-sm text-gray-500">
                {selectedDay.tasks.length} task{selectedDay.tasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {selectedDay.tasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <CheckCircle size={32} className="text-gray-600" />
                </div>
                <p className="text-gray-500">No tasks scheduled for this day</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDay.tasks.map(task => (
                  <Things3TaskRow
                    key={task.id}
                    task={task}
                    onComplete={() => completeTask(task)}
                    isCompleting={completing === task.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Star size={14} className="text-blue-400" />
          {data?.totalTasks || 0} total this week
        </span>
        {data?.fetchedAt && (
          <span>
            Updated {displayData?.fetchedAt ? new Date(displayData.fetchedAt).toLocaleTimeString() : 'Just now'}
          </span>
        )}
      </div>
    </div>
  )
}

function Things3TaskRow({ task, onComplete, isCompleting }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition-colors ${
      task.isOverdue ? 'border-l-2 border-red-500' : ''
    }`}>
      <button
        onClick={onComplete}
        disabled={isCompleting}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
          task.isOverdue
            ? 'border-red-400 hover:bg-red-400/20'
            : 'border-gray-500 hover:border-blue-400 hover:bg-blue-400/20'
        }`}
      >
        {isCompleting && <div className="w-2 h-2 m-auto rounded-full bg-blue-400" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[15px] ${task.isOverdue ? 'text-red-300' : 'text-white'}`}>
            {task.text}
          </span>
          {task.deadline && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">
              <Flag size={10} />
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <AreaDot thingsArea={task.areaName} projectName={task.projectName} size="sm" />
          <span className="text-xs text-gray-500">{task.projectName}</span>
          {task.tags?.map((tag, i) => (
            <EnergyTag key={i} tag={tag} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Vault Tab - Triageable tasks
// ============================================
function VaultTab({ tasks, setTasks, loading, setLoading, lastScan, setLastScan, fromCache, setFromCache, thingsProjects }) {
  const [scanning, setScanning] = useState(false)
  const [cacheAge, setCacheAge] = useState(null)
  const [triageTask, setTriageTask] = useState(null)
  const [filter, setFilter] = useState('all')

  async function scanVault() {
    setScanning(true)
    try {
      const res = await fetch('/api/tasks/scan-vault', { method: 'POST' })
      const data = await res.json()
      setTasks(data.tasks || [])
      setLastScan(data.scannedAt)
      setFromCache(false)
      setCacheAge(null)
    } catch (err) {
      console.error('Failed to scan vault:', err)
    } finally {
      setScanning(false)
    }
  }

  function handleTriaged(task) {
    setTasks(prev => prev.filter(t => t.id !== task.id))
    setTriageTask(null)
  }

  function handleComplete(task) {
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.sourceType === filter)

  const sourceFilters = [
    { key: 'all', label: 'All', icon: Layers },
    { key: 'daily', label: 'Daily Notes', icon: Calendar },
    { key: 'project', label: 'Projects', icon: FolderOpen },
    { key: 'carrier_goal', label: 'Carrier Goal', icon: Star },
  ]

  // Group by source
  const groupedTasks = {}
  filteredTasks.forEach(task => {
    const key = task.sourceName || 'Other'
    if (!groupedTasks[key]) {
      groupedTasks[key] = { name: key, sourceType: task.sourceType, tasks: [] }
    }
    groupedTasks[key].tasks.push(task)
  })

  return (
    <div className="space-y-4">
      {/* Filter + Scan Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {sourceFilters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === key
                  ? 'bg-kj-primary text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {fromCache && lastScan && (
            <span className="text-xs text-gray-500">
              Cached
            </span>
          )}
          <button
            onClick={scanVault}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-kj-primary hover:bg-kj-primary/80 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {scanning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Scan Vault
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 min-h-[300px]">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 size={32} className="mx-auto mb-4 text-kj-primary animate-spin" />
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : scanning ? (
          <div className="py-16 text-center">
            <Loader2 size={32} className="mx-auto mb-4 text-kj-primary animate-spin" />
            <p className="text-gray-400">Scanning vault files...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={36} className="text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
            <p className="text-gray-500">
              No open tasks in your vault to triage
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <Inbox size={18} className="text-kj-primary" />
                <span className="font-semibold text-white">Triage Queue</span>
                <span className="text-gray-500">({filteredTasks.length})</span>
              </div>
              {lastScan && (
                <span className="text-xs text-gray-500">
                  Scanned {new Date(lastScan).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Grouped Tasks */}
            {Object.values(groupedTasks).map(group => (
              <div key={group.name} className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {group.sourceType === 'daily' && <Calendar size={14} className="text-amber-400" />}
                  {group.sourceType === 'project' && <FolderOpen size={14} className="text-blue-400" />}
                  {group.sourceType === 'carrier_goal' && <Star size={14} className="text-purple-400" />}
                  <span className="font-medium text-gray-300">{group.name}</span>
                  <span className="text-gray-600">({group.tasks.length})</span>
                </div>

                {group.tasks.map(task => (
                  <VaultTaskRow
                    key={task.id}
                    task={task}
                    onTriage={() => setTriageTask(task)}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Triage Modal */}
      {triageTask && (
        <TriageModal
          task={triageTask}
          projects={thingsProjects}
          onClose={() => setTriageTask(null)}
          onSent={handleTriaged}
        />
      )}
    </div>
  )
}

function VaultTaskRow({ task, onTriage, onComplete }) {
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleComplete() {
    setCompleting(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: task.filePath,
          lineNumber: task.lineNumber
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to complete task')
      }

      onComplete(task)
    } catch (err) {
      console.error('Failed to complete task:', err)
      setError(err.message)
      setCompleting(false)
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 ml-4 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition-colors border-l-2 border-gray-700">
      <button
        onClick={handleComplete}
        disabled={completing}
        className="mt-0.5 w-5 h-5 rounded-full border-2 border-dashed border-gray-600 flex-shrink-0 hover:border-green-500 hover:bg-green-500/20 transition-colors"
        title="Mark as complete"
      >
        {completing && <div className="w-2 h-2 m-auto rounded-full bg-green-400" />}
      </button>

      <div className="flex-1 min-w-0">
        <span className="text-[15px] text-white">{task.text}</span>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.deadline && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              <Calendar size={10} />
              {task.deadline}
            </span>
          )}
          {task.tags?.map((tag, i) => (
            <EnergyTag key={i} tag={tag} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {error && (
          <span className="text-xs text-red-400 mr-2">{error}</span>
        )}
        <button
          onClick={handleComplete}
          disabled={completing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
        >
          <CheckCircle size={14} />
          Done
        </button>
        <button
          onClick={onTriage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-kj-primary/20 text-kj-primary hover:bg-kj-primary/30 transition-colors"
        >
          <Send size={14} />
          Triage
        </button>
      </div>
    </div>
  )
}

// ============================================
// Shared Components
// ============================================

function EnergyTag({ tag }) {
  const tagLower = tag.toLowerCase()

  if (tagLower.includes('quick')) {
    return (
      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
        <Zap size={10} />
        quick
      </span>
    )
  }
  if (tagLower.includes('creative')) {
    return (
      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
        <Palette size={10} />
        creative
      </span>
    )
  }
  if (tagLower.includes('deep')) {
    return (
      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
        <Brain size={10} />
        deep
      </span>
    )
  }
  return null
}

function TriageModal({ task, projects, onClose, onSent }) {
  const [title, setTitle] = useState(task.text || '')
  const [selectedProject, setSelectedProject] = useState('')
  const [tags, setTags] = useState('')
  const [deadline, setDeadline] = useState(task.deadline || '')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (task.filePath) {
      const fileName = task.filePath.split('/').pop()
      setNotes(`From vault: ${fileName}`)
    }
  }, [task.filePath])

  async function handleSend() {
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/tasks/send-to-things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          project: selectedProject || null,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          deadline: deadline || null,
          notes: notes.trim() || null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send to Things 3')
      }

      if (task.filePath && task.lineNumber !== undefined) {
        await fetch('/api/tasks/mark-triaged', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: task.filePath,
            lineNumber: task.lineNumber
          })
        })
      }

      onSent(task)
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-kj-primary/20 flex items-center justify-center">
              <Inbox size={18} className="text-kj-primary" />
            </div>
            <h3 className="font-semibold text-white">Send to Things 3</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-kj-primary"
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              <FolderOpen size={14} className="inline mr-1" />
              Project (optional)
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kj-primary cursor-pointer"
            >
              <option value="">Inbox (no project)</option>
              {Array.isArray(projects) && projects.map(group => {
                const area = getAreaFromThingsArea(group.area)
                const areaEmoji = area?.emoji || '📁'
                return group?.projects?.length > 0 && (
                  <optgroup key={group.area || 'no-area'} label={`${areaEmoji} ${group.area || 'No Area'}`}>
                    {group.projects.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              <Tag size={14} className="inline mr-1" />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-kj-primary"
              placeholder="quick, deep, creative..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              <Calendar size={14} className="inline mr-1" />
              Deadline (optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kj-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-kj-primary resize-none"
              placeholder="Additional context..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-800 bg-gray-800/30">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!title.trim() || sending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-kj-primary hover:bg-kj-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send to Things
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDeadline(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.round((deadline - today) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays === -1) return 'yesterday'
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`
  if (diffDays < 7) return deadline.toLocaleDateString('en-US', { weekday: 'short' })
  return deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
