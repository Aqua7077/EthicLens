import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Leaf, ShieldCheck, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, Globe, Baby, Link2, Sparkles,
  ArrowRight, Star, Calculator, CheckCircle2, XCircle,
  ChevronRight, Info, Gauge
} from 'lucide-react'
import { analyzeProduct } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { saveScanResult } from '../lib/firestore'

// In-memory cache so back navigation doesn't re-trigger analysis
const analysisCache = new Map()

function getCacheKey(barcode, name, brand) {
  return `${barcode || ''}|${name || ''}|${brand || ''}`
}

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

/* ---- Score Breakdown Panel ---- */

function BreakdownPanel({ trace, onClose }) {
  if (!trace) return null
  const { components, formula_display, confidence_score, confidence_factors } = trace
  const sc = components.supply_chain_risk
  const mit = components.mitigation_score
  const cont = components.controversy_score

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[430px] max-h-[90vh] bg-white rounded-t-3xl overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-violet-600" />
            <h2 className="text-base font-bold text-gray-900">Score Calculation Breakdown</h2>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Every number is traceable. No hidden calculations.</p>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* Step 1: Materials Identified */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">1</span>
              <h3 className="text-sm font-semibold text-gray-900">Materials Identified</h3>
            </div>
            {sc.materials.length > 0 ? (
              <div className="space-y-2">
                {sc.materials.map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-900 capitalize">{m.name}</span>
                      <span className="text-[10px] text-gray-400">Weight: {(m.material_weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-white rounded-lg p-2">
                        <span className="text-gray-400 block">Material Risk</span>
                        <span className="text-gray-900 font-bold">{(m.material_risk.value * 100).toFixed(1)}%</span>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <span className="text-gray-400 block">DOL Listed</span>
                        <span className={`font-bold ${m.material_risk.breakdown.dol_score > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {m.material_risk.breakdown.dol_score > 0 ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">No tracked materials identified</p>
            )}
          </section>

          {/* Step 2: Country Risk */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">2</span>
              <h3 className="text-sm font-semibold text-gray-900">Country Risk</h3>
            </div>
            {sc.materials.filter(m => m.country_risk.countries.length > 0).length > 0 ? (
              <div className="space-y-2">
                {sc.materials.filter(m => m.country_risk.countries.length > 0).map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <span className="text-xs font-semibold text-gray-900 capitalize block mb-2">{m.name}</span>
                    <div className="space-y-1">
                      {m.country_risk.countries.map((c, ci) => (
                        <div key={ci} className="flex items-center justify-between text-[10px] bg-white rounded-lg px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Base: {(c.base_score * 100).toFixed(0)}%</span>
                            {c.ilab_adjustment > 0 && (
                              <span className="text-red-500">+{(c.ilab_adjustment * 100).toFixed(0)}% iLab</span>
                            )}
                            <span className="font-bold text-gray-900">{(c.final_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">No country-specific data available</p>
            )}
          </section>

          {/* Step 3: Supply Chain Formula */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">3</span>
              <h3 className="text-sm font-semibold text-gray-900">Supply Chain Risk</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              {sc.materials.length > 0 && (
                <div className="space-y-1 mb-2">
                  {sc.materials.map((m, i) => (
                    <div key={i} className="text-[10px] text-gray-600 font-mono">
                      {m.name}: {m.material_weight.toFixed(2)} x {m.material_risk.value.toFixed(2)} x {m.stage_weight.toFixed(1)} = {m.contribution.toFixed(4)}
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs font-bold text-gray-900 bg-white rounded-lg p-2 text-center">
                Supply Chain Risk = {(sc.value * 100).toFixed(1)}%
              </div>
            </div>
          </section>

          {/* Step 4: Mitigation */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">4</span>
              <h3 className="text-sm font-semibold text-gray-900">Mitigation Factors</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {[
                { label: 'Public Supplier List', value: mit.factors.supplier_list },
                { label: 'Third-party Certifications', value: mit.factors.certifications },
                { label: 'ESG / Sustainability Report', value: mit.factors.esg_report },
                { label: 'Supply Chain Traceability', value: mit.factors.traceability },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{f.label}</span>
                  {f.value ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              ))}
              <div className="text-xs font-bold text-gray-900 bg-white rounded-lg p-2 text-center mt-2">
                Mitigation Score = {(mit.value * 100).toFixed(0)}%
              </div>
            </div>
          </section>

          {/* Step 5: Controversy */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">5</span>
              <h3 className="text-sm font-semibold text-gray-900">Controversy Score</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">Controversy articles found</span>
                <span className="font-bold text-gray-900">{cont.article_count}</span>
              </div>
              <div className="text-xs font-bold text-gray-900 bg-white rounded-lg p-2 text-center">
                Controversy = {(cont.value * 100).toFixed(0)}%
              </div>
            </div>
          </section>

          {/* Step 6: Final Formula */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold flex items-center justify-center">6</span>
              <h3 className="text-sm font-semibold text-gray-900">Final Calculation</h3>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
              <div className="text-[11px] text-gray-600 font-mono leading-relaxed mb-3">
                <div>Final Risk = (Supply Chain x (1 - Mitigation)) + Controversy</div>
                <div className="mt-1 text-violet-700 font-bold">
                  = ({(sc.value).toFixed(4)} x (1 - {mit.value.toFixed(2)})) + {cont.value.toFixed(2)}
                </div>
                <div className="mt-1 text-violet-700 font-bold">
                  = {((sc.value * (1 - mit.value)) + cont.value).toFixed(4)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 mb-1">Score = (1 - Final Risk) x 100</div>
                <span className="text-2xl font-bold text-violet-700">{trace.final_score}</span>
                <span className="text-sm text-violet-400 ml-0.5">/100</span>
              </div>
            </div>
          </section>

          {/* Step 7: Confidence */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Confidence Level</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${confidence_score >= 0.7 ? 'bg-emerald-500' : confidence_score >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${confidence_score * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-900">{(confidence_score * 100).toFixed(0)}%</span>
              </div>
              <div className="space-y-1 text-[10px] text-gray-600">
                <div className="flex justify-between">
                  <span>Known ingredients</span>
                  <span className="font-medium">{(confidence_factors.known_ingredients * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Country data available</span>
                  <span className="font-medium">{(confidence_factors.country_data_available * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Company data available</span>
                  <span className="font-medium">{(confidence_factors.company_data_available * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Close button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 pb-[env(safe-area-inset-bottom,16px)]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold
                       active:scale-[0.98] transition-transform"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  )
}


export default function ResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const savedRef = useRef(false)

  const barcode = searchParams.get('barcode')
  const productName = searchParams.get('name')
  const brand = searchParams.get('brand')

  useEffect(() => {
    savedRef.current = false
    const cacheKey = getCacheKey(barcode, productName, brand)

    // Check cache first — prevents re-analysis on back navigation
    const cached = analysisCache.get(cacheKey)
    if (cached) {
      setResult(cached)
      setLoading(false)
      return
    }

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

        // Cache the result
        analysisCache.set(cacheKey, data)

        // Save to Firestore if user is logged in
        if (user && !savedRef.current) {
          savedRef.current = true
          saveScanResult(user.uid, data).catch(err =>
            console.warn('Failed to save scan:', err)
          )
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalysis()
  }, [barcode, productName, brand, user])

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
          onClick={() => navigate('/')}
          className="text-sm text-emerald-600 font-medium"
        >
          Go Home
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
            <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
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
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full">
                  {score.badge}
                </span>
                {r.score_trace && (
                  <span className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {(r.score_trace.confidence_score * 100).toFixed(0)}% confidence
                  </span>
                )}
              </div>
            </div>
            <ScoreRing score={Math.round(score.overall_score)} />
          </div>
        </div>
      </div>

      {/* See How Score Was Calculated button */}
      {r.score_trace && (
        <div className="px-5 mb-4">
          <button
            onClick={() => setShowBreakdown(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-violet-200 bg-violet-50
                       active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Calculator className="w-5 h-5 text-violet-600" />
              <div className="text-left">
                <span className="text-sm font-semibold text-violet-900 block">See How This Score Was Calculated</span>
                <span className="text-[10px] text-violet-500">Step-by-step breakdown with full formula</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-violet-400" />
          </button>
        </div>
      )}

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

      {/* Natural Language Explanation */}
      {r.natural_language_explanation && (
        <div className="px-5 mb-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">In Plain English</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{r.natural_language_explanation}</p>
          </div>
        </div>
      )}

      {/* Score Breakdown Bars */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Score Breakdown</h3>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <ScoreBar label="Material Risk" value={score.material_risk_index} weight={40} color="bg-emerald-500" />
          <ScoreBar label="Brand Disclosure" value={score.brand_disclosure_score} weight={30} color="bg-teal-500" />
          <ScoreBar label="News Sentiment" value={score.news_sentiment_score} weight={20} color="bg-cyan-500" />
          <ScoreBar label="Mitigation" value={score.community_score} weight={10} color="bg-green-500" />
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

      {/* Ethical Alternatives */}
      {r.alternatives && r.alternatives.length > 0 && (
        <div className="px-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-emerald-500" />
              Better Alternatives
            </span>
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {r.alternatives.map((alt, i) => (
              <button
                key={i}
                onClick={() => navigate(`/result?name=${encodeURIComponent(alt.name)}&brand=${encodeURIComponent(alt.brand)}`)}
                className="flex-shrink-0 w-[200px] bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl
                           p-4 border border-emerald-100 text-left active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ~{alt.estimated_score}/100
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 leading-tight">{alt.name}</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">{alt.brand}</p>
                <p className="text-[10px] text-emerald-700 mt-2 leading-relaxed">{alt.reason}</p>
              </button>
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

      {/* Score Breakdown Modal */}
      {showBreakdown && (
        <BreakdownPanel
          trace={r.score_trace}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </div>
  )
}
