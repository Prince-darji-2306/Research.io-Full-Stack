import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Wrench, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Loader2, Zap, Terminal
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

/* ── Step Pill ───────────────────────────────────────────────────────── */
function StepPill({ step }) {
  return (
    <span className="step-pill">{step}</span>
  )
}

/* ── Thought entry ─────────────────────────────────────────────────── */
function ThoughtEntry({ log }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex gap-2.5 items-start">
      <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
        style={{
          background: 'var(--bg-gradient-skeuo-raised)',
          boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
        }}
      >
        <Brain size={11} className="text-violet-light" />
      </div>
      <div className="flex-1 min-w-0">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-violet-light/80 hover:text-violet-light w-full text-left group"
        >
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <StepPill step={log.step} />
          <span className="uppercase tracking-wider">Reasoning</span>
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
              <div className="mt-2 px-3 py-2 rounded-xl agent-terminal">
                <p className="text-[10.5px] font-mono leading-relaxed text-ink/55 dark:text-cream/45">
                  {log.content}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── Tool call entry ─────────────────────────────────────────────────── */
function ToolCallEntry({ log }) {
  return (
    <div className="flex gap-2.5 items-center">
      <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, #ffe8b0, #f5c860)',
          boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
        }}
      >
        <Wrench size={10} className="text-amber-dark" />
      </div>
      <StepPill step={log.step} />
      <span className="text-[11px] font-mono font-semibold text-amber-brand flex-1 truncate">
        {log.label}
      </span>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
      >
        <Loader2 size={11} className="text-amber-brand/60" />
      </motion.div>
    </div>
  )
}

/* ── Tool result entry ──────────────────────────────────────────────── */
function ToolResultEntry({ log }) {
  return (
    <div className="flex gap-2.5 items-start pl-1">
      <div
        className="flex-shrink-0 w-5 h-5 rounded-md mt-0.5 flex items-center justify-center"
        style={{
          background: log.success
            ? 'linear-gradient(145deg, #c6f6d5, #9ae6b4)'
            : 'linear-gradient(145deg, #fed7d7, #fc8181)',
          boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
        }}
      >
        {log.success
          ? <CheckCircle2 size={10} className="text-green-700" />
          : <XCircle size={10} className="text-red-700" />
        }
      </div>
      <div className="min-w-0 flex-1">
        <span className={clsx('text-[11px] font-mono font-semibold', log.success ? 'text-green-500' : 'text-red-400')}>
          {log.label}
        </span>
        <p className="text-[10px] font-mono text-ink/40 dark:text-cream/35 mt-0.5 truncate">
          {log.summary}
        </p>
      </div>
    </div>
  )
}

/* ── Error entry ─────────────────────────────────────────────────────── */
function ErrorEntry({ log }) {
  return (
    <div className="flex gap-2 items-center px-3 py-2 rounded-xl"
      style={{
        background: 'rgba(239, 68, 68, 0.06)',
        boxShadow: 'inset 1px 1px 3px rgba(239,68,68,0.1), inset -1px -1px 3px var(--shadow-light)',
      }}
    >
      <XCircle size={12} className="text-red-400 flex-shrink-0" />
      <span className="text-[11px] font-mono text-red-400">{log.message}</span>
    </div>
  )
}

/* ── Result entry ───────────────────────────────────────────────────── */
function ResultEntry({ log }) {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="flex-shrink-0 w-5 h-5 rounded-md mt-0.5 flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, #ffb833, #dd9520)',
          boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
        }}
      >
        <CheckCircle2 size={10} className="text-ink" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-mono font-bold text-amber-brand uppercase tracking-wider">
          Search Complete
        </span>
        <div className="mt-1.5 px-3 py-2 rounded-xl agent-terminal">
          <p className="text-[10px] font-mono text-green-400">
            ✓ Found: <span className="text-amber-brand">{log.recommended?.title?.slice(0, 55)}…</span>
          </p>
          <p className="text-[10px] font-mono text-ink/40 dark:text-cream/30 mt-0.5">
            + {log.others?.length || 0} more papers
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────────────────── */
export default function AgentLog({ logs, isSearching }) {
  if (!logs.length && !isSearching) return null

  const renderEntry = (log, i) => {
    switch (log.type) {
      case 'thought':     return <ThoughtEntry key={i} log={log} />
      case 'tool_call':   return <ToolCallEntry key={i} log={log} />
      case 'tool_result': return <ToolResultEntry key={i} log={log} />
      case 'result':      return <ResultEntry key={i} log={log} />
      case 'error':       return <ErrorEntry key={i} log={log} />
      default:            return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="skeuo-card rounded-2xl overflow-hidden"
    >
      {/* Terminal Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 skeuo-inset-strip">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57', boxShadow: 'inset 0 1px 1px var(--shadow-light)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e', boxShadow: 'inset 0 1px 1px var(--shadow-light)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840', boxShadow: 'inset 0 1px 1px var(--shadow-light)' }} />
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <Terminal size={11} className="text-amber-brand" />
          <span className="text-[11px] font-mono font-bold text-amber-brand uppercase tracking-[0.12em]">
            Agent Activity
          </span>
        </div>
        {isSearching && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="flex items-center gap-1.5 text-[10px] font-mono text-green-400"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            LIVE
          </motion.div>
        )}
      </div>

      {/* Log Body */}
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        <AnimatePresence initial={false}>
          {logs.map((log, i) => {
            const entry = renderEntry(log, i)
            if (!entry) return null
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16 }}
              >
                {entry}
                {i < logs.length - 1 && (
                  <hr className="skeuo-divider mt-3" />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {isSearching && logs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-[11px] font-mono text-amber-brand/60 py-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            >
              <Loader2 size={12} />
            </motion.div>
            Initialising agent…
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
