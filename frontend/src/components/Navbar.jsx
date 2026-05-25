import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Layout, Sun, Moon, Swords, Sparkles, Menu, X } from 'lucide-react'
import { useAppStore } from '../store/appStore'

const NAV_LINKS = [
  { path: '/search', label: 'Search', icon: Search },
  { path: '/workspace', label: 'Workspace', icon: Layout },
  { path: '/arena', label: 'Arena', icon: Swords },
]

export default function Navbar() {
  const location = useLocation()
  const { theme, toggleTheme } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 px-3 sm:px-6 py-3 sm:py-4">
      <div className="max-w-7xl mx-auto skeuo-card rounded-2xl px-3 sm:px-6 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-brand flex items-center justify-center skeuo-btn-amber border-none"
          >
            <Sparkles size={16} className="text-ink sm:size-5" />
          </motion.div>
          <span className="font-display text-lg sm:text-2xl font-black tracking-tighter text-ink dark:text-cream">
            Research.io
          </span>
        </Link>

        {/* Nav Links — sliding pill animation (desktop) */}
        <div className="hidden md:flex items-center gap-1 relative p-1 rounded-2xl skeuo-inset-strip">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-5 py-2 text-sm font-bold rounded-xl flex items-center gap-2 z-10 transition-colors duration-200"
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    initial={false}
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'var(--bg-gradient-skeuo)',
                      boxShadow: '3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 transition-colors duration-200 ${
                  isActive
                    ? 'text-ink dark:text-cream'
                    : 'text-ink/40 dark:text-cream/30 hover:text-ink/70 dark:hover:text-cream/60'
                }`}>
                  <link.icon size={14} className="inline mr-1.5 -mt-0.5" />
                  {link.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Right side (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center skeuo-card border-none hover:shadow-lg text-ink dark:text-cream"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </motion.button>

          <Link to="/workspace">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 skeuo-btn-amber rounded-xl text-sm"
            >
              Get Started
            </motion.button>
          </Link>
        </div>

        {/* Hamburger (mobile) */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden p-2 rounded-xl skeuo-card border-none text-ink dark:text-cream"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="md:hidden mx-3 sm:mx-6 mt-2 skeuo-card rounded-2xl overflow-hidden origin-top"
          >
            <div className="p-2 flex flex-col gap-1">
              {/* Nav links */}
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      isActive ? 'text-ink dark:text-cream' : 'text-ink/50 dark:text-cream/40'
                    }`}
                    style={isActive ? {
                      background: 'var(--bg-gradient-skeuo)',
                      boxShadow: '3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)',
                    } : {}}
                  >
                    <link.icon size={16} />
                    {link.label}
                  </Link>
                )
              })}
              <hr className="skeuo-divider my-1" />
              {/* Theme toggle */}
              <button
                onClick={() => { toggleTheme(); setMenuOpen(false) }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-ink/50 dark:text-cream/40 hover:text-ink dark:hover:text-cream transition-colors"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              {/* Get Started */}
              <Link
                to="/workspace"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 mx-1 mb-1 rounded-xl skeuo-btn-amber text-sm font-black"
              >
                <Sparkles size={16} />
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
