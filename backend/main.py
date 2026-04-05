"""EthicLens AI Backend — FastAPI + Claude API.

Endpoints:
  POST /analyze         — Analyze a product by barcode or name (full transparency trace)
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

from ilab_data import get_material_risk, resolve_material, ILAB_RISK_DB

# Load .env from the same directory as this file
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

app = FastAPI(
    title="EthicLens AI",
    description="Ethical supply chain transparency API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Clients ---------------------------------------------------------------

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OFF_BASE = "https://world.openfoodfacts.org"
OFF_HEADERS = {"User-Agent": "EthicLensAI/1.0 (ethiclens-appathon@mit.edu)"}

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
http = httpx.AsyncClient(timeout=15, headers=OFF_HEADERS)

# -- News Cache & Config ----------------------------------------------------

NEWS_CACHE: dict[str, tuple[float, list]] = {}
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


# -- Models -----------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    barcode: str | None = None
    product_name: str | None = None
    brand: str | None = None


class IdentifyImageRequest(BaseModel):
    image: str
    media_type: str = "image/jpeg"


class CountryRiskDetail(BaseModel):
    name: str
    weight: float
    base_score: float
    ilab_adjustment: float
    final_score: float
    risk_types: list[str]
    severity: int


class MaterialRiskBreakdown(BaseModel):
    dol_listed: bool
    ilo_sector_score: float


class MaterialRiskDetail(BaseModel):
    name: str
    material_weight: float
    material_risk: dict  # {value, breakdown: {dol_score, ilo_sector_score}}
    country_risk: dict   # {value, countries: [...]}
    stage_weight: float
    contribution: float


class SupplyChainComponent(BaseModel):
    value: float
    materials: list[MaterialRiskDetail]


class MitigationFactors(BaseModel):
    supplier_list: bool
    certifications: bool
    esg_report: bool
    traceability: bool


class MitigationComponent(BaseModel):
    value: float
    factors: MitigationFactors


class ControversyComponent(BaseModel):
    value: float
    article_count: int


class ScoreComponents(BaseModel):
    supply_chain_risk: SupplyChainComponent
    mitigation_score: MitigationComponent
    controversy_score: ControversyComponent


class ScoreTrace(BaseModel):
    final_score: float
    components: ScoreComponents
    formula_display: str
    confidence_score: float
    confidence_factors: dict


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
    score_trace: ScoreTrace
    ai_summary: str
    natural_language_explanation: str
    alternatives: list[Alternative]


# -- Open Food Facts --------------------------------------------------------

async def lookup_barcode(barcode: str) -> dict | None:
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


# -- Claude AI ---------------------------------------------------------------

def ai_decompose_materials(product_name: str, brand: str, ingredients: str, category: str) -> list[str]:
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
        # Strip markdown code fences if present
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        if text.startswith("["):
            materials = json.loads(text)
            return [m.lower().strip() for m in materials if isinstance(m, str)]
    except Exception as e:
        print(f"Claude decompose error: {e}")

    return _fallback_decompose(ingredients)


def _fallback_decompose(ingredients: str) -> list[str]:
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


def ai_opacity_audit(product_name: str, brand: str, labels: list[str], category: str) -> dict:
    """Use Claude to audit brand transparency. Returns dict with all mitigation fields."""
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
5. Does the brand publish an ESG / sustainability report?
6. Does the brand have supply chain traceability systems?

Return ONLY valid JSON in this exact format:
{{
  "transparency_score": <0-100 number, higher = more transparent>,
  "flags": [<list of 1-4 short string flags>],
  "summary": "<1-2 sentence summary>",
  "has_supplier_list": <true/false>,
  "has_certifications": <true/false>,
  "has_esg_report": <true/false>,
  "has_traceability": <true/false>
}}"""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return {
                "transparency_score": float(data.get("transparency_score", 50)),
                "flags": data.get("flags", []),
                "summary": data.get("summary", "Analysis unavailable."),
                "has_supplier_list": bool(data.get("has_supplier_list", False)),
                "has_certifications": bool(data.get("has_certifications", False)),
                "has_esg_report": bool(data.get("has_esg_report", False)),
                "has_traceability": bool(data.get("has_traceability", False)),
            }
    except Exception as e:
        print(f"Claude opacity audit error: {e}")

    return _fallback_opacity(labels)


