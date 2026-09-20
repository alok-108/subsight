import re
from typing import Tuple, Optional, Dict, List
from sqlalchemy.orm import Session
from app.models import Merchant

NOISE_TOKENS = {
    "POS", "UPI", "IMPS", "NEFT", "ACH", "TXN", "REF", "PAYMENT", 
    "PVT", "LTD", "IN", "COM", "WWW", "LIMITED", "PRIVATE", "BILL", 
    "PAY", "DIRECT", "ONLINE", "INDIRA", "SUBSCRIPTION", "RECURRING"
}

TRAILING_CITIES = {
    "MUMBAI", "BENGALURU", "BANGALORE", "DELHI", "NEW DELHI", 
    "HYDERABAD", "CHENNAI", "PUNE", "KOLKATA", "GURGAON", "NOIDA", "AHMEDABAD"
}

CANONICAL_MERCHANTS: Dict[str, Dict] = {
    "netflix": {
        "canonical_name": "Netflix",
        "slug": "netflix",
        "default_category": "Entertainment",
        "aliases": ["NETFLIX", "NETFLIX COM", "NETFLIX IN", "NETFLIX INDIA"],
        "regex": r"\bNETFLIX\b"
    },
    "spotify": {
        "canonical_name": "Spotify",
        "slug": "spotify",
        "default_category": "Entertainment",
        "aliases": ["SPOTIFY", "SPOTIFY INDIA", "SPOTIFY PREMIUM"],
        "regex": r"\bSPOTIFY\b"
    },
    "amazon-prime": {
        "canonical_name": "Amazon Prime",
        "slug": "amazon-prime",
        "default_category": "Entertainment",
        "aliases": ["AMAZON PRIME", "AMZN PRIME", "PRIME VIDEO"],
        "regex": r"\b(AMAZON\s*PRIME|AMZN\s*PRIME|PRIME\s*VIDEO)\b"
    },
    "google-one": {
        "canonical_name": "Google One",
        "slug": "google-one",
        "default_category": "Utilities",
        "aliases": ["GOOGLE ONE", "GOOGLE STORAGE", "GOOGLE DRIVE", "GOOGLE CLOUD"],
        "regex": r"\b(GOOGLE\s*ONE|GOOGLE\s*STORAGE)\b"
    },
    "adobe-creative-cloud": {
        "canonical_name": "Adobe Creative Cloud",
        "slug": "adobe-creative-cloud",
        "default_category": "Productivity",
        "aliases": ["ADOBE", "ADOBE SYSTEMS", "ADOBE CREATIVE"],
        "regex": r"\bADOBE\b"
    },
    "youtube-premium": {
        "canonical_name": "YouTube Premium",
        "slug": "youtube-premium",
        "default_category": "Entertainment",
        "aliases": ["YOUTUBE", "YOUTUBE PREMIUM", "YT PREMIUM"],
        "regex": r"\b(YOUTUBE|YT\s*PREMIUM)\b"
    },
    "cult-fit": {
        "canonical_name": "Cult.fit",
        "slug": "cult-fit",
        "default_category": "Health & Fitness",
        "aliases": ["CULT FIT", "CUREFIT", "CULTFIT"],
        "regex": r"\b(CULT\s*FIT|CURE\s*FIT|CULTFIT)\b"
    },
    "zomato-gold": {
        "canonical_name": "Zomato Gold",
        "slug": "zomato-gold",
        "default_category": "Food & Dining",
        "aliases": ["ZOMATO GOLD", "ZOMATO PRO"],
        "regex": r"\b(ZOMATO\s*GOLD|ZOMATO\s*PRO)\b"
    },
    "icloud-plus": {
        "canonical_name": "iCloud+",
        "slug": "icloud-plus",
        "default_category": "Utilities",
        "aliases": ["ICLOUD", "APPLE ICLOUD", "APPLE COM BILL"],
        "regex": r"\b(ICLOUD|APPLE\s*ICLOUD)\b"
    },
    "cloud-storage": {
        "canonical_name": "Cloud Storage",
        "slug": "cloud-storage",
        "default_category": "Utilities",
        "aliases": ["CLOUD STORAGE", "ZOHO DRIVE", "DRIVE STORAGE"],
        "regex": r"\b(CLOUD\s*STORAGE|ZOHO\s*DRIVE|DRIVE\s*STORAGE)\b"
    },
    # Common non-recurring merchants
    "swiggy": {
        "canonical_name": "Swiggy",
        "slug": "swiggy",
        "default_category": "Food & Dining",
        "aliases": ["SWIGGY", "BUNDL TECHNOLOGIES"],
        "regex": r"\bSWIGGY\b"
    },
    "zomato": {
        "canonical_name": "Zomato",
        "slug": "zomato",
        "default_category": "Food & Dining",
        "aliases": ["ZOMATO", "ZOMATO MEDIA"],
        "regex": r"\bZOMATO\b(?!.*GOLD)"
    },
    "uber": {
        "canonical_name": "Uber",
        "slug": "uber",
        "default_category": "Transport",
        "aliases": ["UBER", "UBER TRIP", "UBER INDIA"],
        "regex": r"\bUBER\b"
    },
    "ola": {
        "canonical_name": "Ola",
        "slug": "ola",
        "default_category": "Transport",
        "aliases": ["OLA", "OLA CABS", "ANI TECHNOLOGIES"],
        "regex": r"\bOLA\b"
    },
    "blinkit": {
        "canonical_name": "Blinkit",
        "slug": "blinkit",
        "default_category": "Groceries",
        "aliases": ["BLINKIT", "GROFERS"],
        "regex": r"\b(BLINKIT|GROFERS)\b"
    },
    "zepto": {
        "canonical_name": "Zepto",
        "slug": "zepto",
        "default_category": "Groceries",
        "aliases": ["ZEPTO", "KIRANAKART"],
        "regex": r"\bZEPTO\b"
    },
    "bigbasket": {
        "canonical_name": "BigBasket",
        "slug": "bigbasket",
        "default_category": "Groceries",
        "aliases": ["BIGBASKET", "INNOVATIVE RETAIL"],
        "regex": r"\bBIGBASKET\b"
    },
    "dmart": {
        "canonical_name": "DMart",
        "slug": "dmart",
        "default_category": "Groceries",
        "aliases": ["DMART", "AVENUE SUPERMARTS"],
        "regex": r"\bDMART\b"
    },
    "bookmyshow": {
        "canonical_name": "BookMyShow",
        "slug": "bookmyshow",
        "default_category": "Entertainment",
        "aliases": ["BOOKMYSHOW", "BIGTREE ENTERTAINMENT"],
        "regex": r"\bBOOKMYSHOW\b"
    }
}


