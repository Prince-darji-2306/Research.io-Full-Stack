import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'

function Lightbox({ images, index, onClose, onPrev, onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="relative max-w-4xl max-h-[90vh] w-full"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={images[index].url}
          alt={images[index].caption}
          className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto block"
        />
        {images[index].caption && (
          <p className="text-center text-sm text-cream/70 font-mono mt-3 px-4">
            {images[index].caption}
          </p>
        )}
        <p className="text-center text-xs text-cream/40 font-mono mt-1">
          Page {images[index].page}
        </p>

        {/* Controls */}
        <button onClick={onClose} className="absolute top-2 right-2 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
          <X size={18} />
        </button>
        {index > 0 && (
          <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
            <ChevronLeft size={20} />
          </button>
        )}
        {index < images.length - 1 && (
          <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
            <ChevronRight size={20} />
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function FigureGallery({ images }) {
  const [lightboxIdx, setLightboxIdx] = useState(null)

  if (!images?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-ink/30 dark:text-cream/20">
        <ImageIcon size={32} strokeWidth={1} />
        <p className="mt-2 text-xs font-mono">No figures extracted</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="text-xs font-mono font-medium text-ink/50 dark:text-cream/40 uppercase tracking-wider mb-3">
        {images.length} Figure{images.length !== 1 ? 's' : ''} Extracted
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {images.map((img, i) => (
          <motion.div
            key={img.id || i}
            whileHover={{ scale: 1.03 }}
            className="relative rounded-lg overflow-hidden cursor-pointer border border-ink/10 dark:border-cream/10 group aspect-[4/3] bg-ink/5 dark:bg-surface-dark/50"
            onClick={() => setLightboxIdx(i)}
          >
            <img
              src={img.url}
              alt={img.caption || `Figure ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors flex items-end p-2">
              <p className="text-white text-[10px] font-mono leading-snug opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                {img.caption || `Figure ${i + 1}`}
              </p>
            </div>
            <div className="absolute top-1.5 right-1.5 text-[9px] font-mono bg-ink/60 text-cream px-1.5 py-0.5 rounded">
              p.{img.page}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            images={images}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onPrev={() => setLightboxIdx(i => Math.max(i - 1, 0))}
            onNext={() => setLightboxIdx(i => Math.min(i + 1, images.length - 1))}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
