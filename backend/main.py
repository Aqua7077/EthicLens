"""EthicLens AI Backend — FastAPI + Claude API.

Endpoints:
  POST /analyze         — Analyze a product by barcode or name
  POST /identify-image  — Identify a product from a photo using Claude Vision
  GET  /search          — Search products by name
  GET  /news            — Fetch real-time sustainability news
  GET  /news/summary    — AI-summarize an article
  GET  /news/for-you    — Personalized news based on scan history
  GET  /health          — Health check
"""

import os
import json
import time
import base64
import re
from pathlib import Path
from urllib.parse import quote_plus
import httpx
import anthropic
import feedparser
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ilab_data import get_material_risk, resolve_material

# Load .env from the same directory as this file
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

app = FastAPI(
    title="EthicLens AI",
    description="Ethical supply chain transparency API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Clients ──────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OFF_BASE = "https://world.openfoodfacts.org"
OFF_HEADERS = {"User-Agent": "EthicLensAI/1.0 (ethiclens-appathon@mit.edu)"}

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
http = httpx.AsyncClient(timeout=15, headers=OFF_HEADERS)

# ── News Cache & Config ──────────────────────────────────────────────

NEWS_CACHE: dict[str, tuple[float, list]] = {}  # key -> (timestamp, articles)
NEWS_CACHE_TTL = 1800  # 30 minutes

NEWS_QUERIES: dict[str, str] = {
    "all": "ethical sourcing supply chain transparency",
    "food": "ethical food sourcing child labor cocoa palm oil",
    "fashion": "sustainable fashion garment labor rights",
    "beauty": "beauty cosmetics sustainability ethical sourcing",
    "tech": "electronics supply chain cobalt mining labor",
    "home": "sustainable home products timber deforestation",
    "kids": "children products safety ethical manufacturing",
}


# ── Models ───────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    barcode: str | None = None
    product_name: str | None = None
    brand: str | None = None


class IdentifyImageRequest(BaseModel):
    image: str  # base64-encoded image data (with or without data URI prefix)
    media_type: str = "image/jpeg"  # image/jpeg, image/png, image/webp


class MaterialRisk(BaseModel):
    material: str
    commodity: str | None
    risk_score: float
    risk_level: str
    has_child_labor: bool
    has_forced_labor: bool
    countries: list[dict]


class OpacityAudit(BaseModel):
    transparency_score: float
    flags: list[str]
    summary: str


class EthicScoreResult(BaseModel):
    overall_score: float
    badge: str
    badge_color: str
    material_risk_index: float
    brand_disclosure_score: float
    news_sentiment_score: float
    community_score: float


class Alternative(BaseModel):
    name: str
    brand: str
    reason: str
    estimated_score: int


class AnalyzeResponse(BaseModel):
    product_name: str
    brand: str
    category: str
    image_url: str | None
    ingredients: list[str]
    materials: list[MaterialRisk]
    opacity_audit: OpacityAudit
    ethic_score: EthicScoreResult
    ai_summary: str
    alternatives: list[Alternative]


# ── Open Food Facts ──────────────────────────────────────────────────

async def lookup_barcode(barcode: str) -> dict | None:
    """Look up a product on Open Food Facts by barcode."""
    url = f"{OFF_BASE}/api/v2/product/{barcode}.json"
    params = {
        "fields": "product_name,brands,categories,ingredients_text,ingredients_text_en,"
                  "labels,labels_tags,image_front_url,ecoscore_grade,nova_group,"
                  "nutrition_grades,countries"
    }
    try:
        resp = await http.get(url, params=params)
        data = resp.json()
        if data.get("status") == 1:
            return data.get("product", {})
    except Exception:
        pass
    return None


async def search_products(query: str, page_size: int = 10) -> list[dict]:
    """Search Open Food Facts by product name."""
    url = f"{OFF_BASE}/cgi/search.pl"
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": page_size,
        "fields": "code,product_name,brands,categories,image_front_url,"
                  "ingredients_text_en,labels_tags",
    }
    try:
        resp = await http.get(url, params=params)
        data = resp.json()
        return data.get("products", [])
    except Exception:
        return []


# ── Claude AI ────────────────────────────────────────────────────────

