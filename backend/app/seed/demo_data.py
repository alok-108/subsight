import random
import csv
from pathlib import Path
from datetime import date, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models import User, Account, Merchant, Transaction, Settings, Subscription
from app.services.normalize import get_or_create_merchant
from app.services.detect import detect_subscriptions_for_user
from app.services.ingest import compute_dedupe_key

SEED_PATH = Path(__file__).resolve().parent
CSV_EXPORT_PATH = SEED_PATH / "demo_transactions.csv"

SYNTHETIC_USERS = [
    # North
    {"name": "Aarav Sharma", "region": "North", "email": "aarav.sharma@demo.subsight.internal"},
    {"name": "Priya Verma", "region": "North", "email": "priya.verma@demo.subsight.internal"},
    {"name": "Rohan Mehta", "region": "North", "email": "rohan.mehta@demo.subsight.internal"},
    # South
    {"name": "Arjun Nair", "region": "South", "email": "arjun.nair@demo.subsight.internal"},
    {"name": "Kavya Iyer", "region": "South", "email": "kavya.iyer@demo.subsight.internal"},
    {"name": "Vikram Reddy", "region": "South", "email": "vikram.reddy@demo.subsight.internal"},
    # East
    {"name": "Ananya Sen", "region": "East", "email": "ananya.sen@demo.subsight.internal"},
    {"name": "Sourav Chatterjee", "region": "East", "email": "sourav.chatterjee@demo.subsight.internal"},
    {"name": "Riya Das", "region": "East", "email": "riya.das@demo.subsight.internal"},
    # West
    {"name": "Aditi Patel", "region": "West", "email": "aditi.patel@demo.subsight.internal"},
    {"name": "Rahul Shah", "region": "West", "email": "rahul.shah@demo.subsight.internal"},
    {"name": "Neha Joshi", "region": "West", "email": "neha.joshi@demo.subsight.internal"},
]

NON_RECURRING_MERCHANTS = [
    ("Swiggy Food Order", "Swiggy", "Food & Dining", (180, 850)),
    ("Zomato Delivery", "Zomato", "Food & Dining", (220, 950)),
    ("Blinkit Quick Delivery", "Blinkit", "Groceries", (150, 1200)),
    ("Zepto Instant Grocery", "Zepto", "Groceries", (180, 1100)),
    ("BigBasket Weekly Groceries", "BigBasket", "Groceries", (800, 3200)),
    ("Uber Ride", "Uber", "Transport", (120, 680)),
    ("Ola Cab Bengaluru", "Ola", "Transport", (150, 720)),
    ("DMart Supermarket", "DMart", "Groceries", (1200, 4500)),
    ("Reliance Smart Bazaar", "Reliance Smart", "Shopping", (900, 3800)),
    ("Croma Electronics", "Croma", "Electronics", (450, 4200)),
    ("Myntra Fashion App", "Myntra", "Shopping", (650, 3500)),
    ("Ajio Retail Online", "Ajio", "Shopping", (500, 2800)),
    ("BookMyShow Movie Tickets", "BookMyShow", "Entertainment", (350, 1200)),
    ("IRCTC Train Ticket Reservation", "IRCTC", "Travel", (420, 2400)),
    ("Indian Oil Petrol Pump", "Indian Oil", "Transport", (800, 3000)),
    ("Apollo Pharmacy", "Apollo Pharmacy", "Health & Fitness", (120, 1450)),
    ("Starbucks Coffee", "Starbucks", "Food & Dining", (320, 890)),
    ("Mainland China Restaurant", "Mainland China", "Food & Dining", (1200, 3400)),
    ("Chai Point Whitefield", "Chai Point", "Food & Dining", (90, 280)),
    ("Blue Tokai Coffee Roasters", "Blue Tokai", "Food & Dining", (240, 620)),
    ("Toit Brewpub Indiranagar", "Toit Brewpub", "Food & Dining", (1500, 4200)),
]


