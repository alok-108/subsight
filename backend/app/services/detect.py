import math
import statistics
from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import Transaction, Merchant, Subscription, DetectionResult
from app.services.scoring import evaluate_review_flag


def clamp(val: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, val))


def cluster_amounts(txns: List[Transaction]) -> List[List[Transaction]]:
    """
    Clusters transactions by amount using tolerance:
    tolerance = max(20.0, 0.05 * median_amount).
    Also performs price-revision merge if two adjacent clusters appear
    in non-interleaved chronological runs and price delta <= 25%.
    """
    if not txns:
        return []
        
    sorted_txns = sorted(txns, key=lambda t: t.amount)
    raw_clusters: List[List[Transaction]] = []
    
    for t in sorted_txns:
        placed = False
        for c in raw_clusters:
            median_amt = statistics.median([x.amount for x in c])
            tol = max(20.0, 0.05 * median_amt)
            if abs(t.amount - median_amt) <= tol:
                c.append(t)
                placed = True
                break
        if not placed:
            raw_clusters.append([t])

    # Sort each cluster chronologically
    for c in raw_clusters:
        c.sort(key=lambda x: x.date)

    if len(raw_clusters) <= 1:
        return raw_clusters

    # Check for Price-Revision Merge between cluster pairs
    # Sort clusters by their median date or first transaction date
    raw_clusters.sort(key=lambda c: c[0].date)
    
    merged_clusters: List[List[Transaction]] = []
    i = 0
    while i < len(raw_clusters):
        current = raw_clusters[i]
        if i + 1 < len(raw_clusters):
            nxt = raw_clusters[i + 1]
            med_curr = statistics.median([x.amount for x in current])
            med_nxt = statistics.median([x.amount for x in nxt])
            
            # Non-interleaved chronological check:
            # all of current before all of nxt (or minimal 1 overlap)
            last_curr_date = max(x.date for x in current)
            first_nxt_date = min(x.date for x in nxt)
            
            price_change_ratio = abs(med_nxt - med_curr) / min(med_curr, med_nxt)
            
            if first_nxt_date >= last_curr_date and price_change_ratio <= 0.25:
                # Merge clusters: price revision detected!
                combined = current + nxt
                combined.sort(key=lambda x: x.date)
                merged_clusters.append(combined)
                i += 2
                continue
        merged_clusters.append(current)
        i += 1

    return merged_clusters


def analyze_cadence(txns: List[Transaction], merchant_slug: str) -> Tuple[Optional[str], float, List[int], float]:
    """
    Determines frequency ('weekly', 'monthly', 'quarterly', 'yearly') and delta metrics.
    Returns (frequency, median_delta, intervals, stdev_delta).
    """
    if len(txns) < 2:
        # Single transaction edge case: Check if known annual merchant or amount indicates annual
        if merchant_slug in ["amazon-prime"] or (txns and txns[0].amount in [1499.0, 999.0, 2999.0]):
            return "yearly", 365.0, [365], 0.0
        return None, 0.0, [], 0.0

    # Compute raw day deltas between consecutive transactions
    raw_deltas = [(txns[i].date - txns[i - 1].date).days for i in range(1, len(txns))]
    
    if not raw_deltas:
        return None, 0.0, [], 0.0

    initial_median = statistics.median(raw_deltas)
    
    # Handle skipped payment tolerance (up to 2.2x median_delta)
    normalized_deltas = []
    for d in raw_deltas:
        if initial_median > 0 and 1.8 * initial_median <= d <= 2.3 * initial_median:
            # Tolerated single skipped cycle: normalize into two cycles of d/2
            half_d = int(round(d / 2.0))
            normalized_deltas.extend([half_d, half_d])
        else:
            normalized_deltas.append(d)

    median_delta = statistics.median(normalized_deltas)
    stdev_delta = statistics.stdev(normalized_deltas) if len(normalized_deltas) > 1 else 0.0

    freq = None
    if 5 <= median_delta <= 9:
        freq = "weekly"
    elif 25 <= median_delta <= 35:
        freq = "monthly"
    elif 80 <= median_delta <= 100:
        freq = "quarterly"
    elif 340 <= median_delta <= 385:
        freq = "yearly"

    return freq, median_delta, raw_deltas, stdev_delta


