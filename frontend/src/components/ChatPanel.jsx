import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Send, User, Bot, AlertCircle, BookOpen, Search, FileSearch, Brain } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import clsx from 'clsx'
import { readSSE } from '../utils/sse'
import { API_BASE_URL } from '../utils/api'

/* ── Processing Steps ──────────────────────────────────────────────── */
function ProcessingSteps({ steps }) {
  if (!steps || steps.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 mb-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
          <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-300 ${step.done ? 'opacity-100' : step.active ? 'opacity-100' : 'opacity-30'}`}
            style={{
              background: step.done
                ? 'linear-gradient(145deg, #c6f6d5, #9ae6b4)'
                : 'var(--bg-skeuo)',
              boxShadow: step.active && !step.done
                ? '0 0 8px rgba(245,166,35,0.4), inset 1px 1px 2px var(--shadow-dark)'
                : 'inset 1px 1px 2px var(--shadow-dark)',
            }}
          >
            {step.done ? (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : step.icon}
          </div>
          <span className={`font-semibold transition-colors duration-300 ${
            step.done ? 'text-green-500' : step.active ? 'text-amber-brand' : 'text-ink/30 dark:text-cream/30'
          }`}>
            {step.label}
          </span>
          {step.active && !step.done && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-3 h-3 border-2 border-amber-brand border-t-transparent rounded-full ml-1"
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Thinking Animation ─────────────────────────────────────────────── */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-sm font-medium text-amber-brand">Thinking</span>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-brand"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Markdown Renderer ──────────────────────────────────────────────── */
function MdContent({ content, isStreaming }) {
  const hasContent = content && content.trim().length > 0
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-ink dark:text-cream">
      {!hasContent && isStreaming && <ThinkingDots />}
      {hasContent && (
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
            code: ({ inline, children }) =>
              inline
                ? <code className="px-1.5 py-0.5 rounded text-[0.85em] font-mono" style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.2)' }}>{children}</code>
                : <pre className="rounded-xl p-4 my-3 overflow-x-auto text-[0.85em]" style={{ background: 'rgba(0,0,0,0.06)' }}><code>{children}</code></pre>,
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-2">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            h1: ({ children }) => <h1 className="font-bold text-base mt-4 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="font-bold text-sm mt-3 mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="font-semibold text-sm mt-2.5 mb-1.5">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-amber-brand pl-3 opacity-75 my-2">{children}</blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      )}
      {hasContent && isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-amber-brand ml-0.5 rounded-sm animate-pulse" style={{ verticalAlign: 'text-bottom' }} />
      )}
    </div>
  )
}

/* ── Source Chunks strip ────────────────────────────────────────────── */
function SourcesStrip({ chunks }) {
  const [open, setOpen] = useState(false)
  if (!chunks?.length) return null
  return (
    <div className="mt-2.5 border-t border-ink/10 dark:border-cream/10 pt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-amber-brand/70 hover:text-amber-brand transition-colors"
      >
        <BookOpen size={10} />
        {open ? 'Hide' : 'Show'} {chunks.length} source{chunks.length > 1 ? 's' : ''}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 space-y-1">
              {chunks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[9.5px] font-mono leading-snug"
                  style={{
                    background: 'var(--shadow-dark)',
                    boxShadow: 'inset 1px 1px 2px var(--shadow-dark)',
                  }}
                >
                  <div className="flex-1 truncate text-ink/50 dark:text-cream/40">
                    <span className="text-amber-brand font-bold">p.{c.page}</span> — {c.text.slice(0, 120)}…
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <div className="px-1.5 py-0.5 rounded-md text-[8.5px] font-bold text-blue-400/80"
                      style={{
                        background: 'var(--bg-skeuo)',
                        boxShadow: '1px 1px 2px var(--shadow-dark)',
                      }}
                      title="Embedding similarity score"
                    >
                      E:{Math.round((c.embed_score ?? c.score) * 100)}%
                    </div>
                    <div className="px-1.5 py-0.5 rounded-md text-[8.5px] font-bold text-amber-brand/70"
                      style={{
                        background: 'var(--bg-skeuo)',
                        boxShadow: '1px 1px 2px var(--shadow-dark)',
                      }}
                      title="Reranker confidence score"
                    >
                      R:{Math.round((c.rerank_score ?? c.score) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Message Bubble ──────────────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5')}
        style={isUser ? {
          background: 'linear-gradient(145deg, #ffb833, #dd9520)',
          boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
        } : {
          background: 'var(--bg-skeuo)',
          boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
        }}
      >
        {isUser ? <User size={13} className="text-ink" /> : <Bot size={13} className="text-violet-light" />}
      </div>

      {/* Content */}
      <div className={clsx('max-w-[84%]', isUser ? 'chat-user' : 'chat-assistant')}>
        {isUser ? (
          <p className="text-sm leading-relaxed font-medium text-ink">{msg.content}</p>
        ) : (
          <>
            {msg.processingSteps && <ProcessingSteps steps={msg.processingSteps} />}
            <MdContent content={msg.content || ' '} isStreaming={msg.isStreaming} />
            {!msg.isStreaming && msg.chunks?.length > 0 && (
              <SourcesStrip chunks={msg.chunks} />
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

/* ── Main Chat Panel ─────────────────────────────────────────────────── */
export default function ChatPanel({ sessionId, titleAccessory }) {
  const {
    chatMessages, addChatMessage, updateLastMessage, paperTitle, paperId,
    setChatChunks,
  } = useAppStore()
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const abortRef = useRef(null)
  const pendingTokens = useRef('')
  const rafRef = useRef(null)
  const textareaRef = useRef(null)

  // Smooth scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  // RAF-batched token flush for smooth streaming
  const flushTokens = useCallback(() => {
    if (pendingTokens.current) {
      updateLastMessage(
        useAppStore.getState().chatMessages.slice(-1)[0]?.content + pendingTokens.current
      )
      pendingTokens.current = ''
    }
    rafRef.current = null
  }, [updateLastMessage])

  const updateMessageSteps = useCallback((steps) => {
    const msgs = [...useAppStore.getState().chatMessages]
    const lastIdx = msgs.length - 1
    if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
      msgs[lastIdx] = { ...msgs[lastIdx], processingSteps: [...steps] }
      useAppStore.setState({ chatMessages: msgs })
    }
  }, [])

  const sendMessage = async () => {
    const query = input.trim()
    if (!query || isStreaming) return

    setInput('')
    setError(null)
    setIsStreaming(true)
    pendingTokens.current = ''

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    addChatMessage({ role: 'user', content: query })

    const steps = [
      { label: 'Optimizing query', icon: <Search size={7} className="text-amber-brand" />, active: true, done: false },
      { label: 'Retrieving chunks', icon: <FileSearch size={7} className="text-amber-brand" />, active: false, done: false },
      { label: 'Generating answer', icon: <Brain size={7} className="text-amber-brand" />, active: false, done: false },
    ]
    addChatMessage({ role: 'assistant', content: '', isStreaming: true, chunks: [], processingSteps: [...steps] })

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, content: query, paper_id: paperId }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Request failed')
        throw new Error(errText)
      }

      abortRef.current = response

      for await (const event of readSSE(response)) {
        if (event.type === 'optimized_query') {
          steps[0].done = true
          steps[1].active = true
          updateMessageSteps(steps)
        } else if (event.type === 'start') {
          steps[1].done = true
          steps[2].active = true
          updateMessageSteps(steps)
        } else if (event.type === 'token') {
          pendingTokens.current += event.content
          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(flushTokens)
          }
        } else if (event.type === 'done') {
          steps[2].done = true
          // Flush any remaining tokens
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          flushTokens()

          updateLastMessage(
            useAppStore.getState().chatMessages.slice(-1)[0]?.content
          )

          // Attach chunks and remove processing steps
          const lastIdx = useAppStore.getState().chatMessages.length - 1
          const msgs = [...useAppStore.getState().chatMessages]
          msgs[lastIdx] = { ...msgs[lastIdx], isStreaming: false, chunks: event.chunks || [], processingSteps: null }
          useAppStore.setState({ chatMessages: msgs })

          // Set chunks for PDF highlighting
          if (event.chunks?.length) {
            setChatChunks(event.chunks)
          }
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to get response')
      // Update last message to show error
      const lastIdx = useAppStore.getState().chatMessages.length - 1
      if (lastIdx >= 0) {
        const msgs = [...useAppStore.getState().chatMessages]
        msgs[lastIdx] = { ...msgs[lastIdx], isStreaming: false, content: `Error: ${err.message}` }
        useAppStore.setState({ chatMessages: msgs })
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingTokens.current = ''
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-resize textarea
  const handleInput = (e) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10 dark:border-cream/10">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen size={16} className="text-amber-brand flex-shrink-0" />
          <h3 className="text-sm font-semibold truncate text-ink dark:text-cream">
            {paperTitle || 'No paper loaded'}
          </h3>
        </div>
        {titleAccessory}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-ink/50 dark:text-cream/50 text-center px-4">
            <Bot size={48} className="mb-4 text-amber-brand opacity-80" />
            <h4 className="text-base font-bold mb-1 text-ink dark:text-cream">Ready for your questions!</h4>
            <p className="text-sm">Ask me anything about this paper.</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-ink/10 dark:border-cream/10">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={paperId ? "Ask about this paper..." : "Upload a paper first..."}
            disabled={!paperId || isStreaming}
            rows={1}
            className="flex-1 min-h-[40px] max-h-[200px] px-3 py-2.5 rounded-xl text-sm resize-none bg-transparent border border-ink/10 dark:border-cream/10 focus:border-amber-brand/50 focus:outline-none transition-colors disabled:opacity-40 text-ink dark:text-cream placeholder:text-ink/30 dark:placeholder:text-cream/30"
            style={{
              boxShadow: 'inset 1px 1px 3px var(--shadow-dark), inset -1px -1px 2px var(--shadow-light)',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !paperId || isStreaming}
            className="p-2.5 rounded-xl flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(145deg, #ffb833, #dd9520)',
              boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
            }}
          >
            <Send size={16} className="text-ink" />
          </button>
        </div>
      </div>
    </div>
  )
}