def _fallback_opacity(labels: list[str]) -> dict:
    good_labels = {"en:fair-trade", "en:organic", "en:rainforest-alliance",
                   "en:utz-certified", "en:b-corporation"}
    found = set(labels or []) & good_labels
    score = min(30 + len(found) * 15, 85)
    flags = []
    has_certs = len(found) > 0
    if not found:
        flags.append("No recognized ethical certifications")
    else:
        flags.append(f"{len(found)} ethical certification(s) found")
    return {
        "transparency_score": score,
        "flags": flags,
        "summary": "Automated label-based assessment. Full AI audit requires API key.",
        "has_supplier_list": False,
        "has_certifications": has_certs,
        "has_esg_report": False,
        "has_traceability": False,
    }


def ai_generate_summary(product_name: str, brand: str, ethic_score: float,
                         materials: list[MaterialRisk], opacity_data: dict) -> str:
    if not claude:
        return _fallback_summary(product_name, brand, ethic_score)

    high_risk = [m.material for m in materials if m.risk_score >= 50]
    prompt = f"""Write a 2-3 sentence consumer-friendly summary of this product's ethical assessment.
Be direct but not alarmist. Use specific facts.

Product: {product_name} by {brand}
EthicScore: {ethic_score}/100
High-risk materials: {', '.join(high_risk) if high_risk else 'None identified'}
Brand transparency: {opacity_data.get('summary', 'N/A')}
Transparency flags: {', '.join(opacity_data.get('flags', []))}

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
    """Suggest genuinely more ethical alternatives with realistic scores."""
    if not claude:
        return []

    prompt = f"""You are an ethical consumer advisor. A user analyzed "{product_name}" by {brand}
(category: {category}) which scored {score:.0f}/100 on ethical sourcing.

Suggest 3 genuinely more ethically sourced alternatives in the same product category.
IMPORTANT: Only suggest brands that are ACTUALLY known for ethical practices. These must be real products/brands.
Focus on brands with verified Fair Trade, organic, B Corp, or transparent supply chains.

The estimated scores should reflect genuine ethical standing:
- 85-95: Truly exemplary (B Corp certified, fully transparent supply chain, Fair Trade)
- 75-84: Very good (multiple certifications, public sustainability reports)
- 65-74: Good (some certifications, decent transparency)

Return ONLY a JSON array:
[
  {{"name": "<specific real product>", "brand": "<real brand>", "reason": "<1 sentence why it's specifically better>", "estimated_score": <65-95>}},
  ...
]"""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
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


def ai_generate_natural_explanation(
    product_name: str, brand: str, final_score: float,
    supply_chain_risk: float, mitigation_value: float, controversy_value: float,
    materials: list[MaterialRisk], opacity_data: dict
) -> str:
    """Generate a human-readable explanation of the score."""
    if not claude:
        return _fallback_natural_explanation(product_name, brand, final_score, supply_chain_risk, mitigation_value)

    high_risk_mats = [m.material for m in materials if m.risk_score >= 50]
    mitigation_factors = []
    if opacity_data.get("has_supplier_list"):
        mitigation_factors.append("supplier transparency")
    if opacity_data.get("has_certifications"):
        mitigation_factors.append("third-party certifications")
    if opacity_data.get("has_esg_report"):
        mitigation_factors.append("ESG reporting")
    if opacity_data.get("has_traceability"):
        mitigation_factors.append("supply chain traceability")

    prompt = f"""Write a 2-3 sentence plain English explanation of this product's ethical risk score.
Explain WHY it got this score, referencing specific materials and mitigating factors.
Be factual and specific.

Product: {product_name} by {brand}
Final Score: {final_score}/100 (higher = more ethical, lower = riskier)
Supply Chain Risk: {supply_chain_risk:.2f} (0-1 scale, higher = riskier)
High-risk materials: {', '.join(high_risk_mats) if high_risk_mats else 'None'}
Mitigation factors present: {', '.join(mitigation_factors) if mitigation_factors else 'None identified'}
Controversy score: {controversy_value:.2f}