def calculate_confidence(
    intervals: List[int],
    median_delta: float,
    stdev_delta: float,
    amounts: List[float],
    n_occurrences: int,
    canonical_matches: int,
    last_payment: date,
    reference_date: date
) -> Tuple[float, str, Dict[str, float]]:
    """
    Calculates composite confidence score (0.0 to 1.0) and assigns band.
    """
    if n_occurrences == 1 and median_delta >= 350:
        # Annual single charge special confidence
        return 0.82, "high", {
            "interval_score": 0.9,
            "amount_score": 1.0,
            "count_score": 0.6,
            "merchant_score": 1.0,
            "recency_score": 1.0
        }

    # 1. Interval regularity score
    if not intervals or median_delta <= 0:
        interval_score = 0.0
    else:
        interval_score = clamp(1.0 - (stdev_delta / max(median_delta, 1.0)), 0.0, 1.0)

    # 2. Amount consistency score
    median_amt = statistics.median(amounts) if amounts else 1.0
    spread = (max(amounts) - min(amounts)) if amounts else 0.0
    amount_score = clamp(1.0 - (spread / max(median_amt, 1.0)) * 4.0, 0.0, 1.0)

    # 3. Count score (n=1 -> 0, n>=6 -> 1.0)
    count_score = clamp((n_occurrences - 1) / 5.0, 0.0, 1.0)

    # 4. Merchant score
    merchant_score = clamp(canonical_matches / max(n_occurrences, 1), 0.0, 1.0)

    # 5. Recency score
    days_since_last = (reference_date - last_payment).days
    if days_since_last < 0:
        days_since_last = 0
    max_recency = median_delta * 1.6
    decay_horizon = median_delta * 3.0
    
    if days_since_last <= max_recency:
        recency_score = 1.0
    elif days_since_last >= decay_horizon:
        recency_score = 0.0
    else:
        recency_score = clamp(1.0 - (days_since_last - max_recency) / max(decay_horizon - max_recency, 1.0), 0.0, 1.0)

    # Composite formula:
    # 0.35*interval + 0.25*amount + 0.20*count + 0.10*merchant + 0.10*recency
    confidence = (
        0.35 * interval_score +
        0.25 * amount_score +
        0.20 * count_score +
        0.10 * merchant_score +
        0.10 * recency_score
    )
    confidence = round(confidence, 4)

    if confidence >= 0.80:
        band = "high"
    elif confidence >= 0.62:
        band = "medium"
    elif confidence >= 0.45:
        band = "low"
    else:
        band = "none"

    signals = {
        "interval_score": round(interval_score, 3),
        "amount_score": round(amount_score, 3),
        "count_score": round(count_score, 3),
        "merchant_score": round(merchant_score, 3),
        "recency_score": round(recency_score, 3)
    }

    return confidence, band, signals


