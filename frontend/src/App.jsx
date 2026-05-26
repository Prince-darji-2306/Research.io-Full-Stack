import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Search from './pages/Search'
import Workspace from './pages/Workspace'
import Arena from './pages/Arena'

function App() {
  const { theme } = useAppStore()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Physical Surface Background */}
      <div className="fixed inset-0 -z-10 bg-surface-skeuo transition-colors duration-500" />
      
      <div className="flex flex-col min-h-[100dvh] text-ink dark:text-cream transition-colors duration-300">
        <Navbar />
        <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto min-h-0">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/search" element={<Search />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/arena" element={<Arena />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
