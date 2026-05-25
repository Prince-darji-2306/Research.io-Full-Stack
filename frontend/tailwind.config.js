/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Playfair Display"', 'serif'],
      },
      colors: {
        // Retro-Modern palette
        ink: {
          DEFAULT: '#1a1a2e',
          light: '#2d2d44',
        },
        cream: {
          DEFAULT: '#f5f0e8',
          dark: '#e8dcc8',
          muted: '#d4c9b0',
        },
        amber: {
          brand: '#f5a623',
          dark: '#c47f00',
          glow: '#ffd166',
        },
        violet: {
          brand: '#7c3aed',
          light: '#a78bfa',
          dark: '#5b21b6',
        },
        surface: {
          dark: '#0a0a0a',
          card: '#111111',
          border: '#222222',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'text-shimmer': 'textShimmer 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'grain': 'grain 8s steps(10) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245,166,35,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245,166,35,0.6)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        textShimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-2%, -3%)' },
          '30%': { transform: 'translate(3%, -1%)' },
          '50%': { transform: 'translate(-1%, 3%)' },
          '70%': { transform: 'translate(2%, 1%)' },
          '90%': { transform: 'translate(-3%, 2%)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
