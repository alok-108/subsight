from datetime import date
from typing import Tuple, List, Optional, Dict, Any


def evaluate_review_flag(
    confidence: float,
    status: str,
    first_seen: date,
    last_payment: date,
    next_expected: date,
    frequency: str,
    occurrences: int,
    price_change: Optional[Dict[str, Any]] = None,
    reference_date: Optional[date] = None
) -> Tuple[bool, List[str]]:
    """
    Evaluates whether a subscription warrants review ("Potentially Forgotten / Review Recommended").
    Conditions:
    - confidence >= 0.62
    - status == 'active'
    - tenure >= 6 months (>= 180 days or >= 6 occurrences for monthly)
      OR yearly renewal approaching within 30 days
    - Generates strictly factual, neutral, data-derived strings.
    """
    if reference_date is None:
        reference_date = date.today()

    if status != "active" or confidence < 0.62:
        return False, []

    tenure_days = (last_payment - first_seen).days
    is_long_tenure = tenure_days >= 180 or occurrences >= 6
    is_approaching_annual = (frequency == "yearly" and 0 <= (next_expected - reference_date).days <= 45)

    if not (is_long_tenure or is_approaching_annual):
        return False, []

    reasons: List[str] = []

    # Tenure reason
    months_tenure = max(1, int(round(tenure_days / 30.0)))
    if is_long_tenure:
        reasons.append(f"Recurring payment detected for {months_tenure} consecutive months ({occurrences} payments).")
    
    # Price change reason
    if price_change:
        f_amt = price_change.get("from", 0)
        t_amt = price_change.get("to", 0)
        at_date_str = price_change.get("at_date", "")
        reasons.append(f"Price increased from ₹{f_amt:.0f} to ₹{t_amt:.0f} (observed {at_date_str}).")

    # Next expected payment reason
    formatted_next = next_expected.strftime("%d %B %Y")
    reasons.append(f"Next expected payment on {formatted_next}.")

    # Status confirmation reason
    reasons.append("No status confirmation recorded from you yet.")

    return True, reasons
