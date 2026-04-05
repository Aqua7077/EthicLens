import { Routes, Route, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import NewsPage from './pages/NewsPage'
import AboutPage from './pages/AboutPage'
import ResultPage from './pages/ResultPage'
import ArticlePage from './pages/ArticlePage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './contexts/AuthContext'
import { Leaf, Loader2 } from 'lucide-react'

function App() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const hideNav = location.pathname.startsWith('/result') || location.pathname.startsWith('/news/article')

  // Show loading spinner while auth initializes
  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600
                        flex items-center justify-center shadow-lg">
          <Leaf className="w-7 h-7 text-white" />
        </div>
        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <div className={`flex-1 ${hideNav ? '' : 'pb-24'}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/article" element={<ArticlePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  )
}

export default App