def ai_decompose_materials(product_name: str, brand: str, ingredients: str, category: str) -> list[str]:
    """Use Claude to decompose a product into raw materials for ILAB risk analysis."""
    if not claude:
        return _fallback_decompose(ingredients)

    prompt = f"""You are an expert in supply chain analysis. Given this product, identify the key RAW MATERIALS
(not processed ingredients) that go into making it. Focus on materials that have supply chain risks
(labor, environmental, sourcing).

Product: {product_name}
Brand: {brand}
Category: {category}
Ingredients/Components: {ingredients or 'Not available'}

Return ONLY a JSON array of raw material names (lowercase strings). Examples: "cocoa", "palm oil", "cotton", "rubber", "cobalt".
Include materials from packaging if relevant. Return 3-10 materials max.
Output ONLY the JSON array, no explanation."""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        # Parse JSON array from response
        if text.startswith("["):
            materials = json.loads(text)
            return [m.lower().strip() for m in materials if isinstance(m, str)]
    except Exception as e:
        print(f"Claude decompose error: {e}")

    return _fallback_decompose(ingredients)


def _fallback_decompose(ingredients: str) -> list[str]:
    """Simple keyword-based decomposition when Claude is unavailable."""
    if not ingredients:
        return []
    known = [
        "cocoa", "sugar", "palm oil", "coffee", "cotton", "rubber", "leather",
        "soy", "milk", "wheat", "rice", "tea", "vanilla", "fish", "shrimp",
        "tobacco", "timber", "bamboo", "wool", "silk", "gold", "cobalt",
        "tin", "mica", "polyester", "lithium",
    ]
    ingredients_lower = ingredients.lower()
    return [m for m in known if m in ingredients_lower]


def ai_opacity_audit(product_name: str, brand: str, labels: list[str], category: str) -> OpacityAudit:
    """Use Claude to audit brand transparency and detect greenwashing."""
    if not claude:
        return _fallback_opacity(labels)

    labels_str = ", ".join(labels) if labels else "None listed"

    prompt = f"""You are a corporate sustainability analyst specializing in detecting greenwashing
and supply chain opacity. Analyze this product's brand transparency.

Product: {product_name}
Brand: {brand}
Category: {category}
Certifications/Labels: {labels_str}

Evaluate on these criteria:
1. Does the brand publish a public supply chain map or supplier list?
2. Are there third-party certifications (Fair Trade, B Corp, Rainforest Alliance, etc.)?
3. Is there evidence of vague sustainability claims without data ("eco-friendly", "green", "conscious")?
4. Does the brand provide specific, measurable sustainability targets?

Return ONLY valid JSON in this exact format:
{{
  "transparency_score": <0-100 number, higher = more transparent>,
  "flags": [<list of 1-4 short string flags like "No public supplier list", "Vague eco-claims", "Third-party certified">],
  "summary": "<1-2 sentence summary of the brand's transparency posture>"
}}"""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        # Find JSON in response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return OpacityAudit(
                transparency_score=float(data.get("transparency_score", 50)),
                flags=data.get("flags", []),
                summary=data.get("summary", "Analysis unavailable."),
            )
    except Exception as e:
        print(f"Claude opacity audit error: {e}")

    return _fallback_opacity(labels)


def _fallback_opacity(labels: list[str]) -> OpacityAudit:
    """Fallback opacity scoring based on labels alone."""
    good_labels = {"en:fair-trade", "en:organic", "en:rainforest-alliance",
                   "en:utz-certified", "en:b-corporation"}
    found = set(labels or []) & good_labels
    score = min(30 + len(found) * 15, 85)
    flags = []
    if not found:
        flags.append("No recognized ethical certifications")
    else:
        flags.append(f"{len(found)} ethical certification(s) found")
    return OpacityAudit(
        transparency_score=score,
        flags=flags,
        summary="Automated label-based assessment. Full AI audit requires API key.",
    )


