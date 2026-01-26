import React, { useState, useEffect, useRef } from 'react';
import { useClaudeAgent, useSkillList } from '../hooks/useClaudeAgent';
import MarkdownRenderer from './MarkdownRenderer';
import {
  Star, X, Loader2, Send, RefreshCw, MessageSquare,
  Sparkles, Target, Inbox, Sun, Calendar, Trash2,
  ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

/**
 * SkillLauncher - Claude Agent Interface Component
 *
 * Provides real-time streaming interaction with Claude using
 * Server-Sent Events. Features:
 *
 * - Real-time streaming responses
 * - Session persistence for multi-turn conversations
 * - Quick skill buttons for common tasks
 * - Chat mode for general conversations
 * - Quick capture input
 */
export default function SkillLauncher({ isOpen, onToggle, onSkillResult }) {
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

  const [mode, setMode] = useState('skills'); // 'skills' | 'chat'
  const [chatInput, setChatInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Skill definitions with icons
  const skillConfig = {
    'morning-brief': {
      icon: Sun,
      label: 'Morning Brief',
      description: 'Tactical daily brief',
      color: 'amber'
    },
    'weekly-review': {
      icon: Calendar,
      label: 'Weekly Review',
      description: 'Reflective analysis',
      color: 'purple'
    },
    'now': {
      icon: Target,
      label: 'Focus Now',
      description: 'What to work on',
      color: 'blue'
    },
    'capture': {
      icon: Sparkles,
      label: 'Capture',
      description: 'Quick thought',
      color: 'green'
    },
    'triage': {
      icon: Inbox,
      label: 'Triage',
      description: 'Process inbox',
      color: 'orange'
    },
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText]);

  // Handle skill invocation
  async function handleInvokeSkill(skillName) {
    try {
      const result = await invoke(skillName, `Run the ${skillName} skill`);
      if (result && onSkillResult) {
        onSkillResult(skillName, result);
      }
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

  // Handle quick capture
  async function handleCapture(e) {
    e.preventDefault();
    const input = e.target.elements.capture;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    try {
      await invoke('capture', text);
    } catch (err) {
      console.error('Capture error:', err);
    }
  }

  // Collapsed state - floating button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500
                   rounded-full shadow-lg flex items-center justify-center
                   hover:scale-110 transition-transform z-50 group"
        title="Open Claude Agent"
      >
        <Star className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
        {hasSession && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[80vh] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-white">Claude Agent</span>
            {sessionId && (
              <span className="ml-2 text-xs text-green-400">● Connected</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasSession && (
            <button
              onClick={clearSession}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Clear session"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setMode('skills')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === 'skills'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Skills
        </button>
        <button
          onClick={() => setMode('chat')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === 'chat'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Chat
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {mode === 'skills' ? (
          /* Skills Mode */
          <div className="p-3 space-y-2 overflow-y-auto">
            {Object.entries(skillConfig).map(([skillId, config]) => {
              const Icon = config.icon;
              const isRunning = isLoading && messages[messages.length - 1]?.skillName === skillId;

              return (
                <button
                  key={skillId}
                  onClick={() => handleInvokeSkill(skillId)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg
                             bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors text-left group`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-${config.color}-500/20 flex items-center justify-center`}>
                    {isRunning ? (
                      <Loader2 className={`w-5 h-5 text-${config.color}-400 animate-spin`} />
                    ) : (
                      <Icon className={`w-5 h-5 text-${config.color}-400`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{config.label}</div>
                    <div className="text-xs text-gray-500">{config.description}</div>
                  </div>
                </button>
              );
            })}

            {/* Quick Capture */}
            <form onSubmit={handleCapture} className="mt-4">
              <div className="relative">
                <input
                  name="capture"
                  type="text"
                  placeholder="Quick capture... (Enter to save)"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
                           text-white placeholder-gray-500 text-sm
                           focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30
                           disabled:opacity-50"
                />
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </form>
          </div>
        ) : (
          /* Chat Mode */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && !streamingText && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Start a conversation with Claude</p>
                  <p className="text-xs mt-1">Context is preserved across messages</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-amber-500/20 text-amber-100'
                        : 'bg-gray-800 text-gray-200'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} className="text-sm" />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}

              {/* Streaming Response */}
              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg px-3 py-2 bg-gray-800 text-gray-200">
                    <MarkdownRenderer content={streamingText} className="text-sm" />
                    <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && !streamingText && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Claude anything..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                           text-white placeholder-gray-500 text-sm
                           focus:outline-none focus:border-amber-500
                           disabled:opacity-50"
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={cancel}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                  >
                    <X size={18} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-3 py-2 bg-amber-500 text-white rounded-lg
                             hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 border-t border-gray-700 bg-red-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 bg-gray-800/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            {hasSession ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Session active
              </>
            ) : (
              'No active session'
            )}
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigator.clipboard.writeText('cd ~/Documents/KJ360 && claude');
              alert('Command copied! Open terminal and paste.');
            }}
            className="text-gray-400 hover:text-amber-400 flex items-center gap-1"
          >
            💻 Open Claude Code
          </a>
        </div>
      </div>
    </div>
  );
}
