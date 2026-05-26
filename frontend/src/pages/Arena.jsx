import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords, Upload, FileText, Play, X, Trophy,
  ChevronRight, Loader2, BookOpen, Sparkles
} from 'lucide-react'
import { api, API_BASE_URL } from '../utils/api'
import { readSSE } from '../utils/sse'
import { useAppStore } from '../store/appStore'

/* ── Paper Slot Upload Card ─────────────────────────────────────── */
function PaperSlot({ slot, paper, onUpload, onClear, isProcessing, onSelectFromSearch }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)
  const color = slot === 'A' ? '#f5a623' : '#8b5cf6'
  const label = slot === 'A' ? 'Paper A' : 'Paper B'

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.pdf')) onUpload(file)
  }

  return (
    <div
      className="flex flex-col rounded-[2rem] overflow-hidden"
      style={{
        background: 'var(--bg-skeuo)',
        boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
      }}
    >
      {/* Slot header */}
      <div
        className="px-5 py-3 flex items-center gap-2 flex-shrink-0"
        style={{
          background: 'var(--shadow-dark)',
          boxShadow: 'inset 0 2px 4px var(--shadow-dark), inset 0 -1px 2px var(--shadow-light)',
          borderBottom: `2px solid ${color}`,
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
          style={{
            background: `linear-gradient(145deg, ${color}dd, ${color}99)`,
            boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
            color: slot === 'A' ? '#1a1a1a' : '#fff',
          }}
        >
          {slot}
        </div>
        <span className="text-sm font-bold text-ink dark:text-cream">{label}</span>
        {paper && (
          <button
            onClick={onClear}
            className="ml-auto p-1 rounded-lg text-ink/40 hover:text-red-400 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {paper ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col items-center justify-center text-center gap-3 py-4"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--bg-skeuo)',
                boxShadow: 'inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)',
              }}
            >
              <FileText size={24} style={{ color }} />
            </div>
            <p className="text-sm font-bold text-ink dark:text-cream line-clamp-3 leading-snug px-2">
              {paper.title}
            </p>
            <div
              className="px-3 py-1 rounded-full text-[10px] font-mono font-bold"
              style={{
                background: `${color}18`,
                color,
                boxShadow: `inset 1px 1px 3px ${color}20`,
              }}
            >
              ✓ Ready
            </div>
          </motion.div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer"
            style={{
              borderColor: isDragging ? color : 'var(--shadow-dark)',
              background: isDragging ? `${color}06` : 'transparent',
            }}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => e.target.files[0] && onUpload(e.target.files[0])}
            />
            {isProcessing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Loader2 size={22} style={{ color }} />
              </motion.div>
            ) : (
              <>
                <Upload size={22} className="text-ink/25 dark:text-cream/25" />
                <p className="text-xs font-mono text-ink/40 dark:text-cream/35">Drop PDF or click</p>
              </>
            )}
          </div>
        )}

        {/* Select from search button */}
        {!paper && !isProcessing && onSelectFromSearch && (
          <button
            onClick={onSelectFromSearch}
            className="mt-3 w-full text-[11px] font-mono font-bold py-2 rounded-xl transition-all text-violet-light hover:text-violet-brand"
            style={{
              background: 'rgba(124,58,237,0.06)',
              boxShadow: 'inset 1px 1px 3px rgba(124,58,237,0.08)',
            }}
          >
            or pick from search results →
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Round Label ────────────────────────────────────────────────── */
function RoundBadge({ round, topic }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <hr className="flex-1 skeuo-divider" />
      <span
        className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest"
        style={{
          background: 'var(--bg-skeuo)',
          boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)',
          color: round === 0 || round === 7 ? '#7c3aed' : '#f5a623',
        }}
      >
        {round === 0 ? 'Intro' : round === 7 ? 'Verdict' : `Round ${round}`} — {topic}
      </span>
      <hr className="flex-1 skeuo-divider" />
    </div>
  )
}

