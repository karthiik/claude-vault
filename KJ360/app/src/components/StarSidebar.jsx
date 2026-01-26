import { useState, useEffect, useRef, useCallback } from 'react';
import { useClaudeAgent, useSkillList } from '../hooks/useClaudeAgent';
import MarkdownRenderer from './MarkdownRenderer';
import {
  Star, X, Loader2, Send, RefreshCw, MessageSquare,
  Sparkles, Target, Inbox, Sun, Calendar, Trash2,
  ChevronDown, ChevronUp, AlertCircle, GripVertical,
  Zap, Clock, FileText, Settings, PanelRightClose, PanelRight
} from 'lucide-react';

/**
 * StarSidebar - Claudian-style Sliding Panel
 *
 * A full-height sidebar that slides in from the right edge.
 * Features:
 * - Resizable width (drag handle)
 * - Persistent across navigation
 * - Real-time streaming responses
 * - Session management
 * - Skill quick actions + freeform chat
 */
export default function StarSidebar({ isOpen, onToggle, width, onWidthChange }) {
  const {
    invoke,
    chat,
    cancel,
    clearSession,
    messages,
    streamingText,
    isLoading,
    sessionId,
    error,
    clearError,
    hasSession
  } = useClaudeAgent();

  const { skills } = useSkillList();

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'skills' | 'history'
  const [chatInput, setChatInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Skill definitions with icons and colors
  const skillConfig = {
    'morning-brief': {
      icon: Sun,
      label: 'Morning Brief',
      description: 'Tactical daily brief with calendar, tasks, and focus',
      color: 'amber',
      shortcut: '⌘M'
    },
    'weekly-review': {
      icon: Calendar,
      label: 'Weekly Review',
      description: 'Reflective analysis of patterns and balance',
      color: 'purple',
      shortcut: '⌘W'
    },
    'now': {
      icon: Target,
      label: 'Focus Now',
      description: 'What to work on based on time and energy',
      color: 'blue',
      shortcut: '⌘N'
    },
    'capture': {
      icon: Sparkles,
      label: 'Quick Capture',
      description: 'Capture a thought, task, or idea',
      color: 'green',
      shortcut: '⌘K'
    },
    'triage': {
      icon: Inbox,
      label: 'Triage Inbox',
      description: 'Process inbox items and uncategorized tasks',
      color: 'orange',
      shortcut: '⌘T'
    },
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle resize drag
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(320, Math.min(800, newWidth));
      onWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  // Handle skill invocation
  async function handleInvokeSkill(skillName) {
    setActiveTab('chat'); // Switch to chat to see the response
    try {
      await invoke(skillName, `Run the ${skillName} skill`);
    } catch (err) {
      console.error('Skill invocation error:', err);
    }
  }

  // Handle chat submission
  async function handleChatSubmit(e) {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || isLoading) return;

    setChatInput('');
    try {
      await chat(message);
    } catch (err) {
      console.error('Chat error:', err);
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Only handle if sidebar is open
      if (!isOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        onToggle();
        return;
      }

      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && chatInput.trim()) {
        handleChatSubmit(e);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, chatInput, onToggle]);

  // Floating toggle button when closed
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500
                   rounded-full shadow-lg flex items-center justify-center
                   hover:scale-110 transition-all z-50 group"
        title="Open Claude Agent (⌘+Shift+K)"
      >
        <Star className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
        {hasSession && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onToggle}
      />

      {/* Sidebar Panel */}
      <aside
        ref={sidebarRef}
        style={{ width: `${width}px` }}
        className={`
          fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-700
          z-50 flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`
            absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize
            hover:bg-amber-500/50 transition-colors
            ${isResizing ? 'bg-amber-500' : 'bg-transparent'}
          `}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2
                          w-4 h-8 flex items-center justify-center opacity-0 hover:opacity-100">
            <GripVertical size={12} className="text-gray-500" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Claude Agent</h2>
              <div className="flex items-center gap-2">
                {sessionId ? (
                  <span className="text-[10px] text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Session active
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">Ready</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {hasSession && (
              <button
                onClick={clearSession}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Clear session"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onToggle}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Close sidebar (Esc)"
            >
              <PanelRightClose size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 bg-gray-800/30">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'skills', label: 'Skills', icon: Zap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' ? (
            /* Chat Mode */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamingText && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Start a conversation</p>
                    <p className="text-gray-600 text-xs mt-1">
                      Ask anything or use a skill from the Skills tab
                    </p>

                    {/* Quick Actions */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {Object.entries(skillConfig).slice(0, 3).map(([id, config]) => (
                        <button
                          key={id}
                          onClick={() => handleInvokeSkill(id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700
                                     text-gray-300 rounded-full transition-colors
                                     disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <config.icon size={12} />
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-amber-500/20 text-amber-100 rounded-br-md'
                          : 'bg-gray-800 text-gray-200 rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <MarkdownRenderer content={msg.content} className="text-sm leading-relaxed" />
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                      <span className="text-[10px] text-gray-500 mt-1.5 block">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Streaming Response */}
                {streamingText && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-gray-800 text-gray-200">
                      <MarkdownRenderer content={streamingText} className="text-sm leading-relaxed" />
                      <span className="inline-block w-2 h-4 bg-amber-400 rounded-sm animate-pulse ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {isLoading && !streamingText && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-400">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/30">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Claude anything..."
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl
                               text-white placeholder-gray-500 text-sm
                               focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30
                               disabled:opacity-50 pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                      ⌘↵
                    </div>
                  </div>
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={cancel}
                      className="px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-4 py-2.5 bg-amber-500 text-white rounded-xl
                               hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed
                               transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  )}
                </form>
              </div>
            </div>
          ) : (
            /* Skills Mode */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-gray-500 mb-4">
                Quick actions powered by Claude. Click to run.
              </p>

              {Object.entries(skillConfig).map(([skillId, config]) => {
                const Icon = config.icon;
                const isRunning = isLoading && messages[messages.length - 1]?.skillName === skillId;

                return (
                  <button
                    key={skillId}
                    onClick={() => handleInvokeSkill(skillId)}
                    disabled={isLoading}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl
                      bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50
                      hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all text-left group
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      bg-${config.color}-500/20 group-hover:bg-${config.color}-500/30
                      transition-colors
                    `}>
                      {isRunning ? (
                        <Loader2 className={`w-6 h-6 text-${config.color}-400 animate-spin`} />
                      ) : (
                        <Icon className={`w-6 h-6 text-${config.color}-400`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{config.label}</span>
                        <span className="text-[10px] text-gray-600 font-mono">{config.shortcut}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{config.description}</p>
                    </div>
                  </button>
                );
              })}

              {/* Quick Capture Input */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <label className="text-xs text-gray-400 mb-2 block">Quick Capture</label>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const input = e.target.elements.capture;
                  const text = input.value.trim();
                  if (!text) return;
                  input.value = '';
                  setActiveTab('chat');
                  await invoke('capture', text);
                }}>
                  <div className="relative">
                    <input
                      name="capture"
                      type="text"
                      placeholder="Capture a thought... (Enter to save)"
                      disabled={isLoading}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl
                               text-white placeholder-gray-500 text-sm
                               focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30
                               disabled:opacity-50"
                    />
                    <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500/50" />
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 border-t border-gray-700 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-400 break-words">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Clock size={12} />
              {hasSession ? 'Context preserved' : 'New session'}
            </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText('cd ~/Documents/KJ360 && claude');
                // Could show a toast here
              }}
              className="text-gray-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              Open in Terminal →
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
