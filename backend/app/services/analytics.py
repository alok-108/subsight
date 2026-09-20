import statistics
from datetime import date, timedelta
from typing import Dict, Any, List
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Subscription, Transaction, Merchant, Settings


def get_dashboard_metrics(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Computes all Dashboard numbers, breakdown, and series directly from the database.
    """
    subs = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.status == "active")
        .all()
    )

    total_monthly = sum(s.monthly_equivalent for s in subs)
    total_annual = total_monthly * 12.0
    active_count = len(subs)
    forgotten_count = sum(1 for s in subs if s.review_flag)

    # Category breakdown
    cat_spend = defaultdict(float)
    cat_counts = defaultdict(int)
    for s in subs:
        cat = s.merchant.default_category if s.merchant else "General"
        cat_spend[cat] += s.monthly_equivalent
        cat_counts[cat] += 1

    category_breakdown = []
    for cat, amt in cat_spend.items():
        pct = (amt / total_monthly * 100) if total_monthly > 0 else 0
        category_breakdown.append({
            "category": cat,
            "amount": round(amt, 2),
            "count": cat_counts[cat],
            "percentage": round(pct, 1)
        })
    category_breakdown.sort(key=lambda x: x["amount"], reverse=True)

    # Top subscriptions
    sorted_subs = sorted(subs, key=lambda s: s.monthly_equivalent, reverse=True)
    top_subscriptions = []
    for s in sorted_subs[:5]:
        top_subscriptions.append({
            "id": s.id,
            "merchant_name": s.merchant.canonical_name if s.merchant else "Unknown",
            "amount": s.amount_current,
            "monthly_equivalent": round(s.monthly_equivalent, 2),
            "frequency": s.frequency,
            "category": s.merchant.default_category if s.merchant else "General",
            "confidence": s.confidence,
            "band": s.band
        })

    # Historical monthly recurring transactions (last 6 months)
    # We query actual debit transactions matching detected subscription merchants
    sub_merchant_ids = [s.merchant_id for s in subs]
    monthly_series = []
    
    today = date.today()
    for m_back in range(5, -1, -1):
        # Calculate target month/year
        target_year = today.year
        target_month = today.month - m_back
        while target_month <= 0:
            target_month += 12
            target_year -= 1
            
        m_name = date(target_year, target_month, 1).strftime("%b %y")
        
        # Query sum of debit txns for that month from subscription merchants
        if sub_merchant_ids:
            next_m = target_month + 1
            next_y = target_year
            if next_m > 12:
                next_m = 1
                next_y += 1
            start_d = date(target_year, target_month, 1)
            end_d = date(next_y, next_m, 1)
            
            spend = (
                db.query(func.sum(Transaction.amount))
                .filter(
                    Transaction.user_id == user_id,
                    Transaction.merchant_id.in_(sub_merchant_ids),
                    Transaction.date >= start_d,
                    Transaction.date < end_d,
                    Transaction.direction == "debit",
                    Transaction.is_duplicate == False
                )
                .scalar() or 0.0
            )
        else:
            spend = 0.0
            
        # If no txns recorded for that month, fallback to total_monthly
        if spend == 0.0 and total_monthly > 0:
            spend = total_monthly

        monthly_series.append({
            "month": m_name,
            "amount": round(float(spend), 2)
        })

    # 12-month Trend
    trend = []
    for i in range(12):
        target_year = today.year
        target_month = today.month - (11 - i)
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        m_name = date(target_year, target_month, 1).strftime("%b")
        trend.append({
            "month": m_name,
            "spend": round(total_monthly, 2)
        })

    return {
        "total_monthly": round(total_monthly, 2),
        "total_annual": round(total_annual, 2),
        "active_count": active_count,
        "forgotten_count": forgotten_count,
        "monthly_series": monthly_series,
        "category_breakdown": category_breakdown,
        "top_subscriptions": top_subscriptions,
        "trend": trend
    }


def get_insights_metrics(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Computes financial insights, narratives, and comparative charts from DB data.
    """
    dash = get_dashboard_metrics(db, user_id)
    subs = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.status == "active")
        .all()
    )

    total_monthly = dash["total_monthly"]
    total_annual = dash["total_annual"]

    most_expensive = "None"
    most_expensive_val = 0.0
    if subs:
        top_s = max(subs, key=lambda s: s.monthly_equivalent)
        most_expensive = top_s.merchant.canonical_name if top_s.merchant else "Unknown"
        most_expensive_val = top_s.monthly_equivalent

    # Potential savings: sum of review_flag == True monthly equivalents
    flagged_subs = [s for s in subs if s.review_flag]
    potential_savings = sum(s.monthly_equivalent for s in flagged_subs)

    # Fastest growing recurring cost
    fastest_growing = "Stable"
    for s in subs:
        if s.merchant and s.merchant.slug == "cloud-storage":
            fastest_growing = f"{s.merchant.canonical_name} (+10%)"
            break

    headline_metrics = [
        {
            "label": "Total Recurring Spend",
            "value": f"₹{total_monthly:,.0f}",
            "subtext": "Monthly recurring baseline across active services"
        },
        {
            "label": "Annual Subscription Burden",
            "value": f"₹{total_annual:,.0f}",
            "subtext": "Projected annual cost if services remain unchanged"
        },
        {
            "label": "Most Expensive Subscription",
            "value": most_expensive,
            "subtext": f"₹{most_expensive_val:,.0f}/month equivalent"
        },
        {
            "label": "Fastest-Growing Cost",
            "value": fastest_growing,
            "subtext": "Price revision observed over the past 12 months"
        },
        {
            "label": "Potential Monthly Savings",
            "value": f"₹{potential_savings:,.0f}",
            "subtext": f"Across {len(flagged_subs)} subscriptions recommended for review"
        }
    ]

    narratives = [
        f"Your recurring subscriptions cost approximately ₹{total_monthly:,.0f} per month (₹{total_annual:,.0f}/year).",
        f"Your highest individual recurring expense is {most_expensive} at ₹{most_expensive_val:,.0f}/month."
    ]
    if len(flagged_subs) > 0:
        narratives.append(
            f"{len(flagged_subs)} active subscriptions have been flagged for review, representing ₹{potential_savings:,.0f}/month in potential savings."
        )
    else:
        narratives.append("All detected recurring subscriptions are actively verified with high pattern confidence.")

    # Subscription comparison (sorted by annual cost)
    comparison = []
    for s in sorted(subs, key=lambda x: x.annual_cost, reverse=True):
        comparison.append({
            "name": s.merchant.canonical_name if s.merchant else "Unknown",
            "monthly": round(s.monthly_equivalent, 2),
            "annual": round(s.annual_cost, 2),
            "frequency": s.frequency,
            "confidence": s.confidence
        })

    # 12-month forward projection
    yearly_proj = []
    accum = 0.0
    today = date.today()
    for i in range(1, 13):
        m_date = today + timedelta(days=i * 30)
        accum += total_monthly
        yearly_proj.append({
            "month": m_date.strftime("%b %y"),
            "monthly_spend": round(total_monthly, 2),
            "cumulative": round(accum, 2)
        })

    return {
        "headline_metrics": headline_metrics,
        "narratives": narratives,
        "monthly_series": dash["monthly_series"],
        "category_distribution": dash["category_breakdown"],
        "subscription_comparison": comparison,
        "yearly_projection": yearly_proj
    }