def ai_generate_summary(product_name: str, brand: str, ethic_score: float,
                         materials: list[MaterialRisk], opacity: OpacityAudit) -> str:
    """Generate a consumer-friendly summary of the analysis."""
    if not claude:
        return _fallback_summary(product_name, brand, ethic_score)

    high_risk = [m.material for m in materials if m.risk_score >= 50]
    prompt = f"""Write a 2-3 sentence consumer-friendly summary of this product's ethical assessment.
Be direct but not alarmist. Use specific facts.

Product: {product_name} by {brand}
EthicScore: {ethic_score}/100
High-risk materials: {', '.join(high_risk) if high_risk else 'None identified'}
Brand transparency: {opacity.summary}
Transparency flags: {', '.join(opacity.flags)}

Write ONLY the summary paragraph, no labels or formatting."""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"Claude summary error: {e}")

    return _fallback_summary(product_name, brand, ethic_score)


def _fallback_summary(product_name: str, brand: str, score: float) -> str:
    if score >= 75:
        return f"{product_name} by {brand} demonstrates strong ethical sourcing practices with good supply chain transparency."
    elif score >= 50:
        return f"{product_name} by {brand} shows moderate ethical compliance. Some supply chain areas could benefit from greater transparency."
    else:
        return f"{product_name} by {brand} raises ethical sourcing concerns. Limited supply chain transparency and potential labor risks were identified."


def ai_suggest_alternatives(product_name: str, brand: str, category: str, score: float) -> list[Alternative]:
    """Use Claude to suggest more ethical alternatives."""
    if not claude:
        return []

    prompt = f"""You are an ethical consumer advisor. A user just analyzed "{product_name}" by {brand}
(category: {category}) which scored {score}/100 on ethical sourcing.

Suggest 3 more ethically sourced alternatives in the same product category.
Focus on brands known for Fair Trade, organic, B Corp certification, or transparent supply chains.

Return ONLY a JSON array:
[
  {{"name": "<product>", "brand": "<brand>", "reason": "<1 sentence why it's better>", "estimated_score": <70-95>}},
  ...
]"""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            items = json.loads(text[start:end])
            return [Alternative(**item) for item in items[:4]]
    except Exception as e:
        print(f"Claude alternatives error: {e}")
    return []


# ── News Fetching ────────────────────────────────────────────────────

async def fetch_news_rss(search_query: str, count: int = 10) -> list[dict]:
    """Fetch news from Google News RSS feed."""
    cache_key = f"{search_query}:{count}"
    now = time.time()

    # Check cache
    if cache_key in NEWS_CACHE:
        cached_time, cached_articles = NEWS_CACHE[cache_key]
        if now - cached_time < NEWS_CACHE_TTL:
            return cached_articles[:count]

    url = f"https://news.google.com/rss/search?q={quote_plus(search_query)}&hl=en-US&gl=US&ceid=US:en"
    try:
        resp = await http.get(url, headers={"User-Agent": "EthicLensAI/1.0"})
        feed = feedparser.parse(resp.text)

        articles = []
        for entry in feed.entries[:count]:
            # Extract source from title (Google News format: "Title - Source")
            title = entry.get("title", "")
            source = ""
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                title = parts[0]
                source = parts[1]

            # Parse publish date
            published = entry.get("published", "")

            # Try to get image from description
            desc = entry.get("description", "")
            img_match = re.search(r'src="([^"]+)"', desc)
            image_url = img_match.group(1) if img_match else None

            # Clean description of HTML
            clean_desc = re.sub(r'<[^>]+>', '', desc).strip()

            articles.append({
                "title": title,
                "link": entry.get("link", ""),
                "source": source,
                "published": published,
                "snippet": clean_desc[:200] if clean_desc else "",
                "image_url": image_url,
            })

        NEWS_CACHE[cache_key] = (now, articles)
        return articles
    except Exception as e:
        print(f"News fetch error: {e}")
        return []


async def summarize_article(url: str) -> dict:
    """Fetch an article and generate an AI summary."""
    if not claude:
        return {"summary": "AI summary unavailable.", "key_points": [], "source_url": url}

    # Fetch article content
    article_text = ""
    try:
        resp = await http.get(url, follow_redirects=True, timeout=10)
        html = resp.text
        # Simple HTML text extraction
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        article_text = text[:3000]  # Limit to avoid token overflow
    except Exception:
        article_text = ""

    if len(article_text) < 100:
        return {
            "summary": "Could not fetch article content. Visit the original source to read the full article.",
            "key_points": [],
            "source_url": url,
        }

    prompt = f"""Summarize this article about ethical sourcing / sustainability in 2-3 paragraphs.
Also extract 3-4 key bullet points.

Article text:
{article_text}

Return ONLY valid JSON:
{{
  "summary": "<2-3 paragraph summary>",
  "key_points": ["point 1", "point 2", "point 3"]
}}"""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return {
                "summary": data.get("summary", ""),
                "key_points": data.get("key_points", []),
                "source_url": url,
            }
    except Exception as e:
        print(f"Article summary error: {e}")

    return {"summary": "Summary generation failed.", "key_points": [], "source_url": url}


