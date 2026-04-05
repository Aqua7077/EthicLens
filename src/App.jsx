import { Routes, Route, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import NewsPage from './pages/NewsPage'
import AboutPage from './pages/AboutPage'
import ResultPage from './pages/ResultPage'
import ArticlePage from './pages/ArticlePage'

function App() {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/result') || location.pathname.startsWith('/news/article')

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