def detect_subscriptions_for_user(
    db: Session,
    user_id: int,
    reference_date: Optional[date] = None,
    job_id: Optional[str] = None
) -> List[Subscription]:
    """
    Executes detection algorithm across all user transactions in DB.
    Creates or updates Subscriptions and DetectionResults.
    """
    if reference_date is None:
        reference_date = date.today()

    # Query all non-duplicate debit transactions for user
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.is_duplicate == False,
            Transaction.direction == "debit"
        )
        .order_by(Transaction.date.asc())
        .all()
    )

    if not txns:
        return []

    # Group by merchant
    from collections import defaultdict
    txns_by_merchant = defaultdict(list)
    for t in txns:
        txns_by_merchant[t.merchant_id].append(t)

    detected_subscriptions: List[Subscription] = []

    for merchant_id, m_txns in txns_by_merchant.items():
        if not merchant_id:
            continue

        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        if not merchant:
            continue

        # Cluster by amount (with price revision merging)
        clusters = cluster_amounts(m_txns)

        for cluster in clusters:
            if not cluster:
                continue

            freq, median_delta, intervals, stdev_delta = analyze_cadence(cluster, merchant.slug)
            if not freq:
                continue

            amounts = [x.amount for x in cluster]
            canonical_matches = sum(1 for x in cluster if merchant.slug in [
                "netflix", "spotify", "amazon-prime", "google-one", 
                "adobe-creative-cloud", "youtube-premium", "cult-fit", 
                "zomato-gold", "icloud-plus", "cloud-storage"
            ])
            last_payment = max(x.date for x in cluster)
            first_seen = min(x.date for x in cluster)
            n_occurrences = len(cluster)

            confidence, band, signals = calculate_confidence(
                intervals=intervals,
                median_delta=median_delta,
                stdev_delta=stdev_delta,
                amounts=amounts,
                n_occurrences=n_occurrences,
                canonical_matches=canonical_matches,
                last_payment=last_payment,
                reference_date=reference_date
            )

            # Ignore clusters below 0.45 confidence
            if confidence < 0.45 or band == "none":
                continue

            # Current amount is the most recent transaction amount
            latest_txn = max(cluster, key=lambda x: x.date)
            amount_current = latest_txn.amount

            # Derived fields
            if freq == "weekly":
                monthly_equiv = amount_current * 52.0 / 12.0
            elif freq == "quarterly":
                monthly_equiv = amount_current / 3.0
            elif freq == "yearly":
                monthly_equiv = amount_current / 12.0
            else:  # monthly
                monthly_equiv = amount_current

            annual_cost = monthly_equiv * 12.0
            next_expected = last_payment + timedelta(days=int(round(median_delta)))

            # Check price change history in cluster
            price_change_info = None
            if len(set(amounts)) > 1:
                # Check if price stepped up
                early_amt = cluster[0].amount
                late_amt = cluster[-1].amount
                if abs(late_amt - early_amt) >= 10.0:
                    price_change_info = {
                        "from": early_amt,
                        "to": late_amt,
                        "at_date": latest_txn.date.isoformat()
                    }

            # Forgotten / Review heuristic
            review_flag, review_reasons = evaluate_review_flag(
                confidence=confidence,
                status="active",
                first_seen=first_seen,
                last_payment=last_payment,
                next_expected=next_expected,
                frequency=freq,
                occurrences=n_occurrences,
                price_change=price_change_info,
                reference_date=reference_date
            )

            # Check if subscription already exists in DB
            sub = (
                db.query(Subscription)
                .filter(
                    Subscription.user_id == user_id,
                    Subscription.merchant_id == merchant_id
                )
                .first()
            )

            if sub:
                # Preserve manual user status overrides (cancelled, reviewed, ignored, not_subscription)
                if sub.status in ["active"]:
                    sub.status = "active"
                    sub.review_flag = review_flag
                    sub.review_reasons = review_reasons
                sub.amount_current = amount_current
                sub.frequency = freq
                sub.interval_days_median = median_delta
                sub.first_seen = first_seen
                sub.last_payment = last_payment
                sub.next_expected = next_expected
                sub.monthly_equivalent = round(monthly_equiv, 2)
                sub.annual_cost = round(annual_cost, 2)
                sub.confidence = confidence
                sub.band = band
                sub.occurrences = n_occurrences
            else:
                sub = Subscription(
                    user_id=user_id,
                    merchant_id=merchant_id,
                    amount_current=amount_current,
                    currency="INR",
                    frequency=freq,
                    interval_days_median=median_delta,
                    first_seen=first_seen,
                    last_payment=last_payment,
                    next_expected=next_expected,
                    monthly_equivalent=round(monthly_equiv, 2),
                    annual_cost=round(annual_cost, 2),
                    confidence=confidence,
                    band=band,
                    status="active",
                    review_flag=review_flag,
                    review_reasons=review_reasons,
                    occurrences=n_occurrences
                )
                db.add(sub)

            db.commit()
            db.refresh(sub)
            detected_subscriptions.append(sub)

            # Record DetectionResult explanation
            reasons = [
                f"Regular {freq} cadence with median interval of {int(round(median_delta))} days.",
                f"Amount consistency within cluster: ₹{min(amounts):.0f} – ₹{max(amounts):.0f}.",
                f"{n_occurrences} observed occurrences since {first_seen.strftime('%b %Y')}."
            ]
            if price_change_info:
                reasons.append(f"Price revision detected: ₹{price_change_info['from']:.0f} to ₹{price_change_info['to']:.0f}.")

            det_res = DetectionResult(
                job_id=job_id,
                merchant_id=merchant_id,
                cluster_key=f"{merchant.slug}_{freq}_{int(amount_current)}",
                signals=signals,
                confidence=confidence,
                explanation=reasons,
                accepted=True
            )
            db.add(det_res)
            db.commit()

    return detected_subscriptions
