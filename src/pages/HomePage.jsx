import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Camera, ScanBarcode, ChevronRight, Leaf, ShieldCheck, TrendingUp, X, Loader2 } from 'lucide-react'
import { triggerBarcodeScan, triggerCamera, onBarcodeResult } from '../appInventorBridge'
import { searchProducts } from '../api'

const recentSearches = [
  {
    id: 1,
    name: 'Organic Dark Chocolate',
    brand: 'Green & Black\'s',
    score: 82,
    badge: 'VERIFIED GREEN',
    badgeColor: 'bg-emerald-500',
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&h=400&fit=crop',
    category: 'Food',
  },
  {
    id: 2,
    name: 'Cotton T-Shirt',
    brand: 'H&M Conscious',
    score: 45,
    badge: 'MODERATE RISK',
    badgeColor: 'bg-amber-500',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=350&fit=crop',
    category: 'Clothing',
  },
  {
    id: 3,
    name: 'Fair Trade Coffee',
    brand: 'Equal Exchange',
    score: 91,
    badge: 'VERIFIED GREEN',
    badgeColor: 'bg-emerald-500',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=450&fit=crop',
    category: 'Food',
  },
  {
    id: 4,
    name: 'Running Shoes',
    brand: 'Nike Air',
    score: 38,
    badge: 'HIGH RISK',
    badgeColor: 'bg-red-500',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=350&fit=crop',
    category: 'Footwear',
  },
  {
    id: 5,
    name: 'Bamboo Toothbrush',
    brand: 'Brush with Bamboo',
    score: 95,
    badge: 'VERIFIED GREEN',
    badgeColor: 'bg-emerald-500',
    image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=300&h=380&fit=crop',
    category: 'Personal Care',
  },
  {
    id: 6,
    name: 'Palm Oil Soap',
    brand: 'Dr. Bronner\'s',
    score: 72,
    badge: 'MODERATE RISK',
    badgeColor: 'bg-amber-500',
    image: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=300&h=420&fit=crop',
    category: 'Personal Care',
  },
]

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
  return (
    <div
      className="break-inside-avoid mb-3 group fade-up cursor-pointer"
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={onClick}
    >
      <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100
                      hover:shadow-md transition-all duration-300 active:scale-[0.98]">
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-full object-cover"
            loading="lazy"
          />
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
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">{product.name}</h3>
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
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

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

  // Listen for barcode results from App Inventor bridge
  useEffect(() => {
    return onBarcodeResult((barcode) => {
      navigate(`/result?barcode=${encodeURIComponent(barcode)}`)
    })
  }, [navigate])

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
            <button
              onClick={triggerBarcodeScan}
              className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center
                             hover:bg-gray-100 transition-colors">
              <ScanBarcode className="w-4.5 h-4.5 text-gray-600" strokeWidth={1.8} />
            </button>
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
          {[
            { icon: ShieldCheck, label: 'Products\nScanned', value: '24', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Leaf, label: 'Ethical\nFinds', value: '16', color: 'text-green-600', bg: 'bg-green-50' },
            { icon: TrendingUp, label: 'Impact\nScore', value: 'A+', color: 'text-teal-600', bg: 'bg-teal-50' },
          ].map((stat, i) => (
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
              onClick={triggerCamera}
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
          <button className="text-xs text-emerald-600 font-medium">See All</button>
        </div>

        {/* Masonry Grid */}
        <div className="columns-2 gap-3">
          {recentSearches.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onClick={() => navigate(`/result?name=${encodeURIComponent(product.name)}&brand=${encodeURIComponent(product.brand)}`)}
            />
          ))}
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8" />
    </div>
  )
}
