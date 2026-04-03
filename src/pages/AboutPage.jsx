import {
  Leaf, ScanBarcode, Brain, ShieldCheck, Users, ExternalLink,
  ChevronRight, Sparkles, Layers, AlertTriangle, Award
} from 'lucide-react'

const teamMembers = [
  { name: 'Team Member 1', role: 'Full-Stack Developer', avatar: '🧑‍💻' },
  { name: 'Team Member 2', role: 'AI & Data Engineer', avatar: '🤖' },
  { name: 'Team Member 3', role: 'UI/UX Designer', avatar: '🎨' },
  { name: 'Team Member 4', role: 'Research & Impact', avatar: '📊' },
]

const howItWorks = [
  {
    step: 1,
    icon: ScanBarcode,
    title: 'Scan or Search',
    description: 'Point your camera at any product barcode or type in a brand name to begin analysis.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    step: 2,
    icon: Layers,
    title: 'AI Decomposition',
    description: 'Our AI breaks down the product into raw materials and maps each to its supply chain risk.',
    color: 'from-teal-500 to-teal-600',
  },
  {
    step: 3,
    icon: Brain,
    title: 'Opacity Audit',
    description: 'An LLM analyzes corporate sustainability reports for evasive language and disclosure gaps.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    step: 4,
    icon: ShieldCheck,
    title: 'EthicScore',
    description: 'A weighted score combining material risk, brand disclosure, news sentiment, and community data.',
    color: 'from-green-500 to-green-600',
  },
]

const sdgGoals = [
  {
    number: 8,
    title: 'Decent Work & Economic Growth',
    description: 'Target 8.7: End child labour in all its forms',
    color: 'bg-red-500',
  },
  {
    number: 12,
    title: 'Responsible Consumption & Production',
    description: 'Target 12.6: Encourage sustainable corporate practices',
    color: 'bg-amber-600',
  },
]

const features = [
  { icon: Sparkles, title: 'AI Transparency Audit', desc: 'Flags greenwashing in CSR reports' },
  { icon: Layers, title: 'Material Decomposer', desc: 'Risk scores for each raw material' },
  { icon: AlertTriangle, title: 'Investigation Mode', desc: 'No brand defaults to "Safe"' },
  { icon: Users, title: 'Community Ledger', desc: 'Crowdsourced ethical verification' },
]

export default function AboutPage() {
  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-40 glass">
        <div className="px-5 pt-[env(safe-area-inset-top,12px)]">
          <div className="flex items-center gap-2 py-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600
                            flex items-center justify-center shadow-sm">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              About
            </h1>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="px-5 pt-4 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
          <div className="absolute top-8 left-8 w-16 h-16 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              EthicLens AI
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Making supply chain transparency accessible to every consumer. Scan any product to uncover
              its ethical sourcing story.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-[10px] text-white/80 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                MIT Appathon 2026
              </span>
              <span className="text-[10px] text-white/80 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                SDG 8 & 12
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">How It Works</h2>
        <div className="space-y-3">
          {howItWorks.map((item, i) => (
            <div key={item.step} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color}
                                flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <item.icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="w-px h-6 bg-gray-200 mt-1" />
                )}
              </div>
              <div className="pt-0.5 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 w-5 h-5
                                 rounded-full flex items-center justify-center">
                    {item.step}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Features */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Key Features</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((feat) => (
            <div key={feat.title} className="bg-gray-50 rounded-2xl p-3.5">
              <feat.icon className="w-5 h-5 text-emerald-600 mb-2" strokeWidth={1.8} />
              <h3 className="text-xs font-semibold text-gray-900 mb-0.5">{feat.title}</h3>
              <p className="text-[11px] text-gray-500 leading-snug">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SDG Alignment */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">SDG Alignment</h2>
        <div className="space-y-2.5">
          {sdgGoals.map((goal) => (
            <div key={goal.number} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white">
              <div className={`w-12 h-12 ${goal.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-lg font-bold">{goal.number}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-gray-900">{goal.title}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">{goal.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EthicScore Breakdown */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">EthicScore Breakdown</h2>
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-4 space-y-3">
          {[
            { label: 'Material Risk Index', weight: 40, color: 'bg-emerald-500' },
            { label: 'Brand Disclosure Score', weight: 30, color: 'bg-teal-500' },
            { label: 'News Sentiment', weight: 20, color: 'bg-cyan-500' },
            { label: 'Community Verification', weight: 10, color: 'bg-green-500' },
          ].map((comp) => (
            <div key={comp.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700 font-medium">{comp.label}</span>
                <span className="text-xs text-gray-500 font-semibold">{comp.weight}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${comp.color} rounded-full transition-all duration-700`}
                  style={{ width: `${comp.weight}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Meet the Team</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="bg-white rounded-2xl border border-gray-100 p-4 text-center
                       hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50
                            flex items-center justify-center text-2xl">
                {member.avatar}
              </div>
              <h3 className="text-xs font-semibold text-gray-900">{member.name}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Badge System */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Badge System</h2>
        <div className="space-y-2">
          {[
            { badge: 'VERIFIED GREEN', desc: 'High transparency, low material risk', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
            { badge: 'MODERATE RISK', desc: 'Some disclosure gaps or moderate risk materials', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
            { badge: 'HIGH RISK', desc: 'Opacity penalty applied, high-risk materials', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
            { badge: 'UNVERIFIED', desc: 'Insufficient data — Investigation Mode activated', color: 'bg-gray-400', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
          ].map((item) => (
            <div key={item.badge} className={`flex items-center gap-3 p-3 rounded-xl ${item.bgLight}`}>
              <div className={`w-3 h-3 ${item.color} rounded-full flex-shrink-0`} />
              <div>
                <span className={`text-[11px] font-bold ${item.textColor}`}>{item.badge}</span>
                <p className="text-[10px] text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Powered By</h2>
        <div className="flex flex-wrap gap-2">
          {['MIT App Inventor', 'Gemini Flash', 'FastAPI', 'Firebase', 'ILAB Data', 'WikiRate', 'Open Supply Hub'].map((tech) => (
            <span key={tech} className="text-[11px] font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-5 text-center">
          <Award className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">MIT App Inventor Global Appathon 2026</h3>
          <p className="text-xs text-gray-500 mb-3">All-Ages Team Category</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            EthicLens AI is built to make ethical consumption accessible to everyone.
            Every scan you make helps create a more transparent global supply chain.
          </p>
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}