/* ── Debate Turn Bubble ──────────────────────────────────────────── */
function DebateTurn({ speaker, content, isStreaming }) {
  const isA = speaker === 'paper_a'
  const isMod = speaker === 'moderator'

  if (isMod) {
    return (
      <div className="px-4 py-3 rounded-2xl text-sm font-mono leading-relaxed text-ink/70 dark:text-cream/60 italic"
        style={{
          background: 'rgba(124,58,237,0.06)',
          boxShadow: 'inset 2px 2px 5px rgba(124,58,237,0.08)',
          borderLeft: '3px solid #7c3aed',
        }}
      >
        <span className="text-[10px] font-bold text-violet-light uppercase tracking-widest block mb-1">
          ⚖ Moderator
        </span>
        {content}
        {isStreaming && <span className="inline-block w-1.5 h-3.5 bg-violet-light ml-1 rounded-sm animate-pulse" style={{ verticalAlign: 'text-bottom' }} />}
      </div>
    )
  }

  return (
    <div className={`flex ${isA ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] ${isA ? 'debate-bubble-a' : 'debate-bubble-b'} text-sm leading-relaxed text-ink dark:text-cream`}
      >
        <span
          className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1.5"
          style={{ color: isA ? '#f5a623' : '#8b5cf6' }}
        >
          {isA ? '📄 Paper A' : '📄 Paper B'}
        </span>
        {content}
        {isStreaming && (
          <span
            className="inline-block w-1.5 h-3.5 rounded-sm animate-pulse ml-1"
            style={{ background: isA ? '#f5a623' : '#8b5cf6', verticalAlign: 'text-bottom' }}
          />
        )}
      </div>
    </div>
  )
}

