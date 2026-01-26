import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Home, ListTodo, Star, Settings, Menu, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// Lazy-loaded views for code splitting (reduces initial bundle size ~30-40%)
const DashboardView = lazy(() => import('./views/Dashboard'))
const SmartNowView = lazy(() => import('./views/SmartNow'))
const TimelineNowView = lazy(() => import('./views/TimelineNow'))
const SettingsView = lazy(() => import('./views/Settings'))

// Star sidebar loaded eagerly since it's always visible
import StarSidebar from './components/StarSidebar'

// Loading fallback component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-kj-primary animate-spin" />
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    </div>
  )
}

function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [health, setHealth] = useState(null)

  // Collapsible left nav state (saved to localStorage)
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('kj360-left-nav-collapsed')
    return saved === 'true'
  })

  // Star sidebar state (saved to localStorage)
  const [starOpen, setStarOpen] = useState(() => {
    const saved = localStorage.getItem('kj360-star-open')
    return saved === 'true'
  })
  const [starWidth, setStarWidth] = useState(() => {
    const saved = localStorage.getItem('kj360-star-width')
    return saved ? parseInt(saved) : 400
  })

  // Track if we're on desktop for sidebar margin
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Save preferences
  useEffect(() => {
    localStorage.setItem('kj360-left-nav-collapsed', leftNavCollapsed)
  }, [leftNavCollapsed])

  useEffect(() => {
    localStorage.setItem('kj360-star-open', starOpen)
  }, [starOpen])

  useEffect(() => {
    localStorage.setItem('kj360-star-width', starWidth)
  }, [starWidth])

  useEffect(() => {
    // Check API health on mount
    fetch('/api/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(err => setHealth({ status: 'error', message: err.message }))
  }, [])

  // Global keyboard shortcut for Star sidebar (Cmd/Ctrl + Shift + K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault()
        setStarOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/now', icon: ListTodo, label: 'Now' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-kj-surface flex">
        {/* Sidebar - Desktop (Collapsible) */}
        <aside
          className={`
            hidden md:flex flex-col bg-gray-900/50 border-r border-gray-800
            transition-all duration-300 ease-in-out
            ${leftNavCollapsed ? 'w-16' : 'w-64'}
          `}
        >
          <div className={`p-4 ${leftNavCollapsed ? 'px-2' : 'p-6'}`}>
            {leftNavCollapsed ? (
              <div className="flex justify-center">
                <span className="text-2xl">🌟</span>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-3xl">🌟</span> KJ360
                </h1>
                <p className="text-sm text-gray-400 mt-1">Life Command Center</p>
              </>
            )}
          </div>

          <nav className={`flex-1 ${leftNavCollapsed ? 'px-1' : 'px-4'}`}>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={leftNavCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                    leftNavCollapsed ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-kj-primary text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon size={20} />
                {!leftNavCollapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Collapse toggle + Health indicator */}
          <div className="p-2 border-t border-gray-800">
            <button
              onClick={() => setLeftNavCollapsed(!leftNavCollapsed)}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              title={leftNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {leftNavCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {!leftNavCollapsed && <span className="text-sm">Collapse</span>}
            </button>

            <div className={`flex items-center gap-2 text-sm mt-2 ${leftNavCollapsed ? 'justify-center' : 'px-2'}`}>
              <div className={`w-2 h-2 rounded-full ${
                health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {!leftNavCollapsed && (
                <span className="text-gray-400">
                  {health?.status === 'healthy' ? 'Connected' : 'Disconnected'}
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform md:hidden
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h1 className="text-xl font-bold text-white">🌟 KJ360</h1>
            <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-400">
              <X size={24} />
            </button>
          </div>
          <nav className="p-4">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 ${
                    isActive
                      ? 'bg-kj-primary text-white'
                      : 'text-gray-400'
                  }`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content - adjusts for sidebar on desktop (md+), overlays on mobile */}
        <main
          className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginRight: starOpen && isDesktop ? `${starWidth}px` : 0 }}
        >
          {/* Mobile header */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-800">
            <button onClick={() => setMobileSidebarOpen(true)} className="text-gray-400">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-white">KJ360</h1>
            <button
              onClick={() => setStarOpen(!starOpen)}
              className={`text-gray-400 ${starOpen ? 'text-kj-primary' : ''}`}
            >
              <Star size={24} fill={starOpen ? 'currentColor' : 'none'} />
            </button>
          </header>

          {/* Page content with Suspense for lazy-loaded views */}
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<DashboardView />} />
                <Route path="/now" element={<SmartNowView />} />
                <Route path="/timeline" element={<TimelineNowView />} />
                <Route path="/settings" element={<SettingsView />} />
              </Routes>
            </Suspense>
          </div>

          {/* Mobile bottom nav */}
          <nav className="md:hidden flex justify-around border-t border-gray-800 bg-gray-900 safe-area-inset-bottom">
            {navItems.slice(0, 3).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center py-3 px-4 ${
                    isActive ? 'text-kj-primary' : 'text-gray-500'
                  }`
                }
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{label}</span>
              </NavLink>
            ))}
          </nav>
        </main>

        {/* Star Sidebar - Claudian-style sliding panel */}
        <StarSidebar
          isOpen={starOpen}
          onToggle={() => setStarOpen(!starOpen)}
          width={starWidth}
          onWidthChange={setStarWidth}
        />
      </div>
    </BrowserRouter>
  )
}

export default App
