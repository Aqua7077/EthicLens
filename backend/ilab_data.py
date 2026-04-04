"""ILAB (International Labor Affairs Bureau) risk data.

Based on the US DOL's List of Goods Produced by Child Labor or Forced Labor.
https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods

Maps raw materials/commodities to countries with known child labor (CL)
or forced labor (FL) risks, plus a base risk score (0-100).
"""

# Each entry: commodity -> list of { country, risk_types, severity }
# severity: 1 = reported, 2 = significant, 3 = widespread
ILAB_RISK_DB: dict[str, list[dict]] = {
    "cocoa": [
        {"country": "Cote d'Ivoire", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Ghana", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Cameroon", "risk_types": ["CL"], "severity": 2},
        {"country": "Guinea", "risk_types": ["CL"], "severity": 2},
        {"country": "Nigeria", "risk_types": ["CL"], "severity": 2},
        {"country": "Sierra Leone", "risk_types": ["CL"], "severity": 1},
    ],
    "coffee": [
        {"country": "Brazil", "risk_types": ["FL"], "severity": 2},
        {"country": "Colombia", "risk_types": ["CL"], "severity": 2},
        {"country": "Cote d'Ivoire", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Dominican Republic", "risk_types": ["CL"], "severity": 1},
        {"country": "Guatemala", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Honduras", "risk_types": ["CL"], "severity": 2},
        {"country": "Kenya", "risk_types": ["CL"], "severity": 1},
        {"country": "Mexico", "risk_types": ["CL"], "severity": 1},
        {"country": "Panama", "risk_types": ["CL"], "severity": 1},
        {"country": "Tanzania", "risk_types": ["CL"], "severity": 1},
        {"country": "Uganda", "risk_types": ["CL"], "severity": 1},
    ],
    "sugar": [
        {"country": "Bolivia", "risk_types": ["CL"], "severity": 2},
        {"country": "Brazil", "risk_types": ["FL"], "severity": 2},
        {"country": "Dominican Republic", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Myanmar", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Pakistan", "risk_types": ["CL"], "severity": 2},
        {"country": "Philippines", "risk_types": ["CL"], "severity": 1},
    ],
    "palm oil": [
        {"country": "Indonesia", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Malaysia", "risk_types": ["FL"], "severity": 3},
        {"country": "Sierra Leone", "risk_types": ["CL"], "severity": 1},
    ],
    "cotton": [
        {"country": "Benin", "risk_types": ["CL"], "severity": 2},
        {"country": "Burkina Faso", "risk_types": ["CL"], "severity": 2},
        {"country": "China", "risk_types": ["FL"], "severity": 3},
        {"country": "India", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Kazakhstan", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Pakistan", "risk_types": ["CL"], "severity": 2},
        {"country": "Tajikistan", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Turkmenistan", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Uzbekistan", "risk_types": ["CL", "FL"], "severity": 2},
    ],
    "rubber": [
        {"country": "Cambodia", "risk_types": ["FL"], "severity": 2},
        {"country": "Indonesia", "risk_types": ["CL"], "severity": 1},
        {"country": "Liberia", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Myanmar", "risk_types": ["CL", "FL"], "severity": 2},
    ],
    "leather": [
        {"country": "Argentina", "risk_types": ["CL"], "severity": 1},
        {"country": "Bangladesh", "risk_types": ["CL"], "severity": 2},
        {"country": "India", "risk_types": ["CL"], "severity": 2},
    ],
    "tobacco": [
        {"country": "Brazil", "risk_types": ["CL"], "severity": 2},
        {"country": "Indonesia", "risk_types": ["CL"], "severity": 2},
        {"country": "Malawi", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Mexico", "risk_types": ["CL"], "severity": 1},
        {"country": "Zimbabwe", "risk_types": ["CL", "FL"], "severity": 2},
    ],
    "tea": [
        {"country": "Kenya", "risk_types": ["CL"], "severity": 1},
        {"country": "Malawi", "risk_types": ["CL"], "severity": 1},
        {"country": "Tanzania", "risk_types": ["CL"], "severity": 1},
        {"country": "Uganda", "risk_types": ["CL"], "severity": 1},
    ],
    "rice": [
        {"country": "Myanmar", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "India", "risk_types": ["CL"], "severity": 1},
        {"country": "Mali", "risk_types": ["CL"], "severity": 1},
    ],
    "fish": [
        {"country": "Ghana", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Myanmar", "risk_types": ["FL"], "severity": 2},
        {"country": "Thailand", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Taiwan", "risk_types": ["FL"], "severity": 2},
    ],
    "shrimp": [
        {"country": "Bangladesh", "risk_types": ["CL"], "severity": 2},
        {"country": "Cambodia", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Myanmar", "risk_types": ["FL"], "severity": 2},
        {"country": "Thailand", "risk_types": ["CL", "FL"], "severity": 3},
    ],
    "garments": [
        {"country": "Argentina", "risk_types": ["FL"], "severity": 2},
        {"country": "Bangladesh", "risk_types": ["CL"], "severity": 2},
        {"country": "Brazil", "risk_types": ["FL"], "severity": 2},
        {"country": "China", "risk_types": ["FL"], "severity": 2},
        {"country": "India", "risk_types": ["CL"], "severity": 2},
        {"country": "Jordan", "risk_types": ["FL"], "severity": 2},
        {"country": "Malaysia", "risk_types": ["FL"], "severity": 2},
        {"country": "Thailand", "risk_types": ["FL"], "severity": 2},
        {"country": "Vietnam", "risk_types": ["FL"], "severity": 1},
    ],
    "electronics": [
        {"country": "China", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Malaysia", "risk_types": ["FL"], "severity": 2},
        {"country": "Thailand", "risk_types": ["FL"], "severity": 1},
    ],
    "cobalt": [
        {"country": "DR Congo", "risk_types": ["CL", "FL"], "severity": 3},
    ],
    "gold": [
        {"country": "Burkina Faso", "risk_types": ["CL"], "severity": 2},
        {"country": "DR Congo", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Mali", "risk_types": ["CL"], "severity": 2},
        {"country": "Niger", "risk_types": ["CL"], "severity": 2},
        {"country": "North Korea", "risk_types": ["FL"], "severity": 3},
        {"country": "Peru", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Philippines", "risk_types": ["CL"], "severity": 1},
    ],
    "tin": [
        {"country": "DR Congo", "risk_types": ["CL", "FL"], "severity": 3},
        {"country": "Indonesia", "risk_types": ["CL"], "severity": 2},
        {"country": "Myanmar", "risk_types": ["FL"], "severity": 2},
    ],
    "mica": [
        {"country": "India", "risk_types": ["CL"], "severity": 3},
        {"country": "Madagascar", "risk_types": ["CL"], "severity": 2},
    ],
    "vanilla": [
        {"country": "Madagascar", "risk_types": ["CL"], "severity": 2},
    ],
    "bananas": [
        {"country": "Belize", "risk_types": ["CL"], "severity": 1},
        {"country": "Dominican Republic", "risk_types": ["CL"], "severity": 1},
    ],
    "soy": [
        {"country": "Bolivia", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "Brazil", "risk_types": ["FL"], "severity": 1},
        {"country": "Paraguay", "risk_types": ["CL"], "severity": 1},
    ],
    "timber": [
        {"country": "Brazil", "risk_types": ["FL"], "severity": 2},
        {"country": "Cambodia", "risk_types": ["FL"], "severity": 2},
        {"country": "Myanmar", "risk_types": ["FL"], "severity": 2},
        {"country": "North Korea", "risk_types": ["FL"], "severity": 2},
        {"country": "Peru", "risk_types": ["FL"], "severity": 2},
    ],
    "bamboo": [
        {"country": "China", "risk_types": ["FL"], "severity": 1},
        {"country": "Myanmar", "risk_types": ["FL"], "severity": 1},
    ],
    "wool": [
        {"country": "Argentina", "risk_types": ["CL"], "severity": 1},
    ],
    "silk": [
        {"country": "India", "risk_types": ["CL"], "severity": 2},
        {"country": "Uzbekistan", "risk_types": ["CL", "FL"], "severity": 2},
    ],
    "diamonds": [
        {"country": "Angola", "risk_types": ["CL", "FL"], "severity": 2},
        {"country": "DR Congo", "risk_types": ["CL"], "severity": 2},
        {"country": "Sierra Leone", "risk_types": ["CL"], "severity": 2},
    ],
    "polyester": [
        {"country": "China", "risk_types": ["FL"], "severity": 1},
    ],
    "lithium": [
        {"country": "Chile", "risk_types": ["CL"], "severity": 1},
    ],
    "wheat": [
        {"country": "India", "risk_types": ["CL"], "severity": 1},
    ],
    "milk": [
        {"country": "India", "risk_types": ["CL"], "severity": 1},
    ],
}

# Aliases — map common ingredient names to ILAB commodity keys
MATERIAL_ALIASES: dict[str, str] = {
    "cacao": "cocoa",
    "chocolate": "cocoa",
    "cocoa butter": "cocoa",
    "cocoa mass": "cocoa",
    "cocoa powder": "cocoa",
    "sugarcane": "sugar",
    "cane sugar": "sugar",
    "brown sugar": "sugar",
    "raw sugar": "sugar",
    "palm": "palm oil",
    "palm kernel oil": "palm oil",
    "palm fat": "palm oil",
    "palmitate": "palm oil",
    "cottonseed": "cotton",
    "cotton seed oil": "cotton",
    "natural rubber": "rubber",
    "latex": "rubber",
    "cowhide": "leather",
    "suede": "leather",
    "textile": "garments",
    "fabric": "garments",
    "nylon": "garments",
    "apparel": "garments",
    "clothing": "garments",
    "seafood": "fish",
    "tuna": "fish",
    "salmon": "fish",
    "prawns": "shrimp",
    "soybean": "soy",
    "soya": "soy",
    "soy lecithin": "soy",
    "soy sauce": "soy",
    "wood": "timber",
    "paper": "timber",
    "cardboard": "timber",
    "packaging": "timber",
    "battery": "cobalt",
    "lithium-ion": "cobalt",
    "microchip": "electronics",
    "semiconductor": "electronics",
    "circuit board": "electronics",
}


def resolve_material(name: str) -> str | None:
    """Resolve a material name to an ILAB commodity key."""
    name_lower = name.lower().strip()
    if name_lower in ILAB_RISK_DB:
        return name_lower
    if name_lower in MATERIAL_ALIASES:
        return MATERIAL_ALIASES[name_lower]
    # Partial match
    for alias, commodity in MATERIAL_ALIASES.items():
        if alias in name_lower or name_lower in alias:
            return commodity
    for commodity in ILAB_RISK_DB:
        if commodity in name_lower or name_lower in commodity:
            return commodity
    return None


def get_material_risk(material: str) -> dict:
    """Get ILAB risk data for a material.

    Returns:
        {
            "material": str,
            "commodity": str or None,
            "risk_score": float (0-100),
            "risk_level": "low" | "medium" | "high" | "critical",
            "countries": [...],
            "has_child_labor": bool,
            "has_forced_labor": bool,
        }
    """
    commodity = resolve_material(material)
    if commodity is None:
        return {
            "material": material,
            "commodity": None,
            "risk_score": 0,
            "risk_level": "unknown",
            "countries": [],
            "has_child_labor": False,
            "has_forced_labor": False,
        }

    entries = ILAB_RISK_DB[commodity]
    max_severity = max(e["severity"] for e in entries)
    num_countries = len(entries)
    has_cl = any("CL" in e["risk_types"] for e in entries)
    has_fl = any("FL" in e["risk_types"] for e in entries)

    # Score formula: base from severity, scaled by breadth
    base = {1: 30, 2: 55, 3: 80}[max_severity]
    breadth_bonus = min(num_countries * 2, 20)
    dual_penalty = 10 if (has_cl and has_fl) else 0
    risk_score = min(base + breadth_bonus + dual_penalty, 100)

    if risk_score >= 75:
        risk_level = "critical"
    elif risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 25:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "material": material,
        "commodity": commodity,
        "risk_score": round(risk_score, 1),
        "risk_level": risk_level,
        "countries": [
            {
                "name": e["country"],
                "risk_types": e["risk_types"],
                "severity": e["severity"],
            }
            for e in sorted(entries, key=lambda x: -x["severity"])
        ],
        "has_child_labor": has_cl,
        "has_forced_labor": has_fl,
    }