Write ONLY the explanation, no formatting."""

    try:
        response = claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"Claude explanation error: {e}")

    return _fallback_natural_explanation(product_name, brand, final_score, supply_chain_risk, mitigation_value)


def _fallback_natural_explanation(product_name, brand, score, scr, mit):
    if score >= 75:
        return f"This product has lower risk due to responsible sourcing practices and strong mitigation measures by {brand}."
    elif score >= 50:
        return f"This product has moderate risk. While {brand} implements some transparency measures, certain materials in the supply chain carry labor or environmental concerns."
    else:
        return f"This product has higher risk due to materials sourced from regions with known labor concerns. {brand} could improve by increasing supply chain transparency and obtaining third-party certifications."


# -- News Fetching -----------------------------------------------------------

async def fetch_news_rss(search_query: str, count: int = 25) -> list[dict]:
    """Fetch news from Google News RSS feed. Prefer recent articles."""
    cache_key = f"{search_query}:{count}"
    now = time.time()

    if cache_key in NEWS_CACHE:
        cached_time, cached_articles = NEWS_CACHE[cache_key]
        if now - cached_time < NEWS_CACHE_TTL:
            return cached_articles[:count]

    # Add "when:7d" to Google News query to get articles from last 7 days
    fresh_query = f"{search_query} when:7d"
    url = f"https://news.google.com/rss/search?q={quote_plus(fresh_query)}&hl=en-US&gl=US&ceid=US:en"
    try:
        resp = await http.get(url, headers={"User-Agent": "EthicLensAI/1.0"})
        feed = feedparser.parse(resp.text)

        articles = []
        for entry in feed.entries[:count]:
            title = entry.get("title", "")
            source = ""
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                title = parts[0]
                source = parts[1]

            published = entry.get("published", "")

            desc = entry.get("description", "")
            img_match = re.search(r'src="([^"]+)"', desc)
            image_url = img_match.group(1) if img_match else None

            clean_desc = re.sub(r'<[^>]+>', '', desc).strip()

            articles.append({
                "title": title,
                "link": entry.get("link", ""),
                "source": source,
                "published": published,
                "snippet": clean_desc[:200] if clean_desc else "",
                "image_url": image_url,
            })

        # If we got fewer than count from 7d, also fetch without time filter
        if len(articles) < count:
            url2 = f"https://news.google.com/rss/search?q={quote_plus(search_query)}&hl=en-US&gl=US&ceid=US:en"
            resp2 = await http.get(url2, headers={"User-Agent": "EthicLensAI/1.0"})
            feed2 = feedparser.parse(resp2.text)
            seen_links = {a["link"] for a in articles}
            for entry in feed2.entries:
                if len(articles) >= count:
                    break
                link = entry.get("link", "")
                if link in seen_links:
                    continue
                seen_links.add(link)
                title = entry.get("title", "")
                source = ""
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    title = parts[0]
                    source = parts[1]
                desc = entry.get("description", "")
                img_match = re.search(r'src="([^"]+)"', desc)
                image_url = img_match.group(1) if img_match else None
                clean_desc = re.sub(r'<[^>]+>', '', desc).strip()
                articles.append({
                    "title": title,
                    "link": link,
                    "source": source,
                    "published": entry.get("published", ""),
                    "snippet": clean_desc[:200] if clean_desc else "",
                    "image_url": image_url,
                })

        NEWS_CACHE[cache_key] = (now, articles)
        return articles
    except Exception as e:
        print(f"News fetch error: {e}")
        return []


async def summarize_article(url: str) -> dict:
    if not claude:
        return {"summary": "AI summary unavailable.", "key_points": [], "source_url": url}

    article_text = ""
    try:
        resp = await http.get(url, follow_redirects=True, timeout=10)
        html = resp.text
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        article_text = text[:3000]
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


# -- Transparent Scoring Engine -----------------------------------------------

def compute_ethic_score_with_trace(
    material_risks: list[MaterialRisk],
    opacity_data: dict,
) -> tuple[EthicScoreResult, ScoreTrace]:
    """Compute EthicScore with FULL calculation transparency.

    The scoring follows this formula:
      supply_chain_risk = weighted average of material risks (0-1, higher = riskier)
      mitigation_score  = based on brand transparency factors (0-1, higher = more mitigated)
      controversy_score = placeholder for real-time controversy (0-1)

      Final Risk = (supply_chain_risk * (1 - mitigation_score)) + controversy_score
      Final Score = (1 - Final Risk) * 100
    """

    # -- Step 1: Material weights and risks --
    num_materials = len(material_risks)
    known_materials = [m for m in material_risks if m.commodity is not None]
    num_known = len(known_materials)

    material_details = []
    total_supply_chain_risk = 0.0

    if num_known > 0:
        # Equal weighting across known materials
        material_weight = 1.0 / num_known

        for m in known_materials:
            # Material risk on 0-1 scale
            mat_risk_value = m.risk_score / 100.0

            # DOL listed?
            dol_listed = m.commodity is not None and m.commodity in ILAB_RISK_DB

            # ILO sector score: based on severity and breadth
            max_sev = max((c.get("severity", 1) for c in m.countries), default=1) if m.countries else 0
            ilo_sector_score = max_sev / 3.0  # normalize to 0-1

            # Country risk: weighted average of country severities
            country_details = []
            if m.countries:
                country_weight = 1.0 / len(m.countries)
                country_risk_total = 0.0
                for c in m.countries:
                    base_score = c.get("severity", 1) / 3.0
                    # iLab adjustment: extra penalty for dual CL+FL
                    risk_types = c.get("risk_types", [])
                    ilab_adj = 0.15 if ("CL" in risk_types and "FL" in risk_types) else 0.0
                    final_c_score = min(base_score + ilab_adj, 1.0)
                    country_risk_total += final_c_score * country_weight

                    country_details.append({
                        "name": c.get("name", "Unknown"),
                        "weight": round(country_weight, 4),
                        "base_score": round(base_score, 4),
                        "ilab_adjustment": round(ilab_adj, 4),
                        "final_score": round(final_c_score, 4),
                        "risk_types": risk_types,
                        "severity": c.get("severity", 1),
                    })
                country_risk_value = country_risk_total
            else:
                country_risk_value = 0.3  # default moderate for unknown

            # Stage weight (all raw material stage for now)
            stage_weight = 1.0

            # Contribution to total
            contribution = material_weight * mat_risk_value * stage_weight
            total_supply_chain_risk += contribution

            material_details.append(MaterialRiskDetail(
                name=m.material,
                material_weight=round(material_weight, 4),
                material_risk={
                    "value": round(mat_risk_value, 4),
                    "breakdown": {
                        "dol_score": 1.0 if dol_listed else 0.0,
                        "ilo_sector_score": round(ilo_sector_score, 4),
                    },
                },
                country_risk={
                    "value": round(country_risk_value, 4),
                    "countries": country_details,
                },
                stage_weight=stage_weight,
                contribution=round(contribution, 4),
            ))
    else:
        # No known materials — moderate uncertainty
        total_supply_chain_risk = 0.4

    supply_chain_risk = min(total_supply_chain_risk, 1.0)

    # -- Step 2: Mitigation score --
    has_supplier = opacity_data.get("has_supplier_list", False)
    has_certs = opacity_data.get("has_certifications", False)
    has_esg = opacity_data.get("has_esg_report", False)
    has_trace = opacity_data.get("has_traceability", False)

    mitigation_factors = MitigationFactors(
        supplier_list=has_supplier,
        certifications=has_certs,
        esg_report=has_esg,
        traceability=has_trace,
    )

    # Each factor contributes 0.25 to mitigation (max 1.0)
    mitigation_value = sum([
        0.25 if has_supplier else 0,
        0.25 if has_certs else 0,
        0.25 if has_esg else 0,
        0.25 if has_trace else 0,
    ])

    # -- Step 3: Controversy score (placeholder — 0.1 baseline) --
    controversy_value = 0.1
    controversy_articles = 0  # Would be populated from real-time news API

    # -- Step 4: Final score calculation --
    # Final Risk = (supply_chain_risk * (1 - mitigation)) + controversy
    final_risk = (supply_chain_risk * (1 - mitigation_value)) + controversy_value
    final_risk = min(max(final_risk, 0), 1.0)

    # Convert to 0-100 score (higher = more ethical)
    final_score = round((1 - final_risk) * 100, 1)

    # Build formula display string
    formula_display = (
        f"Final Risk = ({supply_chain_risk:.4f} x (1 - {mitigation_value:.2f})) + {controversy_value:.2f} "
        f"= {final_risk:.4f} -> Score = {final_score}/100"
    )

    # -- Step 5: Confidence score --
    conf_ingredients = min(num_known / max(num_materials, 1), 1.0) if num_materials > 0 else 0.3
    conf_country = 1.0 if any(m.countries for m in material_risks) else 0.3
    conf_company = sum([
        0.25 if has_supplier else 0,
        0.25 if has_certs else 0,
        0.25 if has_esg else 0,
        0.25 if has_trace else 0,
    ])
    confidence_score = round((conf_ingredients * 0.4 + conf_country * 0.3 + conf_company * 0.3), 2)

    # -- Badge --
    if final_score >= 75:
        badge = "VERIFIED GREEN"
        badge_color = "bg-emerald-500"
    elif final_score >= 50:
        badge = "MODERATE RISK"
        badge_color = "bg-amber-500"
    elif final_score >= 25:
        badge = "HIGH RISK"
        badge_color = "bg-red-500"
    else:
        badge = "UNVERIFIED"
        badge_color = "bg-gray-400"

    # Build old-style EthicScoreResult for backward compat
    material_score = max(0, 100 - supply_chain_risk * 100)
    brand_score = opacity_data.get("transparency_score", 50)
    news_score = max(0, (1 - controversy_value) * 100)

    ethic_result = EthicScoreResult(
        overall_score=final_score,
        badge=badge,
        badge_color=badge_color,
        material_risk_index=round(material_score, 1),
        brand_disclosure_score=round(brand_score, 1),
        news_sentiment_score=round(news_score, 1),
        community_score=round(mitigation_value * 100, 1),
    )

    score_trace = ScoreTrace(
        final_score=final_score,
        components=ScoreComponents(
            supply_chain_risk=SupplyChainComponent(
                value=round(supply_chain_risk, 4),
                materials=material_details,
            ),
            mitigation_score=MitigationComponent(
                value=round(mitigation_value, 4),
                factors=mitigation_factors,
            ),
            controversy_score=ControversyComponent(
                value=round(controversy_value, 4),
                article_count=controversy_articles,
            ),
        ),
        formula_display=formula_display,
        confidence_score=confidence_score,
        confidence_factors={
            "known_ingredients": round(conf_ingredients, 2),
            "country_data_available": round(conf_country, 2),
            "company_data_available": round(conf_company, 2),
        },
    )

    return ethic_result, score_trace


# -- Endpoints ---------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "claude_available": claude is not None,
        "version": "2.0.0",
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
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

    # 4. AI Opacity Audit (returns dict with mitigation fields)
    opacity_data = ai_opacity_audit(product_name, brand, labels, category)

    # 5. Compute EthicScore WITH full trace
    ethic_score, score_trace = compute_ethic_score_with_trace(material_risks, opacity_data)

    # 6. Generate consumer summary
    summary = ai_generate_summary(
        product_name, brand, ethic_score.overall_score, material_risks, opacity_data
    )

    # 7. Generate natural language explanation
    natural_explanation = ai_generate_natural_explanation(
        product_name, brand, ethic_score.overall_score,
        score_trace.components.supply_chain_risk.value,
        score_trace.components.mitigation_score.value,
        score_trace.components.controversy_score.value,
        material_risks, opacity_data,
    )

    # 8. Suggest ethical alternatives
    alternatives = ai_suggest_alternatives(
        product_name, brand, category, ethic_score.overall_score
    )

    # Parse ingredients list
    ingredients_list = []
    if ingredients_text:
        ingredients_list = [i.strip() for i in ingredients_text.split(",") if i.strip()]

    # Build opacity audit model for response
    opacity_model = OpacityAudit(
        transparency_score=opacity_data["transparency_score"],
        flags=opacity_data["flags"],
        summary=opacity_data["summary"],
    )

    return AnalyzeResponse(
        product_name=product_name,
        brand=brand,
        category=category,
        image_url=image_url,
        ingredients=ingredients_list[:20],
        materials=material_risks,
        opacity_audit=opacity_model,
        ethic_score=ethic_score,
        score_trace=score_trace,
        ai_summary=summary,
        natural_language_explanation=natural_explanation,
        alternatives=alternatives,
    )


@app.get("/search")
async def search(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50)):
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
    if not claude:
        raise HTTPException(503, "AI image recognition requires Claude API key")

    image_data = req.image
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

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
    limit: int = Query(25, ge=1, le=50),
):
    search_query = NEWS_QUERIES.get(category.lower(), NEWS_QUERIES["all"])
    articles = await fetch_news_rss(search_query, count=limit)
    return {"category": category, "count": len(articles), "articles": articles}


@app.get("/news/summary")
async def get_article_summary(url: str = Query(..., description="Article URL to summarize")):
    result = await summarize_article(url)
    return result


@app.get("/news/for-you")
async def get_personalized_news(
    materials: str = Query("", description="Comma-separated materials from scan history"),
    categories: str = Query("", description="Comma-separated product categories"),
    limit: int = Query(25, ge=1, le=50),
):
    terms = []
    if materials:
        mat_list = [m.strip() for m in materials.split(",") if m.strip()]
        terms.extend(mat_list[:5])
    if categories:
        cat_list = [c.strip() for c in categories.split(",") if c.strip()]
        terms.extend(cat_list[:3])

    if not terms:
        search_query = NEWS_QUERIES["all"]
    else:
        search_query = " ".join(terms) + " ethical sourcing sustainability"

    articles = await fetch_news_rss(search_query, count=limit)
    return {"personalized": True, "query_terms": terms, "count": len(articles), "articles": articles}
