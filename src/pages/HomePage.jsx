import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Camera, ScanBarcode, ChevronRight, Leaf, ShieldCheck, TrendingUp, X, Loader2, User } from 'lucide-react'
import { searchProducts } from '../api'
import ScanModal from '../components/ScanModal'
import { useAuth } from '../contexts/AuthContext'
import { getUserStats, getRecentScans } from '../lib/firestore'

function ScoreRing({ score, size = 36 }) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={3} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

function ProductCard({ product, index, onClick }) {
  const hasImage = !!product.imageUrl

  return (
    <div
      className="break-inside-avoid mb-3 group fade-up cursor-pointer"
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={onClick}
    >
      <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100
                      hover:shadow-md transition-all duration-300 active:scale-[0.98]">
        <div className="relative">
          {hasImage ? (
            <img
              src={product.imageUrl}
              alt={product.productName}
              className="w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full aspect-[3/4] bg-gradient-to-br from-emerald-100 via-teal-50 to-green-100 flex items-center justify-center"
            >
              <Leaf className="w-10 h-10 text-emerald-300" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <ScoreRing score={product.score} />
          </div>
          <div className={`absolute top-2 left-2 ${product.badgeColor} px-2 py-0.5 rounded-full`}>
            <span className="text-[9px] font-bold text-white tracking-wider uppercase">
              {product.badge}
            </span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">{product.productName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
              {product.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signIn } = useAuth()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanTab, setScanTab] = useState('barcode')

  // Real data from Firestore
  const [stats, setStats] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [loadingScans, setLoadingScans] = useState(false)

  // Fetch user stats and recent scans when user changes
  useEffect(() => {
    if (!user) {
      setStats(null)
      setRecentScans([])
      return
    }

    let cancelled = false

    async function fetchData() {
      setLoadingScans(true)
      try {
        const [userStats, scans] = await Promise.all([
          getUserStats(user.uid),
          getRecentScans(user.uid, 6),
        ])
        if (!cancelled) {
          setStats(userStats)
          setRecentScans(scans)
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      } finally {
        if (!cancelled) setLoadingScans(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [user])

  // Handle search submission
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q) return

    // If it looks like a barcode (all digits, 8-13 chars), go straight to analysis
    if (/^\d{8,13}$/.test(q)) {
      navigate(`/result?barcode=${encodeURIComponent(q)}`)
      return
    }

    setSearching(true)
    try {
      const data = await searchProducts(q, 8)
      setSearchResults(data.products)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [searchQuery, navigate])

  const openScanner = (tab) => {
    setScanTab(tab)
    setScanOpen(true)
  }

  const statCards = [
    {
      icon: ShieldCheck,
      label: 'Products\nScanned',
      value: stats ? String(stats.scanCount) : '0',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Leaf,
      label: 'Ethical\nFinds',
      value: stats ? String(stats.ethicalFinds) : '0',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: TrendingUp,
      label: 'Impact\nScore',
      value: stats ? stats.impactGrade : '--',
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ]

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-40 glass">
        <div className="px-5 pt-[env(safe-area-inset-top,12px)]">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600
                              flex items-center justify-center shadow-sm">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-display font-bold text-gray-900 tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                EthicLens
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openScanner('barcode')}
                className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center
                               hover:bg-gray-100 transition-colors">
                <ScanBarcode className="w-4.5 h-4.5 text-gray-600" strokeWidth={1.8} />
              </button>
              {user ? (
                <button
                  onClick={() => navigate('/profile')}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-400 flex-shrink-0"
                >
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ) : (
                <button
                  onClick={signIn}
                  className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center
                                 hover:bg-gray-100 transition-colors"
                >
                  <User className="w-4.5 h-4.5 text-gray-600" strokeWidth={1.8} />
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className={`relative mb-3 transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch() }}>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300
                ${searchFocused
                  ? 'border-emerald-400 bg-white shadow-lg shadow-emerald-500/10'
                  : 'border-gray-200 bg-gray-50'
                }`}>
                <Search className={`w-4 h-4 transition-colors ${searchFocused ? 'text-emerald-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search products, brands, or scan barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                />
                {searching && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />}
                {searchQuery && !searching && (
                  <button type="button" onClick={() => { setSearchQuery(''); setSearchResults(null) }}>
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </form>

            {/* Search Results Dropdown */}
            {searchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">No products found</p>
                    <button
                      onClick={() => navigate(`/result?name=${encodeURIComponent(searchQuery)}`)}
                      className="text-xs text-emerald-600 font-medium mt-1"
                    >
                      Analyze "{searchQuery}" with AI instead
                    </button>
                  </div>
                ) : (
                  <>
                    {searchResults.map((p) => (
                      <button
                        key={p.barcode}
                        onClick={() => {
                          setSearchResults(null)
                          setSearchQuery('')
                          navigate(`/result?barcode=${p.barcode}`)
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Leaf className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{p.brand}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </button>
                    ))}
                    <button
                      onClick={() => navigate(`/result?name=${encodeURIComponent(searchQuery)}`)}
                      className="w-full p-3 text-center text-xs text-emerald-600 font-medium hover:bg-emerald-50 transition-colors"
                    >
                      Analyze "{searchQuery}" with AI
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-2">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-2xl p-3 flex flex-col items-center gap-1.5 fade-up`}
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.8} />
              <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
              <span className="text-[10px] text-gray-500 text-center leading-tight whitespace-pre-line">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scan CTA */}
      <div className="px-5 mb-4 fade-up fade-up-delay-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative z-10">
            <h2 className="text-white font-semibold text-base mb-1">Scan a Product</h2>
            <p className="text-emerald-100 text-xs leading-relaxed mb-3">
              Point your camera at any product to instantly check its ethical sourcing and supply chain transparency.
            </p>
            <button
              onClick={() => openScanner('camera')}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm
                             text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all
                             active:scale-95">
              <Camera className="w-4 h-4" />
              Open Camera
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Searches */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Searches</h2>
          {recentScans.length > 0 && (
            <button className="text-xs text-emerald-600 font-medium">See All</button>
          )}
        </div>

        {loadingScans ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : recentScans.length > 0 ? (
          /* Masonry Grid */
          <div className="columns-2 gap-3">
            {recentScans.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => navigate(`/result?name=${encodeURIComponent(product.productName)}&brand=${encodeURIComponent(product.brand)}`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Search className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              Scan your first product to see results here
            </p>
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-8" />

      <ScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        defaultTab={scanTab}
      />
    </div>
  )
}
