import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, Minimize2, X, BookOpen, ChevronUp, ChevronDown } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAppStore } from '../store/appStore'
import { API_BASE_URL } from '../utils/api'

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

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

/**
 * Fuzzy-ish text matching: normalize whitespace and check if chunk text
 * contains a substring of at least 15 chars from the PDF text token.
 */
function isHighlighted(str, chunkTexts) {
  if (!str || !chunkTexts.length) return false
  const normalised = str.replace(/\s+/g, ' ').trim().toLowerCase()
  for (const ct of chunkTexts) {
    const normChunk = ct.replace(/\s+/g, ' ').trim().toLowerCase()
    // Check both directions — PDF token in chunk, or chunk words in token
    if (normChunk.length > 10 && normalised.length > 6) {
      // sliding window: check if any 15-char window of normChunk appears in normalised
      const win = Math.min(25, Math.floor(normalised.length * 0.6))
      for (let i = 0; i <= normChunk.length - win; i += 8) {
        const slice = normChunk.slice(i, i + win)
        if (slice.length >= 12 && normalised.includes(slice)) return true
      }
    }
  }
  return false
}

/* ── Single page renderer with highlight ───────────────────────────── */
function HighlightPage({ paperId, pageNum, scale, chunkTexts, containerRef }) {
  const customTextRenderer = useCallback(
    ({ str }) => {
      if (isHighlighted(str, chunkTexts)) {
        return `<mark class="pdf-highlight-span">${str}</mark>`
      }
      return str
    },
    [chunkTexts]
  )

  return (
    <div className="mb-0" ref={pageNum === 1 ? containerRef : null}>
      <Page
        pageNumber={pageNum}
        scale={scale}
        customTextRenderer={customTextRenderer}
        renderTextLayer
        renderAnnotationLayer={false}
      />
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function PdfHighlightPanel({
  paperId,
  forceFullContent = false,
  isFullscreen,
  setIsFullscreen,
  focusPage,
  setFocusPage,
  chunkPages: externalChunkPages,
  onChunkPagesChange,
  onNumPagesChange,
}) {
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const chunks = useAppStore(s => s.chatChunks)
  const [numPages, setNumPages] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const scrollRef = useRef(null)

  // Internal state for standalone mode (when props not provided)
  const [internalFullscreen, setInternalFullscreen] = useState(false)
  const [internalFocusPage, setInternalFocusPage] = useState(1)

  const fs = isFullscreen !== undefined ? isFullscreen : internalFullscreen
  const setFs = setIsFullscreen || setInternalFullscreen
  const fp = focusPage !== undefined ? focusPage : internalFocusPage
  const setFp = setFocusPage || setInternalFocusPage

  useEffect(() => {
    if (fp && !loading) {
      const el = document.getElementById(`pdf-page-${fp}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [fp, loading])

  const pdfUrl = `${API_BASE_URL}/papers/${paperId}/pdf`

  // Extract unique pages from chunks, sorted
  const chunkPages = useMemo(() => {
    const pages = [...new Set(chunks.map(c => c.page).filter(p => p > 0))]
    return pages.sort((a, b) => a - b)
  }, [chunks])

  const chunkTexts = useMemo(() => chunks.map(c => c.text), [chunks])

  // forceFullContent → all pages; isFullscreen → all pages; else: relevant ±1
  const pagesToRender = useMemo(() => {
    if (!numPages) return []
    if (forceFullContent || isFullscreen) {
      return Array.from({ length: numPages }, (_, i) => i + 1)
    }
    if (!chunkPages.length) return [1]
    const relevant = new Set()
    chunkPages.forEach(p => {
      for (let d = -1; d <= 1; d++) {
        const pg = p + d
        if (pg >= 1 && pg <= numPages) relevant.add(pg)
      }
    })
    return [...relevant].sort((a, b) => a - b)
  }, [numPages, chunkPages, fs, forceFullContent])

  const onLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
    if (chunkPages.length) setFp(chunkPages[0])
    if (onNumPagesChange) onNumPagesChange(numPages)
    if (onChunkPagesChange) onChunkPagesChange(chunkPages)
  }

  const scale = fs ? (isMobile ? 0.85 : 1.2) : 0.65

  if (!paperId) return null


  const panel = (
    <div className="flex flex-col h-full highlight-panel">
      {/* Header — only in fullscreen mode */}
      {fs && (
        <div className="flex items-center gap-2 px-3 py-2.5 skeuo-inset-strip flex-shrink-0">
          <BookOpen size={12} className="text-amber-brand" />
          <span className="text-[11px] font-mono font-bold text-amber-brand uppercase tracking-wider flex-1">
            {chunks.length > 0 ? `${chunks.length} Referenced Sections` : 'Paper View'}
          </span>

          {/* Page navigation — through chunk-matched pages */}
          {chunkPages.length > 1 && (
            <div className="flex items-center gap-1 mr-1">
              <button
                onClick={() => {
                  const idx = chunkPages.indexOf(fp)
                  if (idx > 0) setFp(chunkPages[idx - 1])
                }}
                disabled={chunkPages.indexOf(fp) <= 0}
                className="p-1 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 transition-colors disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <span className="text-[10px] font-mono text-ink/40 dark:text-cream/40 min-w-[30px] text-center">
                p.{fp}
              </span>
              <button
                onClick={() => {
                  const idx = chunkPages.indexOf(fp)
                  if (idx < chunkPages.length - 1) setFp(chunkPages[idx + 1])
                }}
                disabled={chunkPages.indexOf(fp) >= chunkPages.length - 1}
                className="p-1 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 transition-colors disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          )}

          <button
            onClick={() => setFs(false)}
            className="p-1.5 rounded-lg transition-all text-ink/40 dark:text-cream/40 hover:text-amber-brand"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
            }}
            title="Minimize"
          >
            <Minimize2 size={12} />
          </button>
        </div>
      )}

      {/* PDF Pages (scrollable) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden py-0 px-1 flex flex-col items-center bg-ink/5 dark:bg-cream/5"
      >
        {error ? (
          <div className="text-xs font-mono text-red-400 mt-8">Failed to load PDF</div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={onLoadSuccess}
            onLoadError={() => setError(true)}
            loading={
              <div className="flex items-center justify-center h-48">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  className="w-7 h-7 border-2 border-amber-brand border-t-transparent rounded-full"
                />
              </div>
            }
          >
            {pagesToRender.map(pageNum => (
              <div
                key={pageNum}
                id={`pdf-page-${pageNum}`}
                className="relative"
              >
                <HighlightPage
                  paperId={paperId}
                  pageNum={pageNum}
                  scale={scale}
                  chunkTexts={chunkTexts}
                  containerRef={null}
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  )

  if (fs) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="w-full max-w-4xl h-[92vh] sm:h-[90vh] highlight-panel relative rounded-2xl sm:rounded-3xl"
          >
            {panel}
            <button
              onClick={() => setFs(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-ink/50 dark:text-cream/50 hover:text-red-400 transition-colors"
              style={{
                background: 'var(--bg-skeuo)',
                boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="h-full highlight-panel">
      {panel}
    </div>
  )
}
