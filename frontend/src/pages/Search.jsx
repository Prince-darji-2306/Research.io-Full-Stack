import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, Swords } from 'lucide-react'
import { api, API_BASE_URL } from '../utils/api'
import { readSSE } from '../utils/sse'
import { useAppStore } from '../store/appStore'
import AgentLog from '../components/AgentLog'
import PaperGrid from '../components/PaperGrid'

export default function SearchPage() {
  const navigate = useNavigate()
  const {
    sessionId, setSessionId, setPaper, clearChat,
    agentLogs, addAgentLog, clearAgentLogs,
    searchResults, setSearchResults,
    isSearching, setIsSearching,
    searchQuery, setSearchQuery,
    setArenaPaper,
  } = useAppStore()

  const [loadingPaper, setLoadingPaper] = useState(null)
  const [loadingPaperStage, setLoadingPaperStage] = useState('')
  const [searchError, setSearchError] = useState(null)
  const [arenaToast, setArenaToast] = useState(null)
  const abortRef = useRef(null)

  // Reactive arena slots
  const arenaPaperA = useAppStore(s => s.arenaPaperA)
  const arenaPaperB = useAppStore(s => s.arenaPaperB)

  useEffect(() => {
    if (!sessionId) {
      api.post('/papers/session', {}).then(r => setSessionId(r.data.session_id))
    }
  }, [])

  const startSearch = async () => {
    const query = searchQuery.trim()
    if (!query || isSearching) return

    clearAgentLogs()
    setSearchResults(null)
    setSearchError(null)
    setIsSearching(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch(`${API_BASE_URL}/search/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      for await (const event of readSSE(response)) {
        if (event.type === 'result') {
          addAgentLog(event)
          setSearchResults({ recommended: event.recommended, others: event.others })
          break
        } else if (event.type === 'error') {
          setSearchError(event.message)
          break
        } else {
          addAgentLog(event)
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setSearchError(e.message)
    } finally {
      setIsSearching(false)
    }
  }

  const stopSearch = () => {
    abortRef.current?.abort()
    setIsSearching(false)
  }

  const handleSelectPaper = async (paper) => {
    const pdfLink = paper.pdf_link || paper.pdf
    if (!pdfLink) return
    setLoadingPaper(pdfLink)
    setLoadingPaperStage('Starting...')

    let sid = sessionId
    if (!sid) {
      const r = await api.post('/papers/session', {})
      sid = r.data.session_id
      setSessionId(sid)
    }

    try {
      const response = await fetch(`${API_BASE_URL}/papers/select/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sid,
          title: paper.title,
          pdf_url: pdfLink,
        }),
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      let paperId = null
      for await (const event of readSSE(response)) {
        if (event.type === 'paper_progress') {
          // Update the stage text shown beside spinner
          setLoadingPaperStage(event.label)
        } else if (event.type === 'paper_result') {
          paperId = event.paper_id
          // Short delay to show "complete" state
          await new Promise(r => setTimeout(r, 500))
        }
      }

      if (paperId) {
        clearChat()
        setPaper(paperId, paper.title)
        navigate('/workspace')
      } else {
        throw new Error('No paper_id received')
      }
    } catch (err) {
      setSearchError('Failed to process paper: ' + err.message)
    } finally {
      setLoadingPaper(null)
      setLoadingPaperStage('')
    }
  }

  const handleAddToArena = (paper) => {
    const state = useAppStore.getState()
    
    // Toggle off if already selected
    if (state.arenaPaperA?.title === paper.title) {
      setArenaPaper('A', null)
      return
    }
    if (state.arenaPaperB?.title === paper.title) {
      setArenaPaper('B', null)
      return
    }

    let slot
    if (!state.arenaPaperA) {
      slot = 'A'
      setArenaPaper('A', paper)
    } else if (!state.arenaPaperB) {
      slot = 'B'
      setArenaPaper('B', paper)
    } else {
      // Both full: Cycle consecutive selection
      // Move B to A, new to B
      setArenaPaper('A', state.arenaPaperB)
      setArenaPaper('B', paper)
      slot = 'B'
    }
    
    setArenaToast({ slot, title: paper.title })
    setTimeout(() => setArenaToast(null), 2500)
  }
  
  const handleStartDebate = () => {
    useAppStore.getState().setArenaTriggerProcess(true)
    navigate('/arena')
  }

  return (
    <div className="min-h-screen pt-10 pb-24 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center mb-8"
        >
          <div
            className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full mb-5 text-xs font-mono font-bold text-violet-light uppercase tracking-widest"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)',
            }}
          >
            <Sparkles size={13} /> Search Console
          </div>
          <h1 className="font-display text-5xl font-black mb-3 tracking-tighter text-ink dark:text-cream">
            Find Research
          </h1>
          <p className="text-ink/55 dark:text-cream/45 text-base max-w-md mx-auto font-medium">
            Multi-source academic retrieval via AI agents.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-6"
        >
          <div className="skeuo-card p-3 flex gap-3 rounded-[2rem]">
            <div className="relative flex-1 skeuo-input flex items-center rounded-2xl">
              <Search size={20} className="text-ink/30 dark:text-cream/30 mr-3 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startSearch()}
                placeholder="What are you looking for?"
                className="w-full bg-transparent text-lg font-bold focus:outline-none placeholder-ink/20 dark:placeholder-cream/20 text-ink dark:text-cream"
              />
            </div>

            {isSearching ? (
              <motion.button
                onClick={stopSearch}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl font-black text-white text-sm"
                style={{
                  background: 'linear-gradient(145deg, #e55, #c33)',
                  boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)',
                }}
              >
                Stop
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={startSearch}
                disabled={!searchQuery.trim()}
                className="px-8 py-4 skeuo-btn-amber rounded-2xl text-base font-black disabled:opacity-50"
              >
                Search
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Arena Queue Status */}
        <AnimatePresence>
          {(arenaPaperA || arenaPaperB) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{
                background: 'rgba(124,58,237,0.06)',
                boxShadow: 'inset 2px 2px 4px rgba(124,58,237,0.06)',
              }}
            >
              <Swords size={13} className="text-violet-light flex-shrink-0" />
              <span className="text-[11px] font-mono font-bold text-violet-light uppercase tracking-wider">Arena Queue</span>
              <div className="flex items-center gap-2 ml-2">
                {arenaPaperA && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold"
                    style={{ background: 'rgba(245,166,35,0.15)', color: '#f5a623' }}
                  >
                    A: {arenaPaperA.title?.slice(0, 28)}{arenaPaperA.title?.length > 28 ? '…' : ''}
                  </span>
                )}
                {arenaPaperB && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
                  >
                    B: {arenaPaperB.title?.slice(0, 28)}{arenaPaperB.title?.length > 28 ? '…' : ''}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {searchError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 px-4 py-2.5 rounded-xl text-sm font-mono text-red-400"
            style={{
              background: 'rgba(239,68,68,0.06)',
              boxShadow: 'inset 2px 2px 4px rgba(239,68,68,0.08)',
            }}
          >
            ⚠ {searchError}
          </motion.div>
        )}

        {/* Agent Log */}
        <div className="mb-6">
          <AgentLog logs={agentLogs} isSearching={isSearching} />
        </div>

        {/* Results */}
        <AnimatePresence>
          {searchResults && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <PaperGrid
                recommended={searchResults.recommended}
                others={searchResults.others}
                onSelect={handleSelectPaper}
                loadingPaperId={loadingPaper}
                loadingPaperStage={loadingPaperStage}
                onAddToArena={handleAddToArena}
                arenaPaperA={arenaPaperA}
                arenaPaperB={arenaPaperB}
                onStartDebate={handleStartDebate}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Arena Toast */}
      <AnimatePresence>
        {arenaToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
            }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{
                background: arenaToast.slot === 'A'
                  ? 'linear-gradient(145deg, #ffb833, #dd9520)'
                  : 'linear-gradient(145deg, #8b5cf6, #7034d5)',
                color: arenaToast.slot === 'A' ? '#1a1a1a' : '#fff',
              }}
            >
              {arenaToast.slot}
            </div>
            <span className="text-xs font-mono font-bold text-ink/70 dark:text-cream/60">
              Added to Arena slot {arenaToast.slot}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
