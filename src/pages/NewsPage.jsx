import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, BookmarkPlus, Clock, Flame, ChevronRight, LogIn } from 'lucide-react'
import { fetchNews, fetchForYouNews } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { getUserScanProfile } from '../lib/firestore'

const categories = [
  { id: 'all', label: 'For You', emoji: '\u2728' },
  { id: 'food', label: 'Food', emoji: '\uD83C\uDF6B' },
  { id: 'fashion', label: 'Fashion', emoji: '\uD83D\uDC57' },
  { id: 'beauty', label: 'Beauty', emoji: '\uD83E\uDDF4' },
  { id: 'tech', label: 'Tech', emoji: '\uD83D\uDCF1' },
  { id: 'home', label: 'Home', emoji: '\uD83C\uDFE0' },
  { id: 'kids', label: 'Kids', emoji: '\uD83E\uDDF8' },
]

/**
 * Convert an ISO date string (or any parseable date) to a human-friendly
 * relative time string like "2h ago", "3d ago", "just now", etc.
 */
function timeAgo(dateString) {
  if (!dateString) return ''
  const now = Date.now()
  const then = new Date(dateString).getTime()
  if (isNaN(then)) return ''

  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(months / 12)
  return `${years}y ago`
}

/* ------------------------------------------------------------------ */
/*  Skeleton placeholders                                              */
/* ------------------------------------------------------------------ */

function FeaturedSkeleton() {
  return (
    <div className="relative rounded-3xl overflow-hidden mx-5 mb-5 bg-gray-200 h-56 animate-pulse">
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-3 w-20 bg-gray-300 rounded-full" />
        <div className="h-4 w-3/4 bg-gray-300 rounded" />
        <div className="h-4 w-1/2 bg-gray-300 rounded" />
        <div className="h-3 w-28 bg-gray-300 rounded-full" />
      </div>
    </div>
  )
}