# ── Scoring Engine ───────────────────────────────────────────────────

def compute_ethic_score(
    material_risks: list[MaterialRisk],
    opacity: OpacityAudit,
) -> EthicScoreResult:
    """Compute the weighted EthicScore.

    Weights:
      40% — Material Risk Index (inverted: lower risk = higher score)
      30% — Brand Disclosure Score (from opacity audit)
      20% — News Sentiment (placeholder — defaults to 60/100)
      10% — Community Verification (placeholder — defaults to 50/100)
    """
    # Material Risk Index: average risk of all materials, inverted to score
    if material_risks:
        known = [m for m in material_risks if m.commodity is not None]
        if known:
            avg_risk = sum(m.risk_score for m in known) / len(known)
        else:
            avg_risk = 30  # Unknown materials get moderate baseline risk
        material_score = max(0, 100 - avg_risk)
    else:
        material_score = 50  # No data = uncertain

    brand_score = opacity.transparency_score

    # Placeholders — these could integrate real news API / community data later
    news_score = 60.0
    community_score = 50.0

    overall = (
        material_score * 0.40
        + brand_score * 0.30
        + news_score * 0.20
        + community_score * 0.10
    )
    overall = round(overall, 1)

    if overall >= 75:
        badge = "VERIFIED GREEN"
        badge_color = "bg-emerald-500"
    elif overall >= 50:
        badge = "MODERATE RISK"
        badge_color = "bg-amber-500"
    elif overall >= 25:
        badge = "HIGH RISK"
        badge_color = "bg-red-500"
    else:
        badge = "UNVERIFIED"
        badge_color = "bg-gray-400"

    return EthicScoreResult(
        overall_score=overall,
        badge=badge,
        badge_color=badge_color,
        material_risk_index=round(material_score, 1),
        brand_disclosure_score=round(brand_score, 1),
        news_sentiment_score=round(news_score, 1),
        community_score=round(community_score, 1),
    )


# ── Endpoints ────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "claude_available": claude is not None,
        "version": "1.0.0",
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """Analyze a product's ethical sourcing by barcode or name.

    Supply either `barcode` (EAN/UPC) or `product_name` (+ optional `brand`).
    """
    if not req.barcode and not req.product_name:
        raise HTTPException(400, "Provide either 'barcode' or 'product_name'")

    product_data = None
    ingredients_text = ""
    product_name = req.product_name or "Unknown Product"
    brand = req.brand or "Unknown"
    category = "General"
    image_url = None
    labels: list[str] = []

    # 1. Fetch product data
    if req.barcode:
        product_data = await lookup_barcode(req.barcode)

    if not product_data and req.product_name:
        results = await search_products(req.product_name, page_size=1)
        if results:
            product_data = results[0]

    if product_data:
        product_name = product_data.get("product_name") or product_name
        brand = product_data.get("brands") or brand
        category = (product_data.get("categories") or "General").split(",")[0].strip()
        image_url = product_data.get("image_front_url")
        labels = product_data.get("labels_tags") or []
        ingredients_text = (
            product_data.get("ingredients_text_en")
            or product_data.get("ingredients_text")
            or ""
        )

    # 2. AI Material Decomposition
    raw_materials = ai_decompose_materials(product_name, brand, ingredients_text, category)

    # 3. ILAB Risk Assessment
    material_risks = [
        MaterialRisk(**get_material_risk(m)) for m in raw_materials
    ]

    # 4. AI Opacity Audit
    opacity = ai_opacity_audit(product_name, brand, labels, category)

    # 5. Compute EthicScore
    ethic_score = compute_ethic_score(material_risks, opacity)

    # 6. Generate consumer summary
    summary = ai_generate_summary(
        product_name, brand, ethic_score.overall_score, material_risks, opacity
    )

    # 7. Suggest ethical alternatives
    alternatives = ai_suggest_alternatives(
        product_name, brand, category, ethic_score.overall_score
    )

    # Parse ingredients list
    ingredients_list = []
    if ingredients_text:
        ingredients_list = [i.strip() for i in ingredients_text.split(",") if i.strip()]

    return AnalyzeResponse(
        product_name=product_name,
        brand=brand,
        category=category,
        image_url=image_url,
        ingredients=ingredients_list[:20],
        materials=material_risks,
        opacity_audit=opacity,
        ethic_score=ethic_score,
        ai_summary=summary,
        alternatives=alternatives,
    )


