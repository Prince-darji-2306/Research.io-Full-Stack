import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, BookOpen, ChevronDown, ChevronRight,
  Maximize2, Minimize2, X, ChevronUp, RotateCcw, Trash2, PanelRightClose, PanelRightOpen, Play
} from 'lucide-react'
import { api } from '../utils/api'
import { useAppStore } from '../store/appStore'
import ChatPanel from '../components/ChatPanel'
import PdfHighlightPanel from '../components/PdfHighlightPanel'

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

/* ── Main Workspace ───────────────────────────────────────────────── */
export default function Workspace() {
  const {
    sessionId, setSessionId,
    paperId, paperTitle, setPaper, clearPaper,
    clearChat, chatChunks, clearChatChunks,
  } = useAppStore()

  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [splitPos, setSplitPos] = useState(70)
  const [showSources, setShowSources] = useState(!isMobile)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [focusPage, setFocusPage] = useState(1)
  const [chunkPages, setChunkPages] = useState([])
  const fileInputRef = useRef(null)

  // Compute chunk pages from chat chunks (sync with PdfHighlightPanel logic)
  const computedChunkPages = useMemo(() => {
    const pages = [...new Set(chatChunks.map(c => c.page).filter(p => p > 0))]
    return pages.sort((a, b) => a - b)
  }, [chatChunks])

  useEffect(() => {
    if (!sessionId) {
      api.post('/papers/session', { paper_id: paperId || undefined })
        .then(r => setSessionId(r.data.session_id))
    }
  }, [])

  useEffect(() => {
    if (!isMobile) setShowSources(true)
  }, [isMobile])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'auto' }
  }, [])

  const handleUpload = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) return
    setIsUploading(true)
    try {
      let sid = sessionId
      if (!sid) {
        const sr = await api.post('/papers/session', {})
        sid = sr.data.session_id
        setSessionId(sid)
      }
      const form = new FormData()
      form.append('file', file)
      const resp = await api.post(`/papers/upload?session_id=${sid}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearChat()
      setPaper(resp.data.paper_id, resp.data.title)
    } catch (e) {
      console.error(e)
    } finally {
      setIsUploading(false)
    }
  }

  /* ── Upload Screen ───────────────────────────────────────────────── */
  if (!paperId) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center p-8">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="max-w-xl w-full skeuo-card p-14 text-center rounded-[3rem]"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: 'inset 5px 5px 10px var(--shadow-dark), inset -5px -5px 10px var(--shadow-light)',
            }}
          >
            <Upload size={30} className="text-amber-brand" />
          </div>
          <h2 className="font-display text-4xl font-black mb-3 text-ink dark:text-cream">Workspace</h2>
          <p className="text-ink/50 dark:text-cream/40 mb-10 font-medium">
            Upload a research paper to begin the deep analysis.
          </p>

          <label
            className="block w-full cursor-pointer"
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files[0]) }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => handleUpload(e.target.files[0])}
            />
            <motion.div
              animate={isDragging ? { scale: 1.03 } : { scale: 1 }}
              className="border-2 border-dashed rounded-3xl px-8 py-10 mb-5 transition-all"
              style={{
                borderColor: isDragging ? '#f5a623' : 'var(--shadow-dark)',
                background: isDragging ? 'rgba(245,166,35,0.04)' : 'transparent',
                boxShadow: isDragging
                  ? 'inset 4px 4px 8px rgba(245,166,35,0.08)'
                  : 'inset 2px 2px 5px var(--shadow-dark)',
              }}
            >
              <FileText size={28} className="mx-auto mb-2 text-ink/20 dark:text-cream/20" />
              <p className="text-sm font-mono text-ink/40 dark:text-cream/30">
                {isDragging ? 'Drop to upload' : 'Drag & drop PDF here'}
              </p>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`py-4 skeuo-btn-amber rounded-2xl text-base font-black w-full ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full" />
                  Processing…
                </span>
              ) : 'Choose PDF File'}
            </motion.div>
          </label>
        </motion.div>
      </div>
    )
  }

  /* ── Main Layout ─────────────────────────────────────────────────── */
  return (
    <div className={`fixed inset-x-0 bottom-0 top-[72px] sm:top-[88px] lg:static lg:h-[calc(100dvh-85px)] flex flex-col px-2 pt-2 pb-5 gap-4 overflow-hidden ${isFullscreen ? 'z-[100]' : 'z-10'}`}>
      {/* Main split view */}
      <div className="flex-1 flex gap-3 p-1.5 min-h-0 overflow-visible relative">

        {/* LEFT: Chat */}
        <div
          className="flex flex-col skeuo-card overflow-hidden rounded-[2rem] transition-all duration-300 h-full"
          style={{ width: showSources && !isMobile ? `${splitPos}%` : '100%' }}
        >
          <ChatPanel
            sessionId={sessionId}
            titleAccessory={
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={async () => {
                    clearChat();
                    clearChatChunks();
                    try {
                      const sr = await api.post('/papers/session', { paper_id: paperId || undefined });
                      setSessionId(sr.data.session_id);
                    } catch(e) {}
                  }}
                  className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all hover:text-amber-brand text-ink/60 dark:text-cream/50 whitespace-nowrap"
                  style={{ background: 'transparent' }}
                  title="Clear chat and start fresh"
                >
                  <RotateCcw size={12} className="inline mr-0.5" />Reset
                </button>
                <button
                  onClick={() => {
                    clearPaper();
                    clearChat();
                    clearChatChunks();
                  }}
                  className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all hover:text-red-400 text-ink/60 dark:text-cream/50 whitespace-nowrap"
                  style={{ background: 'transparent' }}
                  title="Clear paper and return to upload"
                >
                  <Trash2 size={12} className="inline mr-0.5" />Restart
                </button>
                <button
                  onClick={() => isMobile ? setIsFullscreen(true) : setShowSources(s => !s)}
                  style={{
                    background: 'var(--bg-skeuo)',
                    boxShadow: !isMobile && showSources
                      ? 'inset 2px 2px 4px var(--shadow-dark)'
                      : '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
                  }}
                  className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all text-ink/60 dark:text-cream/50 hover:text-amber-brand whitespace-nowrap"
                >
                  <Play size={10} className="inline mr-0.5" />Sources
                </button>
              </div>
            }
          />
        </div>

        {/* DESKTOP: Drag Handle + Inline Sources Panel */}
        {!isMobile && (
          <AnimatePresence>
            {showSources && (
              <>
                <motion.div
                  key="drag-handle"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-col items-center justify-center flex-shrink-0"
                >
                  <div
                    className="w-1.5 h-28 rounded-full cursor-col-resize transition-all hover:bg-amber-brand/20"
                    style={{
                      background: 'var(--bg-skeuo)',
                      boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 5px var(--shadow-light)',
                    }}
                    onMouseDown={e => {
                      const startX = e.clientX
                      const startSplit = splitPos
                      const onMove = me => {
                        const delta = me.clientX - startX
                        const parentW = e.target.parentElement.parentElement.offsetWidth
                        setSplitPos(Math.min(70, Math.max(30, startSplit + (delta / parentW) * 100)))
                      }
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove)
                        window.removeEventListener('mouseup', onUp)
                      }
                      window.addEventListener('mousemove', onMove)
                      window.addEventListener('mouseup', onUp)
                    }}
                  />
                </motion.div>

                <motion.div
                  key="sources-panel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col skeuo-card overflow-hidden rounded-[2rem] flex-1 min-w-0 h-full"
                >
                  {/* Panel Header — with page nav and maximize */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                    style={{
                      background: 'var(--shadow-dark)',
                      boxShadow: 'inset 0 2px 5px var(--shadow-dark), inset 0 -1px 2px var(--shadow-light)',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: chatChunks.length > 0
                          ? 'linear-gradient(145deg, #ffb833, #dd9520)'
                          : 'var(--bg-skeuo)',
                        boxShadow: chatChunks.length > 0
                          ? '2px 2px 5px var(--shadow-dark), -2px -2px 4px var(--shadow-light)'
                          : 'inset 2px 2px 4px var(--shadow-dark)',
                      }}
                    >
                      <BookOpen size={13} className={chatChunks.length > 0 ? 'text-ink' : 'text-ink/30 dark:text-cream/30'} />
                    </div>
                    <span className="text-xs font-mono font-bold text-ink/60 dark:text-cream/50 uppercase tracking-wider">
                      Sources
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      {computedChunkPages.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const idx = computedChunkPages.indexOf(focusPage)
                              if (idx > 0) setFocusPage(computedChunkPages[idx - 1])
                            }}
                            disabled={computedChunkPages.indexOf(focusPage) <= 0}
                            className="p-1 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 transition-colors disabled:opacity-30"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <span className="text-[10px] font-mono text-ink/40 dark:text-cream/40 min-w-[30px] text-center">
                            p.{focusPage}
                          </span>
                          <button
                            onClick={() => {
                              const idx = computedChunkPages.indexOf(focusPage)
                              if (idx < computedChunkPages.length - 1) setFocusPage(computedChunkPages[idx + 1])
                            }}
                            disabled={computedChunkPages.indexOf(focusPage) >= computedChunkPages.length - 1}
                            className="p-1 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 transition-colors disabled:opacity-30"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setIsFullscreen(true)}
                        className="p-1.5 rounded-lg transition-all text-ink/40 dark:text-cream/40 hover:text-amber-brand"
                        style={{
                          background: 'var(--bg-skeuo)',
                          boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
                        }}
                        title="Maximize"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </div>
                  <PdfHighlightPanel
                    paperId={paperId}
                    forceFullContent
                    isFullscreen={isFullscreen}
                    setIsFullscreen={setIsFullscreen}
                    focusPage={focusPage}
                    setFocusPage={setFocusPage}
                    chunkPages={computedChunkPages}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        )}

        {/* Mobile fullscreen overlay (desktop uses inline panel's own fullscreen) */}
        {isMobile && isFullscreen && (
          <PdfHighlightPanel
            paperId={paperId}
            forceFullContent
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            focusPage={focusPage}
            setFocusPage={setFocusPage}
            chunkPages={computedChunkPages}
          />
        )}
      </div>

    </div>
  )
}


