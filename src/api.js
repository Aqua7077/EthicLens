/**
 * EthicLens API client.
 * Talks to the FastAPI backend for product analysis and search.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://ethiclens-api.onrender.com'

/**
 * Analyze a product by barcode or name.
 * @param {{ barcode?: string, product_name?: string, brand?: string }} params
 * @returns {Promise<object>} Full analysis result
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
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<{ query: string, count: number, products: object[] }>}
 */
export async function searchProducts(query, limit = 10) {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const resp = await fetch(`${API_BASE}/search?${params}`)
  if (!resp.ok) throw new Error(`Search failed (${resp.status})`)
  return resp.json()
}

/**
 * Identify a product from a photo using Claude Vision.
 * @param {string} base64Image - base64-encoded image (with or without data URI prefix)
 * @param {string} mediaType - image/jpeg, image/png, etc.
 * @returns {Promise<{ product_name: string, brand: string, category: string }>}
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
 * Health check.
 */
export async function healthCheck() {
  const resp = await fetch(`${API_BASE}/health`)
  return resp.json()
}