function ArticleSkeleton({ index }) {
  return (
    <div
      className="flex gap-3 px-5 py-3"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="w-24 h-24 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-gray-200 animate-pulse rounded-full" />
          <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="h-3 w-20 bg-gray-200 animate-pulse rounded-full" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Article cards                                                      */
/* ------------------------------------------------------------------ */

function FeaturedCard({ article, onClick }) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden mx-5 mb-5 fade-up fade-up-delay-1 cursor-pointer
                 active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      <img
        src={article.image_url || ''}
        alt=""
        className="w-full h-56 object-cover bg-gray-100"
        onError={(e) => { e.target.style.display = 'none' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center gap-2 mb-2">
          {article.source && (
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20
                           backdrop-blur-sm px-2 py-0.5 rounded-full">
              {article.source}
            </span>
          )}
        </div>
        <h3 className="text-white font-semibold text-base leading-snug mb-2">
          {article.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-[11px]">{article.source}</span>
            <span className="text-gray-500 text-[11px]">-</span>
            <span className="text-gray-400 text-[11px] flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {timeAgo(article.published)}
            </span>
          </div>
          <button
            className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <BookmarkPlus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ArticleCard({ article, index, onClick }) {
  return (
    <div
      className="flex gap-3 px-5 py-3 active:bg-gray-50 transition-colors fade-up cursor-pointer"
      style={{ animationDelay: `${0.15 + index * 0.08}s` }}
      onClick={onClick}
    >
      {article.image_url ? (
        <img
          src={article.image_url}
          alt=""
          className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 bg-gray-100"
          onError={(e) => {
            e.target.src = ''
            e.target.classList.add('bg-gray-200')
          }}
        />
      ) : (
        <div className="w-24 h-24 rounded-2xl bg-gray-100 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {article.source && (
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {article.source}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {article.title}
          </h3>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(article.published)}
          </span>
          <button
            className="p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <BookmarkPlus className="w-4 h-4 text-gray-300 hover:text-emerald-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sign-in prompt for "For You" when logged out                       */
/* ------------------------------------------------------------------ */

function SignInPrompt({ onSignIn }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <LogIn className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Personalized for you
      </h3>
      <p className="text-sm text-gray-500 mb-5 max-w-xs">
        Sign in to get news recommendations based on the products you scan.
      </p>
      <button
        onClick={onSignIn}
        className="px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-medium
                   shadow-md shadow-emerald-500/25 active:scale-95 transition-transform"
      >
        Sign in with Google
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const navigate = useNavigate()
  const { user, signIn } = useAuth()

  /* ---- fetch articles whenever category changes ---- */
  const loadArticles = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let data

      if (activeCategory === 'all') {
        // "For You" — requires auth
        if (!user) {
          setArticles([])
          setLoading(false)
          return
        }
        const profile = await getUserScanProfile(user.uid)
        if (profile.materials.length || profile.categories.length) {
          data = await fetchForYouNews(profile.materials, profile.categories)
        } else {
          // No scan history yet, fall back to general news
          data = await fetchNews('all')
        }
      } else {
        data = await fetchNews(activeCategory)
      }

      setArticles(data.articles ?? data ?? [])
    } catch (err) {
      console.error('Failed to load news:', err)
      setError('Could not load articles. Pull down to try again.')
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [activeCategory, user])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  /* ---- navigate to article detail ---- */
  const openArticle = (article) => {
    const params = new URLSearchParams({
      url: article.link,
      title: article.title,
      source: article.source || '',
    })
    navigate(`/news/article?${params.toString()}`)
  }

  /* ---- derive featured + rest + trending ---- */
  const featured = articles.length > 0 ? articles[0] : null
  const rest = articles.slice(1)

  // Build trending labels from the first few unique sources / categories
  const trendingLabels = []
  const seen = new Set()
  for (const a of articles) {
    const label = a.source
    if (label && !seen.has(label)) {
      seen.add(label)
      trendingLabels.push(label)
      if (trendingLabels.length >= 3) break
    }
  }

  /* ---- show sign-in prompt for "For You" when logged out ---- */
  const showSignIn = activeCategory === 'all' && !user && !loading

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-40 glass">
        <div className="px-5 pt-[env(safe-area-inset-top,12px)]">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600
                              flex items-center justify-center shadow-sm">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Discover
              </h1>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div
          ref={scrollRef}
          className="flex gap-2 px-5 pb-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium
                         whitespace-nowrap transition-all duration-300 flex-shrink-0
                ${activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sign-in prompt (For You while logged out) */}
      {showSignIn && <SignInPrompt onSignIn={signIn} />}

      {/* Error banner */}
      {error && !loading && (
        <div className="mx-5 my-4 p-4 rounded-2xl bg-red-50 text-sm text-red-600 text-center">
          {error}
          <button
            onClick={loadArticles}
            className="block mx-auto mt-2 text-xs font-semibold text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <>
          <div className="px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-28 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
          <FeaturedSkeleton />
          <div className="mb-4">
            <div className="flex items-center justify-between px-5 mb-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            {[0, 1, 2, 3].map((i) => (
              <ArticleSkeleton key={i} index={i} />
            ))}
          </div>
        </>
      )}

      {/* Content (only when not loading and not showing sign-in) */}
      {!loading && !showSignIn && !error && (
        <>
          {/* Trending Strip */}
          {trendingLabels.length > 0 && (
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-900 flex-shrink-0">Trending:</span>
                {trendingLabels.map((label, i) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50
                             text-[11px] font-medium text-orange-700 whitespace-nowrap flex-shrink-0"
                  >
                    {i === 0 && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Featured Article */}
          {featured && (
            <FeaturedCard article={featured} onClick={() => openArticle(featured)} />
          )}

          {/* Article List */}
          {rest.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-5 mb-1">
                <h2 className="text-sm font-semibold text-gray-900">Latest Stories</h2>
              </div>
              {rest.map((article, index) => (
                <ArticleCard
                  key={article.link || index}
                  article={article}
                  index={index}
                  onClick={() => openArticle(article)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {articles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <p className="text-sm text-gray-400">No articles found for this category.</p>
              <button
                onClick={loadArticles}
                className="mt-3 text-xs font-semibold text-emerald-600 underline"
              >
                Try again
              </button>
            </div>
          )}
        </>
      )}

      <div className="h-8" />
    </div>
  )
}