def generate_synthetic_transactions(user_id: int, account_holder: str) -> List[Dict[str, Any]]:
    """
    Generates ~260 deterministic transactions spanning 14 months for Aarav Sharma:
    ~80 recurring transactions with all 10 merchants and edge cases,
    ~180 non-recurring transactions.
    """
    rng = random.Random(42)
    today = date(2026, 4, 15)
    txns = []

    # 1. NETFLIX: Monthly, ₹649, with 1 skipped month (month 4), and string variations
    # Edge case 1: String variations: NETFLIX.COM, Netflix, NETFLIX.COM*12345, NETFLIX IN
    # Edge case 5: Missing payment month
    netflix_variations = [
        "NETFLIX.COM", "Netflix", "NETFLIX.COM*98412", "NETFLIX IN", 
        "Netflix Entertainment", "NETFLIX MUMBAI", "NETFLIX.COM*12345"
    ]
    for m in range(14):
        if m == 4:  # Skipped month edge case
            continue
        d = today - timedelta(days=m * 30 + rng.randint(-1, 1))
        merchant_str = netflix_variations[m % len(netflix_variations)]
        txns.append({
            "date": d,
            "merchant_raw": merchant_str,
            "description": f"Subscription Payment {merchant_str}",
            "amount": 649.0,
            "direction": "debit",
            "category": "Entertainment",
            "account_holder": account_holder
        })

    # 2. SPOTIFY: Monthly, ₹119, clean
    for m in range(14):
        d = today - timedelta(days=m * 30 + rng.randint(-1, 1))
        txns.append({
            "date": d,
            "merchant_raw": "Spotify Premium India",
            "description": "Recurring Debit - Spotify Premium",
            "amount": 119.0,
            "direction": "debit",
            "category": "Entertainment",
            "account_holder": account_holder
        })

    # 3. GOOGLE ONE: Monthly, ₹130, clean
    for m in range(14):
        d = today - timedelta(days=m * 30 + 1)
        txns.append({
            "date": d,
            "merchant_raw": "GOOGLE *STORAGE 100GB",
            "description": "Google One Cloud Storage",
            "amount": 130.0,
            "direction": "debit",
            "category": "Utilities",
            "account_holder": account_holder
        })

    # 4. YOUTUBE PREMIUM: Monthly, ₹129, clean
    for m in range(12):
        d = today - timedelta(days=m * 30 + 5)
        txns.append({
            "date": d,
            "merchant_raw": "YouTube Premium Membership",
            "description": "YouTube Premium Individual Plan",
            "amount": 129.0,
            "direction": "debit",
            "category": "Entertainment",
            "account_holder": account_holder
        })

    # 5. CULT.FIT: ₹1,499 monthly, forgotten candidate — 9 months tenure
    for m in range(9):
        d = today - timedelta(days=m * 30 + 10)
        txns.append({
            "date": d,
            "merchant_raw": "CULT FIT HEALTHCARE BANGALORE",
            "description": "Cult.fit Monthly Membership Auto-Pay",
            "amount": 1499.0,
            "direction": "debit",
            "category": "Health & Fitness",
            "account_holder": account_holder
        })

    # 6. ADOBE CREATIVE CLOUD: ₹1,675 monthly, forgotten candidate — 8 months tenure
    for m in range(8):
        d = today - timedelta(days=m * 30 + 14)
        txns.append({
            "date": d,
            "merchant_raw": "ADOBE *CREATIVE CLOUD IRELAND",
            "description": "Adobe Creative Cloud Photography Plan",
            "amount": 1675.0,
            "direction": "debit",
            "category": "Productivity",
            "account_holder": account_holder
        })

    # 7. CLOUD STORAGE: Price increase edge case!
    # ₹499 x 6 months, then ₹549 x 5 months
    for m in range(11):
        d = today - timedelta(days=m * 30 + 18)
        amt = 549.0 if m < 5 else 499.0  # most recent 5 are 549, older 6 are 499
        txns.append({
            "date": d,
            "merchant_raw": "Cloud Storage Pro Zoho",
            "description": "Cloud Storage Subscription Plan",
            "amount": amt,
            "direction": "debit",
            "category": "Utilities",
            "account_holder": account_holder
        })

    # 8. AMAZON PRIME: ₹1,499 yearly, annual billing, single charge
    txns.append({
        "date": today - timedelta(days=340),  # approaching annual renewal!
        "merchant_raw": "AMAZON PRIME ANNUAL MEMBERSHIP",
        "description": "Amazon Prime 1-Year Plan",
        "amount": 1499.0,
        "direction": "debit",
        "category": "Entertainment",
        "account_holder": account_holder
    })

    # 9. ZOMATO GOLD: ₹299 quarterly cadence (91-day spacing)
    for q in range(4):
        d = today - timedelta(days=q * 91 + 3)
        txns.append({
            "date": d,
            "merchant_raw": "ZOMATO GOLD 3 MONTHS",
            "description": "Zomato Gold Dining & Delivery Membership",
            "amount": 299.0,
            "direction": "debit",
            "category": "Food & Dining",
            "account_holder": account_holder
        })

    # 10. ICLOUD+: Low amount ₹75 with ±₹1-2 noise
    for m in range(13):
        d = today - timedelta(days=m * 30 + 22)
        jitter = rng.choice([0.0, 1.0, -1.0])
        txns.append({
            "date": d,
            "merchant_raw": "APPLE COM BILL ICLOUD",
            "description": "iCloud 50GB Storage Plan",
            "amount": 75.0 + jitter,
            "direction": "debit",
            "category": "Utilities",
            "account_holder": account_holder
        })

    # Edge case 6: Duplicate transaction pair
    # Enter an identical Netflix transaction with same date & amount
    txns.append({
        "date": today - timedelta(days=30),
        "merchant_raw": "Netflix",
        "description": "Subscription Payment Netflix",
        "amount": 649.0,
        "direction": "debit",
        "category": "Entertainment",
        "account_holder": account_holder,
        "is_duplicate_intent": True
    })

    # Edge case 7: Swiggy weekly decoy! Orders every Friday with wildly varying amounts
    # ~55 Friday orders spanning the 14 months
    start_friday = today - timedelta(days=(today.weekday() - 4) % 7)
    for f in range(45):
        d = start_friday - timedelta(days=f * 7)
        decoy_amount = float(rng.choice([180, 240, 390, 480, 750, 890, 1120, 1450, 620, 310]))
        txns.append({
            "date": d,
            "merchant_raw": "Swiggy Order Bangalore",
            "description": f"Swiggy Delivery Dinner {f+1}",
            "amount": decoy_amount,
            "direction": "debit",
            "category": "Food & Dining",
            "account_holder": account_holder
        })

    # Non-recurring varied transactions (~135 txns)
    for i in range(135):
        day_offset = rng.randint(2, 420)
        d = today - timedelta(days=day_offset)
        raw_name, clean_name, cat, amt_range = rng.choice(NON_RECURRING_MERCHANTS)
        amt = float(rng.randint(amt_range[0], amt_range[1]))
        txns.append({
            "date": d,
            "merchant_raw": raw_name,
            "description": f"Purchase at {clean_name}",
            "amount": amt,
            "direction": "debit",
            "category": cat,
            "account_holder": account_holder
        })

    # Add 14 salary credit transactions
    for m in range(14):
        d = today - timedelta(days=m * 30 + 28)
        txns.append({
            "date": d,
            "merchant_raw": "INFOSYS TECH SALARY CREDIT",
            "description": "Monthly Salary Deposit",
            "amount": 165000.0,
            "direction": "credit",
            "category": "Salary",
            "account_holder": account_holder
        })

    # Sort ascending by date
    txns.sort(key=lambda x: x["date"])
    return txns


