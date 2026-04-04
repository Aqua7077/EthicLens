import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X, Camera, ScanBarcode, Keyboard, Loader2, AlertCircle,
  ChevronRight, Package, Search
} from 'lucide-react'
import { identifyImage } from '../api'

const CATEGORIES = [
  'Food', 'Clothing', 'Electronics', 'Personal Care',
  'Footwear', 'Home', 'Toys', 'Beauty', 'Other',
]

// ── Tab: Barcode Scanner ────────────────────────────────────────────

function BarcodeTab({ onResult }) {
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [ready, setReady] = useState(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    // Small delay to let the DOM element render
    const timeout = setTimeout(() => setReady(true), 100)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!ready) return

    let scanner = null
    let stopped = false

    async function startScanner() {
      const el = document.getElementById('barcode-reader')
      if (!el) {
        setError('Scanner container not found. Use manual entry below.')
        return
      }

      try {
        setScanning(true)
        setError(null)
        // Dynamic import to avoid crash if library has issues
        const { Html5Qrcode } = await import('html5-qrcode')
        if (stopped) return

        scanner = new Html5Qrcode('barcode-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!stopped) {
              stopped = true
              scanner.stop().catch(() => {})
              onResult(decodedText)
            }
          },
          () => {} // ignore scan failures
        )
      } catch (err) {
        console.warn('Barcode scanner error:', err)
        setError('Could not access camera. Use manual barcode entry below.')
        setScanning(false)
      }
    }

    startScanner()

    return () => {
      stopped = true
      if (scannerRef.current) {
        try { scannerRef.current.stop().catch(() => {}) } catch {}
      }
    }
  }, [ready, onResult])

  return (
    <div className="flex flex-col items-center">
      <div
        id="barcode-reader"
        className="w-full max-w-[300px] h-[250px] rounded-2xl overflow-hidden bg-black relative"
      />
      {scanning && !error && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Point camera at a barcode
        </p>
      )}
      {error && (
        <div className="flex items-center gap-2 mt-3 text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Manual barcode entry fallback */}
      <div className="w-full mt-4 pt-4 border-t border-gray-100">
        <ManualBarcodeInput onResult={onResult} />
      </div>
    </div>
  )
}

function ManualBarcodeInput({ onResult }) {
  const [barcode, setBarcode] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (barcode.trim()) onResult(barcode.trim())
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        inputMode="numeric"
        placeholder="Or type barcode number..."
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5
                   outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20"
      />
      <button
        type="submit"
        disabled={!barcode.trim()}
        className="px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl
                   disabled:opacity-40 active:scale-95 transition-all"
      >
        Go
      </button>
    </form>
  )
}

// ── Tab: Camera (Photo Recognition) ─────────────────────────────────

function CameraTab({ onResult }) {
  const [capturing, setCapturing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCapturing(true)
        }
      } catch {
        setError('Could not access camera. Please allow camera permissions.')
      }
    }
    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    const base64 = canvas.toDataURL('image/jpeg', 0.8)
    setPreview(base64)

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    setCapturing(false)

    // Send to AI for identification
    setProcessing(true)
    setError(null)
    try {
      const result = await identifyImage(base64, 'image/jpeg')
      onResult({ type: 'camera', ...result })
    } catch (err) {
      setError(err.message || 'Could not identify product')
      setProcessing(false)
    }
  }, [onResult])

  const retake = useCallback(async () => {
    setPreview(null)
    setError(null)
    setProcessing(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCapturing(true)
      }
    } catch {
      setError('Could not restart camera.')
    }
  }, [])

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[300px] h-[250px] rounded-2xl overflow-hidden bg-black relative">
        {!preview ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={preview} alt="Captured" className="w-full h-full object-cover" />
        )}

        {processing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <span className="text-white text-xs font-medium">Identifying product...</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-500">
          <AlertCircle className="w-4 h-4" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        {!preview && capturing && (
          <button
            onClick={takePhoto}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm
                       font-medium rounded-xl active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4" />
            Take Photo
          </button>
        )}
        {preview && !processing && (
          <button
            onClick={retake}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm
                       font-medium rounded-xl active:scale-95 transition-all"
          >
            Retake
          </button>
        )}
      </div>

      {!preview && !error && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Point camera at a product and take a photo
        </p>
      )}
    </div>
  )
}

// ── Tab: Manual Input ───────────────────────────────────────────────

function ManualTab({ onResult }) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onResult({
      type: 'manual',
      product_name: name.trim(),
      brand: brand.trim() || undefined,
      category: category || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Name */}
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Product Name *</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200
                        bg-gray-50 focus-within:border-emerald-400 focus-within:ring-1
                        focus-within:ring-emerald-400/20 transition-all">
          <Package className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="e.g. Nutella, Nike Air Max, iPhone..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
            autoFocus
          />
        </div>
      </div>

      {/* Brand */}
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Brand (optional)</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200
                        bg-gray-50 focus-within:border-emerald-400 focus-within:ring-1
                        focus-within:ring-emerald-400/20 transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="e.g. Ferrero, Nike, Apple..."
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Category (optional)</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(category === cat ? '' : cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all
                ${category === cat
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500
                   to-emerald-600 text-white text-sm font-semibold rounded-xl shadow-sm
                   disabled:opacity-40 active:scale-[0.98] transition-all"
      >
        Analyze Product
        <ChevronRight className="w-4 h-4" />
      </button>
    </form>
  )
}

// ── Main Modal ──────────────────────────────────────────────────────

const TABS = [
  { id: 'barcode', icon: ScanBarcode, label: 'Barcode' },
  { id: 'camera', icon: Camera, label: 'Camera' },
  { id: 'manual', icon: Keyboard, label: 'Manual' },
]

export default function ScanModal({ isOpen, onClose, defaultTab = 'barcode' }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab)
  }, [isOpen, defaultTab])

  if (!isOpen) return null

  const handleBarcodeResult = (barcode) => {
    onClose()
    navigate(`/result?barcode=${encodeURIComponent(barcode)}`)
  }

  const handleCameraResult = (data) => {
    onClose()
    const params = new URLSearchParams()
    params.set('name', data.product_name)
    if (data.brand) params.set('brand', data.brand)
    navigate(`/result?${params.toString()}`)
  }

  const handleManualResult = (data) => {
    onClose()
    const params = new URLSearchParams()
    params.set('name', data.product_name)
    if (data.brand) params.set('brand', data.brand)
    navigate(`/result?${params.toString()}`)
  }

  // Use createPortal to render outside #root (which has overflow:clip)
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl
                      max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="sticky top-0 bg-white z-10 pt-3 pb-2 rounded-t-3xl">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between px-5">
            <h2 className="text-base font-semibold text-gray-900"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Scan Product
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 mt-3">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.5 : 2} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5 py-5 pb-[env(safe-area-inset-bottom,20px)]">
          {activeTab === 'barcode' && <BarcodeTab onResult={handleBarcodeResult} />}
          {activeTab === 'camera' && <CameraTab onResult={handleCameraResult} />}
          {activeTab === 'manual' && <ManualTab onResult={handleManualResult} />}
        </div>
      </div>
    </div>,
    document.body
  )
}
