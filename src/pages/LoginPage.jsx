import { useState } from 'react'
import { Leaf, ShieldCheck, Eye, BarChart3, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState(null)

  const handleSignIn = async () => {
    setSigningIn(true)
    setError(null)
    try {
      await signIn()
    } catch (err) {
      console.error('Sign-in error:', err)
      setError('Sign-in failed. Please try again.')
      setSigningIn(false)
    }
  }

  const features = [
    {
      icon: Eye,
      title: 'Supply Chain Transparency',
      desc: 'See exactly where products come from and how they are sourced.',
    },
    {
      icon: ShieldCheck,
      title: 'Ethical Risk Scoring',
      desc: 'AI-powered scores based on labor rights, sustainability, and transparency data.',
    },
    {
      icon: BarChart3,
      title: 'Fully Auditable',
      desc: 'Every score is traceable — see the exact formula and data sources behind each number.',
    },
  ]

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-emerald-50 via-white to-white">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top,40px)]">
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600
                        flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-6">
          <Leaf className="w-10 h-10 text-white" />
        </div>

        <h1
          className="text-3xl font-bold text-gray-900 tracking-tight mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          EthicLens
        </h1>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-10">
          Scan any product. Know its story. Make ethical choices.
        </p>

        {/* Features */}
        <div className="w-full max-w-sm space-y-4 mb-10">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="flex items-start gap-3 fade-up"
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5 text-emerald-600" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sign in section */}
      <div className="px-6 pb-[env(safe-area-inset-bottom,32px)] pt-4">
        {error && (
          <p className="text-xs text-red-500 text-center mb-3">{error}</p>
        )}

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl
                     bg-white border border-gray-200 shadow-sm
                     hover:shadow-md active:scale-[0.98] transition-all
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signingIn ? (
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span className="text-sm font-medium text-gray-700">
            {signingIn ? 'Signing in...' : 'Continue with Google'}
          </span>
        </button>

        <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed">
          By signing in, you agree to EthicLens' Terms of Service.
          <br />Built for the MIT App Inventor Global Appathon 2026.
        </p>
      </div>
    </div>
  )
}