def seed_demo_data(db: Session):
    """
    Populates all 12 synthetic Indian profiles, their accounts, settings,
    and inserts the full transaction dataset for the default user (Aarav Sharma).
    Runs subscription detection so the database is pre-analyzed and demo-ready!
    """
    print("[Seed] Creating 12 synthetic users...")
    user_objects = []
    for u_info in SYNTHETIC_USERS:
        user = User(
            name=u_info["name"],
            region=u_info["region"],
            email_demo=u_info["email"]
        )
        db.add(user)
        user_objects.append(user)

    db.commit()
    for u in user_objects:
        db.refresh(u)

    default_user = user_objects[0]  # Aarav Sharma

    # Add accounts for all users
    for u in user_objects:
        acc1 = Account(user_id=u.id, label="HDFC Salary Account", kind="savings")
        acc2 = Account(user_id=u.id, label="ICICI Coral Credit Card", kind="credit")
        db.add(acc1)
        db.add(acc2)

        # Settings
        sett = Settings(
            user_id=u.id,
            display_name=u.name,
            currency="INR",
            theme="system",
            notify_renewals=True,
            notify_price_changes=True,
            notify_review=True,
            data_retention_days=365
        )
        db.add(sett)

    db.commit()

    # Generate synthetic transactions for Aarav Sharma
    raw_txns = generate_synthetic_transactions(default_user.id, default_user.name)

    # Export demo_transactions.csv
    export_demo_csv(raw_txns)

    seen_dedupe_keys = set()
    db_txns = []

    for t in raw_txns:
        # Resolve merchant
        merchant, _ = get_or_create_merchant(db, t["merchant_raw"])
        
        # Calculate dedupe key
        clean_name = merchant.canonical_name
        key = compute_dedupe_key(
            user_id=default_user.id,
            txn_date=t["date"],
            merchant_clean=clean_name,
            amount=t["amount"],
            direction=t["direction"]
        )

        is_dup = False
        if key in seen_dedupe_keys:
            is_dup = True
        else:
            seen_dedupe_keys.add(key)

        txn = Transaction(
            user_id=default_user.id,
            upload_id=None,
            date=t["date"],
            merchant_raw=t["merchant_raw"],
            merchant_id=merchant.id,
            description=t["description"],
            amount=t["amount"],
            direction=t["direction"],
            category=t["category"],
            is_duplicate=is_dup,
            dedupe_key=key if not is_dup else f"{key}_dup_{random.randint(1000, 9999)}"
        )
        db.add(txn)
        db_txns.append(txn)

    db.commit()
    print(f"[Seed] Inserted {len(db_txns)} transactions for {default_user.name}.")

    # Run detection engine to populate subscriptions and detection results
    today = date(2026, 4, 15)
    subs = detect_subscriptions_for_user(db, user_id=default_user.id, reference_date=today)
    print(f"[Seed] Successfully detected {len(subs)} recurring subscriptions.")


def export_demo_csv(raw_txns: List[Dict[str, Any]]):
    """
    Exports clean CSV with columns:
    date,merchant,description,amount,direction,account_holder,category
    """
    CSV_EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CSV_EXPORT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["date", "merchant", "description", "amount", "direction", "account_holder", "category"])
        for t in raw_txns:
            # Skip the deliberate duplicate intent in CSV to make it a natural statement
            if t.get("is_duplicate_intent"):
                # keep one duplicate row to test duplicate collapsing on live upload!
                pass
            writer.writerow([
                t["date"].isoformat(),
                t["merchant_raw"],
                t["description"],
                f"{t['amount']:.2f}",
                t["direction"],
                t["account_holder"],
                t["category"]
            ])
    print(f"[Seed] Exported live demo transactions to {CSV_EXPORT_PATH}")
