import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Upload, MessageSquare, Swords, ArrowRight, Sparkles, Brain, Layers } from 'lucide-react'
import { useRef } from 'react'

/* ── Magnetic hover wrapper ─────────────────────────────────────── */
function MagneticWrap({ children, strength = 20 }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 25 })
  const springY = useSpring(y, { stiffness: 300, damping: 25 })

  const handleMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set((e.clientX - cx) / rect.width * strength)
    y.set((e.clientY - cy) / rect.height * strength)
  }

  const handleLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  )
}

/* ── Geometric grid background ──────────────────────────────────── */
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04] dark:opacity-[0.03]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-ink dark:text-cream" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  )
}

/* ── Floating geometric shapes ──────────────────────────────────── */
function FloatingShapes() {
  const shapes = [
    { type: 'circle', size: 300, x: '-5%', y: '10%', delay: 0, dur: 20, color: '#f5a623' },
    { type: 'circle', size: 200, x: '85%', y: '5%', delay: 2, dur: 16, color: '#8b5cf6' },
    { type: 'square', size: 150, x: '70%', y: '60%', delay: 4, dur: 18, color: '#f5a623' },
    { type: 'circle', size: 100, x: '5%', y: '70%', delay: 1, dur: 14, color: '#8b5cf6' },
    { type: 'diamond', size: 80, x: '45%', y: '80%', delay: 3, dur: 22, color: '#f5a623' },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            opacity: 0.06,
          }}
          animate={{
            y: [0, -30, 10, -15, 0],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        >
          {s.type === 'circle' && (
            <div
              className="w-full h-full rounded-full"
              style={{ background: `radial-gradient(circle, ${s.color}, transparent 70%)` }}
            />
          )}
          {s.type === 'square' && (
            <div
              className="w-full h-full rounded-3xl"
              style={{ background: s.color }}
            />
          )}
          {s.type === 'diamond' && (
            <div
              className="w-full h-full"
              style={{
                background: s.color,
                transform: 'rotate(45deg)',
                borderRadius: 12,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ── Feature card with 3D tilt ──────────────────────────────────── */
function FeatureCard({ icon: Icon, number, title, desc, accent, delay, features }) {
  const ref = useRef(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springRX = useSpring(rotateX, { stiffness: 300, damping: 25 })
  const springRY = useSpring(rotateY, { stiffness: 300, damping: 25 })

  const handleMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    rotateX.set(y * -8)
    rotateY.set(x * 8)
  }

  const handleLeave = () => { rotateX.set(0); rotateY.set(0) }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ perspective: 800, rotateX: springRX, rotateY: springRY }}
      className="group relative rounded-[2rem] overflow-hidden cursor-default"
    >
        {/* Card body */}
        <div
          className="relative p-8 h-full"
          style={{
            background: 'var(--bg-skeuo)',
            boxShadow: `
              12px 12px 24px var(--shadow-dark),
              -12px -12px 24px var(--shadow-light),
              0 4px 12px rgba(0,0,0,0.08)
            `,
          }}
        >
        {/* Top accent glow */}
        <div
          className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />

        {/* Number + Icon row */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)',
              color: accent,
            }}
          >
            {number}
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)',
            }}
          >
            <Icon size={22} style={{ color: accent }} />
          </div>
        </div>

        <h3 className="font-display text-xl font-black mb-3 text-ink dark:text-cream">
          {title}
        </h3>
        <p className="text-sm text-ink/50 dark:text-cream/40 leading-relaxed font-medium mb-5">
          {desc}
        </p>

        {/* Feature tags */}
        <div className="flex flex-wrap gap-2">
          {features.map((tag, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold"
              style={{
                background: `${accent}12`,
                color: accent,
                boxShadow: `inset 1px 1px 2px ${accent}15`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main Landing Page ──────────────────────────────────────────── */
export default function Landing() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.95])

  const features = [
    {
      icon: Brain,
      number: '01',
      title: 'Intelligent Search',
      desc: 'Multi-source academic retrieval powered by AI agents that query arXiv, Semantic Scholar, Google Scholar, and Springer simultaneously. Ranked results with semantic similarity scoring for precision.',
      accent: '#f5a623',
      features: ['arXiv', 'Semantic Scholar', 'Google Scholar', 'Springer'],
    },
    {
      icon: Layers,
      number: '02',
      title: 'Smart Workspace',
      desc: 'Automatic PDF parsing, semantic chunking, and vector embedding — your papers indexed instantly. Chat with context-aware RAG responses, source citations, and real-time PDF text highlighting.',
      accent: '#8b5cf6',
      features: ['PyMuPDF', 'PDF Highlighting', 'SSE Streaming', 'Qdrant'],
    },
    {
      icon: Swords,
      number: '03',
      title: 'Debate Arena',
      desc: 'Two papers, one arena. AI agents engage in structured 8-round academic debates with methodology analysis, rebuttals, and automated verdicts. Restart with new perspectives for deeper insight.',
      accent: '#f5a623',
      features: ['8 Rounds', 'Multi-Agent', 'Structured Debate', 'Auto Verdict'],
    },
  ]

  return (
    <div className="relative overflow-hidden">

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[95vh] flex items-center justify-center px-6 pt-8 pb-16">

        <GridBackground />
        <FloatingShapes />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 55% 45% at 50% 35%, rgba(245,166,35,0.07) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-10 text-xs font-mono font-bold uppercase tracking-widest"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)',
              color: '#f5a623',
            }}
          >
            <Sparkles size={12} />
            AI-Powered Research Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.88] text-ink dark:text-cream mb-8"
          >
            Research
            <br />
            <span
              className="relative inline-block"
              style={{
                background: 'linear-gradient(135deg, #f5a623 0%, #dd9520 35%, #8b5cf6 70%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% 200%',
                animation: 'textShimmer 4s ease-in-out infinite',
              }}
            >
              Physicality.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-ink/50 dark:text-cream/40 max-w-xl mx-auto leading-relaxed font-medium mb-14"
          >
            The most tactile AI research companion ever built.
            Search, analyze, and debate papers with physical depth.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap gap-5 justify-center"
          >
            <Link to="/search">
              <MagneticWrap strength={15}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-2xl text-base font-black text-ink flex items-center gap-3 transition-all duration-200"
                  style={{
                    background: 'linear-gradient(145deg, #ffb833, #dd9520)',
                    boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light), inset 1px 1px 2px rgba(255,255,255,0.35)',
                  }}
                >
                  <Search size={18} />
                  Start Searching
                </motion.button>
              </MagneticWrap>
            </Link>

            <Link to="/workspace">
              <MagneticWrap strength={15}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-2xl text-base font-black flex items-center gap-3 transition-all duration-200"
                  style={{
                    background: 'var(--bg-skeuo)',
                    boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)',
                    color: 'inherit',
                  }}
                >
                  <Upload size={18} />
                  Workspace
                </motion.button>
              </MagneticWrap>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-16 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink/25 dark:text-cream/20">
              Scroll to explore
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-6 h-10 rounded-full border-2 border-ink/15 dark:border-cream/15 flex items-start justify-center pt-2"
            >
              <motion.div
                className="w-1.5 h-2.5 rounded-full bg-amber-brand/50"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FEATURES GRID                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[10px] font-mono font-bold uppercase tracking-widest"
              style={{
                background: 'var(--bg-skeuo)',
                boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)',
                color: '#8b5cf6',
              }}
            >
              <Layers size={11} />
              Core Capabilities
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-ink dark:text-cream mb-4">
              Built for Depth, Not Speed
            </h2>
            <p className="text-base text-ink/40 dark:text-cream/35 max-w-lg mx-auto font-medium">
              Every feature is designed for rigorous academic analysis, not surface-level summaries.
            </p>
          </motion.div>

          {/* Feature cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} delay={i * 0.12} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CTA SECTION                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          className="max-w-4xl mx-auto"
        >
          <div
            className="rounded-[3rem] p-12 sm:p-16 text-center relative overflow-hidden"
            style={{
              background: 'var(--bg-skeuo)',
              boxShadow: '14px 14px 28px var(--shadow-dark), -14px -14px 28px var(--shadow-light)',
            }}
          >
            {/* Decorative corner accents */}
            <div className="absolute top-6 left-6 w-12 h-12 rounded-xl opacity-10" style={{ background: '#f5a623' }} />
            <div className="absolute bottom-6 right-6 w-12 h-12 rounded-xl opacity-10" style={{ background: '#8b5cf6' }} />

            {/* Animated glow ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-5"
              style={{
                background: 'conic-gradient(from 0deg, #f5a623, #8b5cf6, #3b82f6, #f5a623)',
              }}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"
              style={{
                background: 'var(--bg-skeuo)',
                boxShadow: 'inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)',
              }}
            >
              <Sparkles size={36} className="text-amber-brand" />
            </motion.div>

            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-ink dark:text-cream mb-4">
              Ready to Dive In?
            </h2>
            <p className="text-base text-ink/45 dark:text-cream/35 max-w-md mx-auto mb-10 font-medium">
              Upload a paper, ask a question, or start a debate. Your research workspace awaits.
            </p>

            <Link to="/search">
              <MagneticWrap strength={15}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="px-12 py-4 rounded-2xl text-lg font-black flex items-center gap-3 mx-auto"
                  style={{
                    background: 'linear-gradient(145deg, #8a4bff, #7034d5)',
                    boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light), inset 1px 1px 2px rgba(255,255,255,0.2)',
                    color: '#fff',
                  }}
                >
                  Get Started
                  <ArrowRight size={20} />
                </motion.button>
              </MagneticWrap>
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
