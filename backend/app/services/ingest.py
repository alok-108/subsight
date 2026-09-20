import io
import re
import csv
import hashlib
from datetime import datetime, date
from typing import List, Dict, Any, Tuple, Optional
from app.services.normalize import clean_merchant_string

HEADER_ALIASES = {
    "date": ["date", "transaction date", "txn date", "value date", "trans date"],
    "merchant": ["merchant", "merchant name", "payee", "biller", "vendor"],
    "description": ["description", "narration", "particulars", "remarks", "details", "transaction details"],
    "amount": ["amount", "txn amount", "transaction amount", "total", "net amount"],
    "debit": ["debit", "withdrawal", "withdrawal amt", "withdrawal amt.", "dr", "debit amount"],
    "credit": ["credit", "deposit", "deposit amt", "deposit amt.", "cr", "credit amount"],
    "category": ["category", "expense category", "type"]
}


def parse_date(date_str: str) -> Optional[date]:
    """Tries parsing various date formats into datetime.date."""
    if not date_str:
        return None
    s = str(date_str).strip()
    # Replace separators with hyphen
    formats = [
        "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        "%d-%b-%Y", "%d %b %Y", "%d-%B-%Y", "%Y/%m/%d"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def parse_amount(val: Any) -> Optional[float]:
    """Cleans currency symbols, commas, and parses to positive float."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    # Strip currency symbols and commas
    cleaned = re.sub(r"[^\d.-]", "", s)
    try:
        amt = float(cleaned)
        return abs(amt)
    except ValueError:
        return None


def match_column(col_name: str) -> Optional[str]:
    """Matches a table header to a standardized field name."""
    c = col_name.strip().lower()
    for field, aliases in HEADER_ALIASES.items():
        if c in aliases or any(alias in c for alias in aliases):
            return field
    return None


def compute_dedupe_key(user_id: int, txn_date: date, merchant_clean: str, amount: float, direction: str) -> str:
    raw_key = f"{user_id}_{txn_date.isoformat()}_{merchant_clean}_{amount:.2f}_{direction}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:32]


def parse_csv_content(content_bytes: bytes, user_id: int) -> Tuple[List[Dict[str, Any]], List[str], int, int]:
    """
    Parses CSV content into normalized row dicts and warning logs.
    Returns (valid_rows, warnings, total_rows, failed_count).
    """
    warnings: List[str] = []
    valid_rows: List[Dict[str, Any]] = []
    
    # Try decoding utf-8, fallback to latin-1
    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return [], ["File contains no data"], 0, 0

    # Locate header row
    header_idx = -1
    col_map: Dict[str, int] = {}
    
    for idx, row in enumerate(rows[:10]):
        mapped = {}
        for c_idx, cell in enumerate(row):
            matched = match_column(cell)
            if matched:
                mapped[matched] = c_idx
        if "date" in mapped and ("amount" in mapped or "debit" in mapped):
            header_idx = idx
            col_map = mapped
            break

    if header_idx == -1:
        # Fallback: assume default order date, merchant, description, amount, direction, account_holder, category
        col_map = {
            "date": 0,
            "merchant": 1,
            "description": 2,
            "amount": 3,
            "direction": 4,
            "category": 6 if len(rows[0]) > 6 else -1
        }
        header_idx = 0

    data_rows = rows[header_idx + 1:]
    total_rows = len(data_rows)
    failed_count = 0

    for line_num, row in enumerate(data_rows, start=header_idx + 2):
        if not row or all(not cell.strip() for cell in row):
            continue

        # Extract Date
        date_col = col_map.get("date", 0)
        date_str = row[date_col] if date_col < len(row) else ""
        parsed_d = parse_date(date_str)
        if not parsed_d:
            warnings.append(f"Line {line_num}: Unparseable date '{date_str}'")
            failed_count += 1
            continue

        # Extract Amount and Direction
        direction = "debit"
        amt: Optional[float] = None

        if "debit" in col_map and col_map["debit"] < len(row) and row[col_map["debit"]].strip():
            amt = parse_amount(row[col_map["debit"]])
            direction = "debit"
        elif "credit" in col_map and col_map["credit"] < len(row) and row[col_map["credit"]].strip():
            amt = parse_amount(row[col_map["credit"]])
            direction = "credit"
        elif "amount" in col_map and col_map["amount"] < len(row):
            amt = parse_amount(row[col_map["amount"]])
            if "direction" in col_map and col_map["direction"] < len(row):
                d_val = row[col_map["direction"]].strip().lower()
                if "cr" in d_val or "credit" in d_val:
                    direction = "credit"
                else:
                    direction = "debit"

        if amt is None:
            warnings.append(f"Line {line_num}: Unparseable or missing amount in row")
            failed_count += 1
            continue

        # Extract Merchant and Description
        merchant_col = col_map.get("merchant")
        desc_col = col_map.get("description")
        
        merchant_raw = ""
        description = ""
        
        if merchant_col is not None and merchant_col < len(row):
            merchant_raw = row[merchant_col].strip()
        if desc_col is not None and desc_col < len(row):
            description = row[desc_col].strip()

        if not merchant_raw and description:
            merchant_raw = description
        elif not description and merchant_raw:
            description = merchant_raw
        elif not merchant_raw and not description:
            merchant_raw = "Unknown Merchant"
            description = "Transaction"

        # Category
        cat_col = col_map.get("category")
        category = "General"
        if cat_col is not None and cat_col >= 0 and cat_col < len(row):
            c_val = row[cat_col].strip()
            if c_val:
                category = c_val

        clean_m = clean_merchant_string(merchant_raw)
        dedupe = compute_dedupe_key(user_id, parsed_d, clean_m, amt, direction)

        valid_rows.append({
            "date": parsed_d,
            "merchant_raw": merchant_raw,
            "description": description,
            "amount": amt,
            "direction": direction,
            "category": category,
            "dedupe_key": dedupe
        })

    return valid_rows, warnings, total_rows, failed_count


def parse_pdf_content(content_bytes: bytes, user_id: int) -> Tuple[List[Dict[str, Any]], List[str], int, int]:
    """
    Extracts transaction tables and lines from PDF files using pdfplumber.
    """
    import pdfplumber
    warnings: List[str] = []
    valid_rows: List[Dict[str, Any]] = []
    total_extracted = 0
    failed_count = 0

    try:
        with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                # Try table extraction first
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        # Use same parsing strategy as CSV on the table rows
                        # Convert table to csv lines
                        output = io.StringIO()
                        writer = csv.writer(output)
                        writer.writerows(table)
                        csv_bytes = output.getvalue().encode("utf-8")
                        sub_rows, sub_warns, sub_total, sub_failed = parse_csv_content(csv_bytes, user_id)
                        valid_rows.extend(sub_rows)
                        total_extracted += sub_total
                        failed_count += sub_failed
                        warnings.extend([f"Page {page_num}: {w}" for w in sub_warns])
                else:
                    # Text fallback line by line
                    text = page.extract_text() or ""
                    lines = text.split("\n")
                    for l_idx, line in enumerate(lines):
                        # Pattern: date, some text, amount
                        # e.g., 2024-05-12 NETFLIX MUMBAI 649.00
                        match = re.search(r"(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})", line)
                        if match:
                            d_str, desc, amt_str = match.groups()
                            p_date = parse_date(d_str)
                            p_amt = parse_amount(amt_str)
                            if p_date and p_amt:
                                clean_m = clean_merchant_string(desc)
                                dedupe = compute_dedupe_key(user_id, p_date, clean_m, p_amt, "debit")
                                valid_rows.append({
                                    "date": p_date,
                                    "merchant_raw": desc.strip(),
                                    "description": desc.strip(),
                                    "amount": p_amt,
                                    "direction": "debit",
                                    "category": "General",
                                    "dedupe_key": dedupe
                                })
                                total_extracted += 1
    except Exception as e:
        warnings.append(f"PDF parsing error: {str(e)}")

    return valid_rows, warnings, total_extracted, failed_count
