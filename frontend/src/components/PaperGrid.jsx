import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Star, FileText, Swords, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ── Paper Card ──────────────────────────────────────────────────────── */
function PaperCard({ paper, isRecommended, onSelect, isLoading, loadingStage, onAddToArena, arenaSlot }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 transition-all duration-200 cursor-pointer group paper-card"
      onClick={() => !isLoading && onSelect(paper)}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div
          className="absolute -top-2.5 left-3 flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #ffb833, #dd9520)',
            boxShadow: '2px 2px 6px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
            color: '#1a1a1a',
          }}
        >
          <Star size={8} fill="currentColor" />
          AI Pick
        </div>
      )}

      {/* Title */}
      <h3 className="font-semibold text-sm leading-snug line-clamp-3 mt-1 text-ink dark:text-cream">
        {paper.title}
      </h3>

      {/* Score bar */}
      {paper.score !== undefined && (
        <div className="mt-2.5 space-y-1">
          <div
            className="h-2 w-full rounded-full"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(paper.score * 100).toFixed(0)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-2 rounded-full"
              style={{
                background: 'linear-gradient(to right, #f5a623, #ffb833)',
                boxShadow: '0 0 4px rgba(245,166,35,0.4)',
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-ink/40 dark:text-cream/40">
            {(paper.score * 100).toFixed(0)}% match
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2 items-center">
        {/* Select & Open */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            isLoading ? 'opacity-60' : ''
          }`}
          style={{
            background: 'var(--bg-gradient-skeuo-raised)',
            boxShadow: '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)',
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 flex-1">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-3 h-3 border border-current border-t-transparent rounded-full flex-shrink-0"
              />
              <span className="text-[10px] font-mono text-ink/50 dark:text-cream/50 truncate">
                {loadingStage || 'Processing...'}
              </span>
            </div>
          ) : (
            <>
              <FileText size={11} />
              Open in Workspace
            </>
          )}
        </motion.div>

        {/* External link */}
        <a
          href={paper.pdf_link || paper.pdf}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-2 rounded-xl transition-all text-ink/40 dark:text-cream/40 hover:text-amber-brand"
          style={{
            background: 'var(--bg-skeuo)',
            boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 5px var(--shadow-light)',
          }}
          title="Open PDF"
        >
          <ExternalLink size={12} />
        </a>

        {/* Add to Arena */}
        {onAddToArena && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={e => { e.stopPropagation(); onAddToArena(paper) }}
            className="px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all font-bold text-[11px]"
            style={{
              background: arenaSlot === 'A'
                ? 'linear-gradient(145deg, #ffb833, #dd9520)'
                : arenaSlot === 'B'
                ? 'linear-gradient(145deg, #8b5cf6, #7034d5)'
                : 'var(--bg-skeuo)',
              boxShadow: arenaSlot
                ? '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)'
                : '2px 2px 5px var(--shadow-dark), -2px -2px 5px var(--shadow-light)',
              color: arenaSlot === 'A' ? '#1a1a1a' : arenaSlot === 'B' ? '#fff' : 'inherit',
            }}
            title={arenaSlot ? `Queued in Slot ${arenaSlot}` : "Add to Arena"}
          >
            <Swords size={12} className={!arenaSlot ? "text-ink/40 dark:text-cream/40" : ""} />
            {arenaSlot ? `Slot ${arenaSlot}` : ''}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Paper Grid ──────────────────────────────────────────────────────── */
export default function PaperGrid({ recommended, others, onSelect, loadingPaperId, loadingPaperStage = '', onAddToArena, arenaPaperA, arenaPaperB, onStartDebate }) {
  if (!recommended && !others?.length) return null

  const filteredOthers = others?.filter(p => p.title !== recommended?.title) || []

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold text-amber-brand uppercase tracking-wider"
          style={{
            background: 'var(--bg-skeuo)',
            boxShadow: 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)',
          }}
        >
          Papers Found
        </div>
        <hr className="flex-1 skeuo-divider" />
        <span className="text-[10px] font-mono text-ink/30 dark:text-cream/25">
          {filteredOthers.length + (recommended ? 1 : 0)} results
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommended && (
          <PaperCard
            paper={recommended}
            isRecommended
            onSelect={onSelect}
            isLoading={loadingPaperId === (recommended.pdf_link || recommended.pdf)}
            loadingStage={loadingPaperStage}
            onAddToArena={onAddToArena}
            arenaSlot={
              arenaPaperA?.title === recommended.title ? 'A' :
              arenaPaperB?.title === recommended.title ? 'B' : null
            }
          />
        )}
        {filteredOthers.map((p, i) => (
          <PaperCard
            key={i}
            paper={p}
            isRecommended={false}
            onSelect={onSelect}
            isLoading={loadingPaperId === (p.pdf_link || p.pdf)}
            loadingStage={loadingPaperStage}
            onAddToArena={onAddToArena}
            arenaSlot={
              arenaPaperA?.title === p.title ? 'A' :
              arenaPaperB?.title === p.title ? 'B' : null
            }
          />
        ))}
      </div>

      {/* Let's Debate Button */}
      <AnimatePresence>
        {arenaPaperA && arenaPaperB && onStartDebate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex justify-center mt-8"
          >
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartDebate}
              className="px-8 py-3.5 skeuo-btn-amber rounded-2xl font-black text-sm flex items-center gap-2"
            >
              <Swords size={16} />
              Let's Debate
              <ArrowRight size={16} className="ml-1" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
