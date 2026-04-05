/**
 * EthicLens API client.
 * Talks to the FastAPI backend for product analysis and search.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://ethiclens-api.onrender.com'

/**
 * Analyze a product by barcode or name.
 * Returns full analysis with score_trace for transparency.
 */
export async function analyzeProduct({ barcode, product_name, brand } = {}) {
  const resp = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barcode, product_name, brand }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `Analysis failed (${resp.status})`)
  }
  return resp.json()
}

/**
 * Search products by name.
 */
export async function searchProducts(query, limit = 10) {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const resp = await fetch(`${API_BASE}/search?${params}`)
  if (!resp.ok) throw new Error(`Search failed (${resp.status})`)
  return resp.json()
}

/**
 * Identify a product from a photo using Claude Vision.
 */
export async function identifyImage(base64Image, mediaType = 'image/jpeg') {
  const resp = await fetch(`${API_BASE}/identify-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, media_type: mediaType }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `Image recognition failed (${resp.status})`)
  }
  return resp.json()
}

/**
 * Fetch real-time news by category (25 articles default).
 */
export async function fetchNews(category = 'all', limit = 25) {
  const params = new URLSearchParams({ category, limit: String(limit) })
  const resp = await fetch(`${API_BASE}/news?${params}`)
  if (!resp.ok) throw new Error(`News fetch failed (${resp.status})`)
  return resp.json()
}

/**
 * Fetch personalized "For You" news based on scan history.
 */
export async function fetchForYouNews(materials = [], categories = [], limit = 25) {
  const params = new URLSearchParams({
    materials: materials.join(','),
    categories: categories.join(','),
    limit: String(limit),
  })
  const resp = await fetch(`${API_BASE}/news/for-you?${params}`)
  if (!resp.ok) throw new Error(`Personalized news failed (${resp.status})`)
  return resp.json()
}

/**
 * Get AI summary of a news article.
 */
export async function fetchArticleSummary(url) {
  const params = new URLSearchParams({ url })
  const resp = await fetch(`${API_BASE}/news/summary?${params}`)
  if (!resp.ok) throw new Error(`Article summary failed (${resp.status})`)
  return resp.json()
}

/**
 * Health check.
 */
export async function healthCheck() {
  const resp = await fetch(`${API_BASE}/health`)
  return resp.json()
}
