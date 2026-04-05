import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, ExternalLink, Sparkles, AlertCircle, CheckCircle2
} from 'lucide-react'
import { fetchArticleSummary } from '../api'

export default function ArticlePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const url = searchParams.get('url')
  const title = searchParams.get('title') || 'Article'
  const source = searchParams.get('source') || ''

  useEffect(() => {
    if (!url) {
      setError('No article URL provided')
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchArticleSummary(url)
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [url])

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600
                        flex items-center justify-center shadow-lg animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Summarizing article...</span>
        </div>
        <p className="text-xs text-gray-400 text-center max-w-[250px]">
          AI is reading and analyzing the article for you
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-40 glass">
        <div className="px-5 pt-[env(safe-area-inset-top,12px)]">
          <div className="flex items-center gap-3 py-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-sm font-medium text-gray-500 truncate flex-1">
              {source}
            </h1>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {decodeURIComponent(title)}
        </h1>

        {source && (
          <p className="text-xs text-gray-500 mb-4">
            Source: {decodeURIComponent(source)}
          </p>
        )}

        {error ? (
          <div className="bg-red-50 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">Could not load article</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* AI Summary Card */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100 mb-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                  AI Summary
                </span>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {data.summary}
              </div>
            </div>

            {/* Key Points */}
            {data.key_points && data.key_points.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Takeaways</h3>
                <div className="space-y-2.5">
                  {data.key_points.map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Read Full Article CTA */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-500
                         to-emerald-600 text-white text-sm font-semibold rounded-xl shadow-sm
                         active:scale-[0.98] transition-all"
            >
              Read Full Article
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Disclaimer */}
            <div className="mt-4 bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 text-center">
                This summary was generated by AI and may not capture all nuances.
                Read the full article for complete details.
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="h-8" />
    </div>
  )
}