def clean_merchant_string(raw: str) -> str:
    """
    Cleans raw merchant strings:
    1. Uppercase, remove punctuation, collapse whitespace.
    2. Remove noise tokens, pure digits, short tokens (<=2), and star-prefixed fragments.
    3. Strip trailing Indian cities.
    """
    if not raw:
        return "UNKNOWN"
        
    s = raw.upper()
    # Remove *12345 or *anything
    s = re.sub(r"\*[A-Za-z0-9]+", " ", s)
    # Replace punctuation with space
    s = re.sub(r"[^\w\s]", " ", s)
    # Tokenize
    tokens = s.split()
    
    filtered_tokens = []
    for t in tokens:
        if t in NOISE_TOKENS:
            continue
        if t.isdigit():
            continue
        if len(t) <= 2:
            continue
        filtered_tokens.append(t)
        
    if not filtered_tokens:
        # Fall back to original alphanumeric if all was stripped
        cleaned_fallback = re.sub(r"[^\w\s]", " ", raw.upper()).strip()
        filtered_tokens = [w for w in cleaned_fallback.split() if w]
        
    # Check trailing city tokens
    if filtered_tokens and filtered_tokens[-1] in TRAILING_CITIES:
        filtered_tokens.pop()
        
    cleaned = " ".join(filtered_tokens).strip()
    return cleaned if cleaned else "UNKNOWN"


def token_set_similarity(str1: str, str2: str) -> float:
    """Calculates Jaccard / token-set similarity between two strings."""
    tokens1 = set(str1.upper().split())
    tokens2 = set(str2.upper().split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


def normalize_merchant(raw_name: str) -> Tuple[str, str, str, bool]:
    """
    Given a raw merchant string, returns:
    (canonical_name, slug, category, is_matched_to_canonical)
    """
    cleaned = clean_merchant_string(raw_name)
    raw_upper = raw_name.upper()
    
    # 1. Check exact regex patterns
    for slug, info in CANONICAL_MERCHANTS.items():
        if re.search(info["regex"], raw_upper, re.IGNORECASE) or re.search(info["regex"], cleaned, re.IGNORECASE):
            return info["canonical_name"], info["slug"], info["default_category"], True
            
    # 2. Check alias token overlap or fuzzy token-set match >= 0.85
    best_match = None
    best_score = 0.0
    
    for slug, info in CANONICAL_MERCHANTS.items():
        for alias in info["aliases"]:
            score = token_set_similarity(cleaned, alias)
            if score > best_score:
                best_score = score
                best_match = info
                
    if best_match and best_score >= 0.85:
        return best_match["canonical_name"], best_match["slug"], best_match["default_category"], True
        
    # 3. Fallback: Title-case cleaned name
    slug = re.sub(r"[^a-z0-9]+", "-", cleaned.lower()).strip("-")
    if not slug:
        slug = "unknown-merchant"
    canonical = cleaned.title()
    return canonical, slug, "General", False


def get_or_create_merchant(db: Session, raw_name: str) -> Tuple[Merchant, bool]:
    """
    Resolves a raw name to a Merchant DB record.
    Returns (merchant, is_matched_to_canonical).
    """
    canonical_name, slug, category, is_canonical = normalize_merchant(raw_name)
    
    merchant = db.query(Merchant).filter(Merchant.slug == slug).first()
    if not merchant:
        merchant = Merchant(
            canonical_name=canonical_name,
            slug=slug,
            aliases=[clean_merchant_string(raw_name)],
            default_category=category
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
    else:
        # Add alias if not present
        cleaned = clean_merchant_string(raw_name)
        current_aliases = merchant.aliases or []
        if cleaned not in current_aliases:
            current_aliases.append(cleaned)
            merchant.aliases = current_aliases
            db.commit()
            
    return merchant, is_canonical
