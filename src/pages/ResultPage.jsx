import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Leaf, ShieldCheck, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, Globe, Baby, Link2, Sparkles
} from 'lucide-react'
import { analyzeProduct } from '../api'

function ScoreRing({ score, size = 80 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

function ScoreBar({ label, value, weight, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-700 font-medium">{label}</span>
        <span className="text-xs text-gray-500">{value.toFixed(0)}/100 <span className="text-gray-400">({weight}%)</span></span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function MaterialCard({ material }) {
  const [expanded, setExpanded] = useState(false)
  const riskColor = material.risk_level === 'critical' ? 'text-red-600 bg-red-50'
    : material.risk_level === 'high' ? 'text-orange-600 bg-orange-50'
    : material.risk_level === 'medium' ? 'text-amber-600 bg-amber-50'
    : material.risk_level === 'unknown' ? 'text-gray-500 bg-gray-50'
    : 'text-green-600 bg-green-50'

  const riskDot = material.risk_level === 'critical' ? 'bg-red-500'
    : material.risk_level === 'high' ? 'bg-orange-500'
    : material.risk_level === 'medium' ? 'bg-amber-500'
    : material.risk_level === 'unknown' ? 'bg-gray-400'
    : 'bg-green-500'

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${riskDot}`} />
          <div>
            <span className="text-sm font-medium text-gray-900 capitalize">{material.material}</span>
            {material.commodity && material.commodity !== material.material && (
              <span className="text-[10px] text-gray-400 ml-1.5">({material.commodity})</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${riskColor}`}>
            {material.risk_level}
          </span>
          {material.countries.length > 0 && (
            expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && material.countries.length > 0 && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-50">
          <div className="flex items-center gap-1 mb-2 pt-2">
            {material.has_child_labor && (
              <span className="text-[9px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Baby className="w-2.5 h-2.5" /> Child Labor
              </span>
            )}
            {material.has_forced_labor && (
              <span className="text-[9px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Link2 className="w-2.5 h-2.5" /> Forced Labor
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {material.countries.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-700">{c.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {c.risk_types.map(t => (
                    <span key={t} className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                      t === 'FL' ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {t === 'CL' ? 'Child Labor' : 'Forced Labor'}
                    </span>
                  ))}
                  <span className="text-gray-400 ml-1">
                    {'!'.repeat(c.severity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const barcode = searchParams.get('barcode')
  const productName = searchParams.get('name')
  const brand = searchParams.get('brand')

  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true)
      setError(null)
      try {
        const data = await analyzeProduct({
          barcode: barcode || undefined,
          product_name: productName || undefined,
          brand: brand || undefined,
        })
        setResult(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalysis()
  }, [barcode, productName, brand])

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600
                        flex items-center justify-center shadow-lg animate-pulse">
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Analyzing supply chain...</span>
        </div>
        <p className="text-xs text-gray-400 text-center max-w-[250px]">
          Checking materials, labor risks, and brand transparency
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-5">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-sm text-gray-700 text-center">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-emerald-600 font-medium"
        >
          Go Back
        </button>
      </div>
    )
  }

  const r = result
  const score = r.ethic_score

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-40 glass">
        <div className="px-5 pt-[env(safe-area-inset-top,12px)]">
          <div className="flex items-center gap-3 py-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Analysis
            </h1>
          </div>
        </div>
      </div>

      {/* Product Header */}
      <div className="px-5 py-4">
        <div className="flex gap-4">
          {r.image_url ? (
            <img src={r.image_url} alt={r.product_name} className="w-20 h-20 rounded-2xl object-cover bg-gray-100" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Leaf className="w-8 h-8 text-gray-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">{r.product_name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{r.brand}</p>
            <span className="inline-block text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full mt-1.5">
              {r.category}
            </span>
          </div>
        </div>
      </div>

      {/* EthicScore Card */}
      <div className="px-5 mb-4">
        <div className={`rounded-3xl p-5 ${
          score.overall_score >= 75 ? 'bg-gradient-to-br from-emerald-600 to-teal-500'
          : score.overall_score >= 50 ? 'bg-gradient-to-br from-amber-500 to-orange-400'
          : 'bg-gradient-to-br from-red-600 to-rose-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs font-medium mb-1">EthicScore</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-white">{score.overall_score}</span>
                <span className="text-white/60 text-sm">/100</span>
              </div>
              <div className="mt-2">
                <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full">
                  {score.badge}
                </span>
              </div>
            </div>
            <ScoreRing score={Math.round(score.overall_score)} />
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="px-5 mb-4">
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">AI Analysis</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">{r.ai_summary}</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Score Breakdown</h3>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <ScoreBar label="Material Risk" value={score.material_risk_index} weight={40} color="bg-emerald-500" />
          <ScoreBar label="Brand Disclosure" value={score.brand_disclosure_score} weight={30} color="bg-teal-500" />
          <ScoreBar label="News Sentiment" value={score.news_sentiment_score} weight={20} color="bg-cyan-500" />
          <ScoreBar label="Community Data" value={score.community_score} weight={10} color="bg-green-500" />
        </div>
      </div>

      {/* Opacity Audit */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Transparency Audit</h3>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">Transparency Score</span>
            <span className={`text-sm font-bold ${
              r.opacity_audit.transparency_score >= 70 ? 'text-emerald-600'
              : r.opacity_audit.transparency_score >= 40 ? 'text-amber-600'
              : 'text-red-600'
            }`}>
              {r.opacity_audit.transparency_score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">{r.opacity_audit.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {r.opacity_audit.flags.map((flag, i) => (
              <span key={i} className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                {flag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Material Risks */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Supply Chain Materials
          <span className="text-xs text-gray-400 font-normal ml-1">({r.materials.length})</span>
        </h3>
        <div className="space-y-2">
          {r.materials.map((m, i) => (
            <MaterialCard key={i} material={m} />
          ))}
        </div>
        {r.materials.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No materials data available</p>
        )}
      </div>

      {/* Ingredients */}
      {r.ingredients.length > 0 && (
        <div className="px-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Ingredients</h3>
          <div className="flex flex-wrap gap-1.5">
            {r.ingredients.map((ing, i) => (
              <span key={i} className="text-[11px] text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data Sources */}
      <div className="px-5 mb-6">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 text-center">
            Data from Open Food Facts, US DOL ILAB, and AI analysis.
            Scores are estimates and may not reflect current conditions.
          </p>
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}