@app.get("/search")
async def search(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50)):
    """Search for products by name."""
    products = await search_products(q, page_size=limit)

    results = []
    for p in products:
        results.append({
            "barcode": p.get("code"),
            "name": p.get("product_name", "Unknown"),
            "brand": p.get("brands", "Unknown"),
            "category": (p.get("categories") or "").split(",")[0].strip(),
            "image_url": p.get("image_front_url"),
            "has_labels": bool(p.get("labels_tags")),
        })

    return {"query": q, "count": len(results), "products": results}


@app.post("/identify-image")
async def identify_image(req: IdentifyImageRequest):
    """Identify a product from a photo using Claude Vision.

    Accepts a base64-encoded image. Returns the identified product name,
    brand, and category so the frontend can proceed to /analyze.
    """
    if not claude:
        raise HTTPException(503, "AI image recognition requires Claude API key")

    # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
    image_data = req.image
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    # Determine media type
    media_type = req.media_type
    if req.image.startswith("data:"):
        media_type = req.image.split(";")[0].split(":")[1]

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Identify this product. What is it? Return ONLY valid JSON:
{
  "product_name": "<specific product name>",
  "brand": "<brand name or 'Unknown'>",
  "category": "<category like Food, Clothing, Electronics, Personal Care, Footwear, Home, etc.>"
}

Be specific with the product name. If you can see the brand, include it.
If it's a barcode, try to identify what product it belongs to.
Output ONLY the JSON, nothing else.""",
                    },
                ],
            }],
        )
        text = response.content[0].text.strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return {
                "product_name": data.get("product_name", "Unknown Product"),
                "brand": data.get("brand", "Unknown"),
                "category": data.get("category", "General"),
            }
        raise HTTPException(500, "Could not parse AI response")
    except anthropic.APIError as e:
        raise HTTPException(502, f"AI service error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(500, "AI returned invalid format")


@app.get("/news")
async def get_news(
    category: str = Query("all", description="Category: all, food, fashion, beauty, tech, home, kids"),
    limit: int = Query(10, ge=1, le=20),
):
    """Fetch real-time sustainability/ethical sourcing news."""
    search_query = NEWS_QUERIES.get(category.lower(), NEWS_QUERIES["all"])
    articles = await fetch_news_rss(search_query, count=limit)
    return {"category": category, "count": len(articles), "articles": articles}


@app.get("/news/summary")
async def get_article_summary(url: str = Query(..., description="Article URL to summarize")):
    """Generate an AI summary of a news article."""
    result = await summarize_article(url)
    return result


@app.get("/news/for-you")
async def get_personalized_news(
    materials: str = Query("", description="Comma-separated materials from scan history"),
    categories: str = Query("", description="Comma-separated product categories"),
    limit: int = Query(10, ge=1, le=20),
):
    """Fetch personalized news based on user's scan history."""
    # Build a personalized query from user's interests
    terms = []
    if materials:
        mat_list = [m.strip() for m in materials.split(",") if m.strip()]
        terms.extend(mat_list[:5])
    if categories:
        cat_list = [c.strip() for c in categories.split(",") if c.strip()]
        terms.extend(cat_list[:3])

    if not terms:
        # Fall back to general ethical sourcing news
        search_query = NEWS_QUERIES["all"]
    else:
        search_query = " ".join(terms) + " ethical sourcing sustainability"

    articles = await fetch_news_rss(search_query, count=limit)
    return {"personalized": True, "query_terms": terms, "count": len(articles), "articles": articles}
