import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import NewsPage from './pages/NewsPage'
import AboutPage from './pages/AboutPage'

function App() {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <div className="flex-1 pb-24">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}

export default App
