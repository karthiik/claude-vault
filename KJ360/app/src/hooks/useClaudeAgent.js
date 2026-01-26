import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useClaudeAgent Hook
 *
 * React hook for interacting with Claude agent via Server-Sent Events.
 * Provides real-time streaming, session management, and context resumption.
 *
 * Features:
 * - Real-time streaming of Claude responses
 * - Session persistence for multi-turn conversations
 * - Automatic reconnection on errors
 * - Loading and error states
 *
 * Usage:
 * const { invoke, chat, messages, isLoading, sessionId, error } = useClaudeAgent();
 *
 * // Invoke a specific skill
 * await invoke('morning-brief', 'Generate my brief');
 *
 * // Chat with Claude
 * await chat('What should I focus on today?');
 */
export function useClaudeAgent() {
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Load session ID from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('kj360-agent-session');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // Save session ID to localStorage when it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('kj360-agent-session', sessionId);
    }
  }, [sessionId]);

  /**
   * Parse SSE stream from response
   */
  const parseSSEStream = useCallback(async (response, onMessage) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep last incomplete line in buffer
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onMessage(data);
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  }, []);

  /**
   * Invoke a skill with streaming
   */
  const invoke = useCallback(async (skillName, prompt) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setStreamingText('');

    // Add user message to history
    const userMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
      skillName
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/agent/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName,
          prompt,
          sessionId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let fullResponse = '';
      let capturedSessionId = sessionId;

      await parseSSEStream(response, (data) => {
        switch (data.type) {
          case 'session':
            capturedSessionId = data.sessionId;
            setSessionId(data.sessionId);
            break;

          case 'status':
            // Could display status updates in UI
            console.log('[Agent status]', data.message);
            break;

          case 'text':
            fullResponse += data.content;
            setStreamingText(fullResponse);
            break;

          case 'complete':
            // Add assistant message to history
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: data.result || fullResponse,
              timestamp: data.timestamp,
              sessionId: capturedSessionId
            }]);
            setStreamingText('');
            break;

          case 'error':
            setError(data.error);
            break;

          case 'done':
            // Stream complete
            break;
        }
      });

      return { result: fullResponse, sessionId: capturedSessionId };

    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, not an error
        return null;
      }
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, parseSSEStream]);

  /**
   * Chat with Claude (uses 'chat' skill)
   */
  const chat = useCallback(async (message) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setStreamingText('');

    // Add user message to history
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let fullResponse = '';
      let capturedSessionId = sessionId;

      await parseSSEStream(response, (data) => {
        switch (data.type) {
          case 'session':
            capturedSessionId = data.sessionId;
            setSessionId(data.sessionId);
            break;

          case 'text':
            fullResponse += data.content;
            setStreamingText(fullResponse);
            break;

          case 'complete':
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: data.result || fullResponse,
              timestamp: data.timestamp,
              sessionId: capturedSessionId
            }]);
            setStreamingText('');
            break;

          case 'error':
            setError(data.error);
            break;
        }
      });

      return { result: fullResponse, sessionId: capturedSessionId };

    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, parseSSEStream]);

  /**
   * Cancel current request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingText('');
    }
  }, []);

  /**
   * Clear conversation history and start new session
   */
  const clearSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setStreamingText('');
    setError(null);
    localStorage.removeItem('kj360-agent-session');
  }, []);

  /**
   * Clear just the error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Actions
    invoke,
    chat,
    cancel,
    clearSession,
    clearError,

    // State
    messages,
    streamingText,
    isLoading,
    sessionId,
    error,

    // Computed
    hasSession: !!sessionId,
    messageCount: messages.length
  };
}

/**
 * useSkillList Hook
 *
 * Fetch available skills from the agent
 */
export function useSkillList() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSkills() {
      try {
        const res = await fetch('/api/agent/skills');
        if (!res.ok) throw new Error('Failed to fetch skills');
        const data = await res.json();
        setSkills(data.skills || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, []);

  return { skills, loading, error };
}

export default useClaudeAgent;
