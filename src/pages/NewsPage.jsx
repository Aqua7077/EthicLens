import { useState, useRef } from 'react'
import { Leaf, BookmarkPlus, Clock, Flame, ChevronRight } from 'lucide-react'

const categories = [
  { id: 'all', label: 'For You', emoji: '✨' },
  { id: 'food', label: 'Food', emoji: '🍫' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
  { id: 'beauty', label: 'Beauty', emoji: '🧴' },
  { id: 'tech', label: 'Tech', emoji: '📱' },
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'kids', label: 'Kids', emoji: '🧸' },
]

const trendingTopics = [
  { label: 'EU Deforestation Law', hot: true },
  { label: 'Uyghur Forced Labor', hot: true },
  { label: 'Cocoa Price Crisis', hot: false },
]

const newsArticles = [
  {
    id: 1,
    category: 'food',
    title: 'Major Chocolate Brands Fail New EU Child Labor Audit',
    excerpt: 'A sweeping audit reveals that 60% of major chocolate brands still cannot trace cocoa to farm level, raising fresh concerns about child labor in West Africa.',
    image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&h=400&fit=crop',
    source: 'Reuters Sustainability',
    timeAgo: '2h ago',
    readTime: '4 min read',
    isFeatured: true,
    tags: ['Child Labor', 'Cocoa', 'EU Regulation'],
  },
  {
    id: 2,
    category: 'fashion',
    title: 'Patagonia Launches Full Supply Chain Map for All Products',
    excerpt: 'The outdoor brand becomes the first major retailer to publish real-time Tier 4 sourcing data for every product.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    source: 'Fashion Revolution',
    timeAgo: '5h ago',
    readTime: '3 min read',
    isFeatured: false,
    tags: ['Transparency', 'Fashion'],
  },
  {
    id: 3,
    category: 'tech',
    title: 'Cobalt Mining Report Exposes Battery Supply Chain Gaps',
    excerpt: 'New investigation documents widespread use of child miners in DRC cobalt operations supplying major tech manufacturers.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop',
    source: 'Amnesty International',
    timeAgo: '8h ago',
    readTime: '6 min read',
    isFeatured: false,
    tags: ['Cobalt', 'Mining', 'Tech'],
  },
  {
    id: 4,
    category: 'beauty',
    title: 'Palm Oil-Free Cosmetics Market Grows 340% in 2025',
    excerpt: 'Consumer demand for deforestation-free beauty products drives explosive growth in alternative ingredient sourcing.',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
    source: 'Cosmetics Weekly',
    timeAgo: '1d ago',
    readTime: '3 min read',
    isFeatured: false,
    tags: ['Palm Oil', 'Cosmetics'],
  },
  {
    id: 5,
    category: 'food',
    title: 'Fair Trade Coffee Farmers See 23% Income Increase',
    excerpt: 'New fair trade premium models show measurable impact on farmer livelihoods across Latin America and East Africa.',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=300&fit=crop',
    source: 'Fair Trade Foundation',
    timeAgo: '1d ago',
    readTime: '4 min read',
    isFeatured: false,
    tags: ['Fair Trade', 'Coffee'],
  },
  {
    id: 6,
    category: 'fashion',
    title: 'Bangladesh Garment Workers Win Historic Wage Agreement',
    excerpt: 'After months of negotiations, a landmark agreement raises minimum wages by 56% for 4 million garment workers.',
    image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=300&fit=crop',
    source: 'The Guardian',
    timeAgo: '2d ago',
    readTime: '5 min read',
    isFeatured: false,
    tags: ['Workers Rights', 'Fashion'],
  },
]

function FeaturedCard({ article }) {
  return (
    <div className="relative rounded-3xl overflow-hidden mx-5 mb-5 fade-up fade-up-delay-1">
      <img src={article.image} alt="" className="w-full h-56 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center gap-2 mb-2">
          {article.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20
                         backdrop-blur-sm px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="text-white font-semibold text-base leading-snug mb-2">
          {article.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-[11px]">{article.source}</span>
            <span className="text-gray-500 text-[11px]">-</span>
            <span className="text-gray-400 text-[11px] flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {article.timeAgo}
            </span>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <BookmarkPlus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ArticleCard({ article, index }) {
  return (
    <div
      className="flex gap-3 px-5 py-3 active:bg-gray-50 transition-colors fade-up"
      style={{ animationDelay: `${0.15 + index * 0.08}s` }}
    >
      <img
        src={article.image}
        alt=""
        className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {article.tags.slice(0, 1).map(tag => (
              <span key={tag} className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            <span className="text-[10px] text-gray-400">{article.readTime}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {article.title}
          </h3>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {article.timeAgo}
          </span>
          <button className="p-1">
            <BookmarkPlus className="w-4 h-4 text-gray-300 hover:text-emerald-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const scrollRef = useRef(null)

  const filteredArticles = activeCategory === 'all'
    ? newsArticles
    : newsArticles.filter(a => a.category === activeCategory)

  const featured = filteredArticles.find(a => a.isFeatured) || filteredArticles[0]
  const rest = filteredArticles.filter(a => a.id !== featured?.id)

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

      {/* Trending Strip */}
      <div className="px-5 py-3">
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-900 flex-shrink-0">Trending:</span>
          {trendingTopics.map((topic) => (
            <button
              key={topic.label}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50
                       text-[11px] font-medium text-orange-700 whitespace-nowrap flex-shrink-0
                       hover:bg-orange-100 transition-colors"
            >
              {topic.hot && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Article */}
      {featured && <FeaturedCard article={featured} />}

      {/* Article List */}
      <div className="mb-4">
        <div className="flex items-center justify-between px-5 mb-1">
          <h2 className="text-sm font-semibold text-gray-900">Latest Stories</h2>
          <button className="text-xs text-emerald-600 font-medium flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {rest.map((article, index) => (
          <ArticleCard key={article.id} article={article} index={index} />
        ))}
      </div>

      {/* Ethical Picks Section */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Ethical Product Picks</h2>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {[
            { name: 'Tony\'s Chocolonely', category: 'Chocolate', score: 94, img: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&h=200&fit=crop' },
            { name: 'Allbirds Runners', category: 'Footwear', score: 88, img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=200&h=200&fit=crop' },
            { name: 'Who Gives A Crap', category: 'Home', score: 96, img: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=200&h=200&fit=crop' },
          ].map((pick, i) => (
            <div key={pick.name} className="flex-shrink-0 w-36 fade-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
              <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                <img src={pick.img} alt="" className="w-full h-28 object-cover" />
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 truncate">{pick.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{pick.category}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      {pick.score}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}