/* ── Verdict Card ───────────────────────────────────────────────── */
function VerdictCard({ winner, paperA, paperB }) {
  const winnerTitle = winner === 'paper_a' ? paperA?.title : winner === 'paper_b' ? paperB?.title : 'Draw'
  const winnerColor = winner === 'paper_a' ? '#f5a623' : winner === 'paper_b' ? '#8b5cf6' : '#22c55e'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="verdict-card mt-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <Trophy size={22} style={{ color: winnerColor }} />
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink/40 dark:text-cream/35">
            Winner
          </p>
          <p className="text-base font-black text-ink dark:text-cream line-clamp-1">
            {winner === 'draw' ? '🤝 Draw — Both papers excel equally' : winnerTitle}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main Arena Page ────────────────────────────────────────────── */
export default function Arena() {
  const { 
    arenaPaperA, arenaPaperB, setArenaPaper, clearArenaPapers,
    arenaTriggerProcess, setArenaTriggerProcess,
    arenaProcessedA, arenaProcessedB, setArenaProcessed,
  } = useAppStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [perspective, setPerspective] = useState("")
  const [restartCount, setRestartCount] = useState(0)

  const [debateStarted, setDebateStarted] = useState(false)
  const [debateFinished, setDebateFinished] = useState(false)
  const [turns, setTurns] = useState([])
  const [currentRound, setCurrentRound] = useState(null)
  const [winner, setWinner] = useState(null)
  const [error, setError] = useState(null)

  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Use store values as the source of truth
  const processedA = arenaProcessedA
  const processedB = arenaProcessedB

  useEffect(() => {
    if (arenaPaperA && arenaPaperB && !processedA && !processedB && !isProcessing && arenaTriggerProcess) {
      setArenaTriggerProcess(false)
      handleAutoProcess()
    }
  }, [arenaPaperA, arenaPaperB, arenaTriggerProcess])

  const handleAutoProcess = async () => {
    setIsProcessing(true)
    setError(null)
    try {
      const [resA, resB] = await Promise.all([
        api.post('/arena/select-url', { title: arenaPaperA.title, pdf_url: arenaPaperA.pdf_link || arenaPaperA.pdf }),
        api.post('/arena/select-url', { title: arenaPaperB.title, pdf_url: arenaPaperB.pdf_link || arenaPaperB.pdf })
      ])
      setArenaProcessed('A', { paper_id: resA.data.paper_id, title: resA.data.title })
      setArenaProcessed('B', { paper_id: resB.data.paper_id, title: resB.data.title })
    } catch (e) {
      setError("Failed to auto-process papers from search.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUploadFiles = async (files) => {
    const pdfs = Array.from(files).filter(f => f.name.endsWith('.pdf'))
    if (pdfs.length < 2) {
      setError("Please select at least two PDF files.")
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file_a', pdfs[0])
      form.append('file_b', pdfs[1])
      const res = await api.post('/arena/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setArenaProcessed('A', res.data.paper_a)
      setArenaProcessed('B', res.data.paper_b)
      setArenaPaper('A', { title: res.data.paper_a.title })
      setArenaPaper('B', { title: res.data.paper_b.title })
    } catch (e) {
      setError(`Failed to upload papers: ${e.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const startDebate = async (isRestart = false) => {
    if (!processedA || !processedB) return
    setDebateStarted(true)
    setDebateFinished(false)
    setTurns([])
    setWinner(null)
    setError(null)
    setCurrentRound(null)

    let currentRestartCount = 0
    if (isRestart) {
      currentRestartCount = restartCount + 1
      setRestartCount(currentRestartCount)
    } else {
      setRestartCount(0)
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch(`${API_BASE_URL}/arena/debate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_a_id: processedA.paper_id,
          paper_b_id: processedB.paper_id,
          perspective: perspective.trim() || null,
          restart_count: currentRestartCount
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      for await (const event of readSSE(response)) {
        if (event.type === 'round_start') {
          setCurrentRound({ round: event.round, speaker: event.speaker, topic: event.topic })
          setTurns(prev => [...prev, {
            round: event.round,
            speaker: event.speaker,
            topic: event.topic,
            content: '',
            done: false,
          }])
        } else if (event.type === 'token') {
          setTurns(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last) updated[updated.length - 1] = { ...last, content: last.content + event.content }
            return updated
          })
          bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        } else if (event.type === 'round_end') {
          setTurns(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last) updated[updated.length - 1] = { ...last, done: true }
            return updated
          })
        } else if (event.type === 'verdict') {
          setWinner(event.winner)
          setDebateFinished(true)
          setCurrentRound(null)
        } else if (event.type === 'error') {
          setError(event.message)
          setDebateStarted(false)
          break
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setDebateStarted(false)
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setDebateStarted(false)
    setDebateFinished(false)
    setTurns([])
    setWinner(null)
    setError(null)
    setCurrentRound(null)
    setPerspective("")
    setRestartCount(0)
    clearArenaPapers()
  }

  const canStart = processedA && processedB && !debateStarted

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* ── Page Header ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
          <div
            className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full mb-4 text-xs font-mono font-bold text-amber-brand uppercase tracking-widest"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)',
            }}
          >
            <Swords size={13} /> Debate Arena
          </div>
          <h1 className="font-display text-4xl font-black tracking-tighter text-ink dark:text-cream mb-2">
            Paper vs Paper
          </h1>
          <p className="text-ink/50 dark:text-cream/40 text-sm font-medium max-w-sm mx-auto">
            Upload two research papers. AI agents will debate them across 6 structured rounds.
          </p>
        </motion.div>

        {/* ── Error ─────────────────────────────────────────────── */}
        {error && (
          <div
            className="px-4 py-3 rounded-2xl text-sm font-mono text-red-400 max-w-2xl mx-auto"
            style={{ background: 'rgba(239,68,68,0.06)', boxShadow: 'inset 2px 2px 4px rgba(239,68,68,0.08)' }}
          >
            ⚠ {error}
          </div>
        )}

        {/* ── Upload Area ──────────────────────────────────────── */}
        {!(processedA && processedB) && (
          <motion.div
             initial={{ opacity: 0, y: 12 }}
             animate={{ opacity: 1, y: 0 }}
             className="skeuo-card p-8 rounded-[3rem] text-center max-w-2xl mx-auto"
          >
             {isProcessing ? (
               <div className="flex flex-col items-center justify-center py-12 gap-5">
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                   <Loader2 size={40} className="text-amber-brand" />
                 </motion.div>
                 <p className="text-sm font-bold text-ink/60 dark:text-cream/50">Processing PDFs for Arena...</p>
               </div>
             ) : (
               <div
                  className="flex flex-col items-center justify-center gap-4 py-16 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer"
                  style={{
                    borderColor: isDragging ? '#ffb833' : 'var(--shadow-dark)',
                    background: isDragging ? 'rgba(255,184,51,0.06)' : 'transparent',
                  }}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); handleUploadFiles(e.dataTransfer.files) }}
                  onClick={() => inputRef.current?.click()}
               >
                 <input
                   ref={inputRef}
                   type="file"
                   accept=".pdf"
                   multiple
                   className="hidden"
                   onChange={e => handleUploadFiles(e.target.files)}
                 />
                 <Upload size={36} className="text-amber-brand opacity-80 mb-2" />
                 <h3 className="text-lg font-black text-ink dark:text-cream">Select two papers</h3>
                 <p className="text-xs font-mono text-ink/40 dark:text-cream/35 leading-relaxed">
                   Drop exactly 2 PDFs here, or click to browse.<br/>We'll process them in parallel for the debate.
                 </p>
               </div>
             )}
          </motion.div>
        )}

        {/* ── Perspective & Controls ────────────────────────── */}
        {processedA && processedB && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="skeuo-card p-4 rounded-3xl"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center">
               <div className="flex-1 relative flex items-center rounded-2xl w-full p-1 px-4"
                    style={{
                      background: 'var(--bg-skeuo)',
                      boxShadow: 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)'
                    }}>
                 <input
                   type="text"
                   value={perspective}
                   onChange={e => setPerspective(e.target.value)}
                   placeholder="Enter a perspective (e.g. ethical implications, deployment)..."
                   className="w-full bg-transparent text-sm py-2 font-bold focus:outline-none placeholder-ink/30 dark:placeholder-cream/30 text-ink dark:text-cream"
                 />
               </div>
               
               <div className="flex items-center gap-3 w-full md:w-auto">
                 <motion.button
                   whileHover={canStart || debateFinished ? { y: -1 } : {}}
                   whileTap={canStart || debateFinished ? { scale: 0.97 } : {}}
                   onClick={() => startDebate(debateFinished)}
                   disabled={(!canStart && !debateFinished) || debateStarted}
                   className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${debateStarted ? 'opacity-40 cursor-not-allowed' : ''}`}
                   style={{
                     background: 'linear-gradient(145deg, #ffb833, #dd9520)',
                     boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)',
                     color: '#1a1a1a',
                     whiteSpace: 'nowrap'
                   }}
                 >
                   {debateStarted ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={16} /></motion.div> Debating…</> : <><Swords size={16} /> {debateFinished ? 'Restart Debate' : 'Start Debate'}</>}
                 </motion.button>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={reset}
                    className="px-5 py-3 rounded-2xl font-bold text-sm text-ink/50 dark:text-cream/70 hover:text-red-400 transition-colors"
                    style={{
                      background: 'var(--bg-skeuo)',
                      boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Reinitialise Arena
                  </motion.button>
               </div>
            </div>
          </motion.div>
        )}

        {/* ── Main Debate Card ────────────────────────────────── */}
        {(turns.length > 0 || debateStarted) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="skeuo-card rounded-[2rem] overflow-hidden"
          >
            {/* Header: Paper A VS Paper B */}
            <div className="px-5 py-4 skeuo-inset-strip flex items-center justify-center gap-4 md:gap-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                 <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black" style={{ background: 'linear-gradient(145deg, #f5a623, #d98810)', color: '#1a1a1a', boxShadow: '2px 2px 4px var(--shadow-dark)' }}>A</span>
                 <span className="text-sm font-bold text-ink dark:text-cream max-w-[150px] md:max-w-xs truncate">{processedA.title}</span>
              </div>
              <span className="text-xs font-black text-ink/30 dark:text-cream/20">VS</span>
              <div className="flex items-center gap-2">
                 <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black" style={{ background: 'linear-gradient(145deg, #8b5cf6, #7046c8)', color: '#fff', boxShadow: '2px 2px 4px var(--shadow-dark)' }}>B</span>
                 <span className="text-sm font-bold text-ink dark:text-cream max-w-[150px] md:max-w-xs truncate">{processedB.title}</span>
              </div>
            </div>

            {/* Turns */}
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <AnimatePresence initial={false}>
                {turns.map((turn, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RoundBadge round={turn.round} topic={turn.topic} />
                    <div className="mt-2">
                      <DebateTurn
                        speaker={turn.speaker}
                        content={turn.content}
                        isStreaming={!turn.done && i === turns.length - 1}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}

        {/* ── Verdict ───────────────────────────────────────────── */}
        {debateFinished && winner && (
          <VerdictCard
            winner={winner}
            paperA={processedA}
            paperB={processedB}
          />
        )}

      </div>
    </div>
  )
}
