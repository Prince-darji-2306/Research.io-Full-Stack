import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, RotateCw
} from 'lucide-react'
import { API_BASE_URL } from '../utils/api'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Use a more reliable CDN for the PDF worker (UNPKG)
// For PDF.js v4+, the worker is often provided as an .mjs module
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export default function PdfViewer({ paperId }) {
  const [numPages, setNumPages] = useState(null)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const pdfUrl = `${API_BASE_URL}/papers/${paperId}/pdf`

  const onDocLoaded = ({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
  }

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 2.5))
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink/10 dark:border-cream/10 flex-shrink-0 gap-2">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-mono text-ink/60 dark:text-cream/50 min-w-[80px] text-center">
            {loading ? '—' : `${page} / ${numPages}`}
          </span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, numPages || p))}
            disabled={!numPages || page >= numPages}
            className="p-1.5 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 transition-colors">
            <ZoomOut size={14} />
          </button>
          <span className="text-xs font-mono text-ink/50 dark:text-cream/40 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-ink/10 dark:hover:bg-cream/10 transition-colors">
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Download */}
        <a
          href={pdfUrl}
          download={`paper-${paperId}.pdf`}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-brand/15 text-amber-brand border border-amber-brand/30 hover:bg-amber-brand/25 transition-colors"
        >
          <Download size={12} />
          Download
        </a>
      </div>

      {/* PDF Render */}
      <div className="flex-1 overflow-auto bg-ink/5 dark:bg-surface-dark/50 flex justify-center py-4">
        <AnimatePresence mode="wait">
          {!paperId ? (
            <motion.div
              key="no-paper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-ink/30 dark:text-cream/20 text-sm font-mono"
            >
              No paper loaded
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm font-mono"
            >
              Failed to load PDF
            </motion.div>
          ) : (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pdf-page-wrapper shadow-2xl"
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocLoaded}
                onLoadError={() => setError(true)}
                loading={
                  <div className="flex items-center justify-center h-64 w-64">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                      className="w-8 h-8 border-2 border-amber-brand border-t-transparent rounded-full"
                    />
                  </div>
                }
              >
                <Page
                  pageNumber={page}
                  scale={scale}
                  renderTextLayer
                  renderAnnotationLayer
                />
              </Document>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
