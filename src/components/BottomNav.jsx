import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Newspaper, Info, Camera } from 'lucide-react'
import ScanModal from './ScanModal'

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/news', icon: Newspaper, label: 'News' },
  { path: '/about', icon: Info, label: 'About' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [scanOpen, setScanOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
        {/* Floating camera button */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => setScanOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600
                       flex items-center justify-center shadow-lg shadow-emerald-500/30
                       pulse-glow active:scale-95 transition-transform"
          >
            <Camera className="w-6 h-6 text-white" strokeWidth={2} />
          </button>
        </div>

        <div className="glass border-t border-gray-100/80 px-2 pb-[env(safe-area-inset-bottom,8px)]">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all duration-300
                    ${isActive
                      ? 'text-emerald-600'
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <ScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        defaultTab="camera"
      />
    </>
  )
}
