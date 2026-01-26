import { useState, useRef, useEffect, forwardRef } from 'react'
import { Star, Send, X, Loader2, Terminal, GripVertical } from 'lucide-react'

export default function TheStar({ isOpen, onToggle, width, onWidthChange }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your KJ360 assistant. Type a message or try a slash command like /help, /now, or /inbox"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const sidebarRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle resize
  useEffect(() => {
    function handleMouseMove(e) {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      // Clamp between 300 and 800
      onWidthChange(Math.max(300, Math.min(800, newWidth)))
    }

    function handleMouseUp() {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onWidthChange])

  // Run agents and poll for completion
  async function runAgentsAndPoll(agents) {
    try {
      const startRes = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents })
      })

      if (!startRes.ok) {
        const errorText = await startRes.text()
        throw new Error(`Server error: ${errorText}`)
      }

      const startData = await startRes.json()
      const jobId = startData.jobId

      if (!jobId) {
        throw new Error('No jobId returned from server')
      }

      // Poll for completion
      let attempts = 0
      const maxAttempts = 30

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000))

        const statusRes = await fetch(`/api/agents/status/${jobId}`)

        if (!statusRes.ok) {
          attempts++
          continue
        }

        const jobText = await statusRes.text()
        if (!jobText) {
          attempts++
          continue
        }

        let job
        try {
          job = JSON.parse(jobText)
        } catch {
          attempts++
          continue
        }

        if (job.status === 'complete') {
          const resultLines = []

          for (const [agent, result] of Object.entries(job.results || {})) {
            if (agent === 'tasks' && result.total > 0) {
              resultLines.push(`📋 Tasks: ${result.overdue?.length || 0} overdue, ${result.dueToday?.length || 0} today, ${result.undatedBuffer?.length || 0} buffer`)
            } else if (agent === 'calendar') {
              resultLines.push(`📅 Calendar: ${result.count || 0} events today`)
            } else if (agent === 'things-sync') {
              resultLines.push(`✅ Things 3: ${result.todayCount || 0} today, ${result.inboxCount || 0} in inbox`)
            } else if (agent === 'inbox-scanner') {
              resultLines.push(`📥 Inbox: ${result.count || 0} items (${result.staleCount || 0} stale)`)
            } else if (agent === 'nurture-checker') {
              resultLines.push(`💛 Relationships: ${result.needingAttention || 0} need attention`)
            }
          }

          for (const [agent, error] of Object.entries(job.errors || {})) {
            resultLines.push(`⚠️ ${agent}: ${error}`)
          }

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: resultLines.length > 0
              ? `✓ Agents complete:\n${resultLines.join('\n')}`
              : '✓ Agents complete (no data yet)',
            type: 'agent_result'
          }])
          return
        }

        attempts++
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⏱️ Agents still running... Check back in a moment.',
        type: 'warning'
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Agent error: ${err.message}`,
        type: 'error'
      }])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || data.error || 'Something went wrong',
        type: data.type
      }])

      if (data.action === 'run_agents' && data.agents) {
        await runAgentsAndPoll(data.agents)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
        type: 'error'
      }])
    } finally {
      setLoading(false)
    }
  }

  const slashCommands = [
    { cmd: '/now', desc: 'View tasks' },
    { cmd: '/inbox', desc: 'Quick capture' },
    { cmd: '/dashboard', desc: 'Generate briefing' },
    { cmd: '/sync', desc: 'Sync Things 3' },
    { cmd: '/help', desc: 'Show commands' },
  ]

  const showSuggestions = input.startsWith('/') && input.length < 10

  if (!isOpen) return null

  return (
    <>
      {/* Mobile: Full screen overlay */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Star className="text-kj-primary" size={20} fill="currentColor" />
            <span className="font-semibold text-white">The Star</span>
          </div>
          <button onClick={onToggle} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <CommandSuggestions
            commands={slashCommands}
            input={input}
            onSelect={cmd => setInput(cmd + ' ')}
          />
        )}

        {/* Input */}
        <ChatInput
          ref={inputRef}
          input={input}
          setInput={setInput}
          loading={loading}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Desktop: Resizable sidebar */}
      <aside
        ref={sidebarRef}
        className="hidden md:flex flex-col bg-gray-900 border-l border-gray-800 relative"
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-kj-primary/50 transition-colors group"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={12} className="text-gray-500" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Star className="text-kj-primary" size={20} fill="currentColor" />
            <span className="font-semibold text-white">The Star</span>
          </div>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800"
            title="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <CommandSuggestions
            commands={slashCommands}
            input={input}
            onSelect={cmd => setInput(cmd + ' ')}
          />
        )}

        {/* Input */}
        <ChatInput
          ref={inputRef}
          input={input}
          setInput={setInput}
          loading={loading}
          onSubmit={handleSubmit}
        />
      </aside>
    </>
  )
}

// Message bubble component
function MessageBubble({ msg }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
          msg.role === 'user'
            ? 'bg-kj-primary text-white'
            : msg.type === 'error'
            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
            : 'bg-gray-800 text-gray-200'
        }`}
      >
        {msg.type === 'slash_command' && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <Terminal size={12} />
            Command: {msg.content.split('\n')[0]}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
      </div>
    </div>
  )
}

// Loading indicator
function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// Command suggestions
function CommandSuggestions({ commands, input, onSelect }) {
  const filtered = commands.filter(s => s.cmd.startsWith(input))
  if (filtered.length === 0) return null

  return (
    <div className="px-4 py-2 border-t border-gray-800 flex gap-2 overflow-x-auto">
      {filtered.map(s => (
        <button
          key={s.cmd}
          onClick={() => onSelect(s.cmd)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 whitespace-nowrap"
        >
          <span className="text-kj-primary font-mono">{s.cmd}</span>
          <span className="text-gray-500">{s.desc}</span>
        </button>
      ))}
    </div>
  )
}

// Chat input - using forwardRef
const ChatInput = forwardRef(function ChatInput({ input, setInput, loading, onSubmit }, ref) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-gray-800">
      <div className="flex gap-2">
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message or /command..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-kj-primary text-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-kj-primary hover:bg-kj-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </form>
  )
})
