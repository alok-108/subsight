import httpx
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def test_api():
    print("[*] Testing /api/health...")
    r = httpx.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    assert r.json() == {"status": "ok", "db": "connected"}
    print("  [OK] Health OK")

    print("[*] Testing /api/demo/users...")
    r = httpx.get(f"{BASE_URL}/demo/users")
    assert r.status_code == 200
    users = r.json()
    assert len(users) == 12, f"Expected 12 users, got {len(users)}"
    print(f"  [OK] Found {len(users)} synthetic users")

    print("[*] Testing /api/dashboard...")
    r = httpx.get(f"{BASE_URL}/dashboard?user_id=1")
    assert r.status_code == 200
    dash = r.json()
    assert dash["total_monthly"] > 0
    assert dash["total_annual"] == round(dash["total_monthly"] * 12, 2)
    assert dash["active_count"] > 0
    print(f"  [OK] Dashboard OK: Monthly spend INR {dash['total_monthly']:.2f}, {dash['active_count']} active, {dash['forgotten_count']} flagged")

    print("[*] Testing /api/subscriptions...")
    r = httpx.get(f"{BASE_URL}/subscriptions?user_id=1")
    assert r.status_code == 200
    subs = r.json()
    assert len(subs) > 0
    first_sub = subs[0]
    print(f"  [OK] Subscriptions OK: {len(subs)} detected. First: {first_sub['merchant_name']} ({first_sub['amount_current']})")

    print("[*] Testing /api/subscriptions/{id} detail...")
    r = httpx.get(f"{BASE_URL}/subscriptions/{first_sub['id']}?user_id=1")
    assert r.status_code == 200
    detail = r.json()
    assert "payment_timeline" in detail
    assert "pattern" in detail
    print(f"  [OK] Subscription detail OK: {len(detail['payment_timeline'])} timeline items")

    print("[*] Testing /api/forgotten...")
    r = httpx.get(f"{BASE_URL}/forgotten?user_id=1")
    assert r.status_code == 200
    forgotten = r.json()
    print(f"  [OK] Forgotten subscriptions OK: {len(forgotten)} flagged for review")

    print("[*] Testing /api/transactions...")
    r = httpx.get(f"{BASE_URL}/transactions?user_id=1&page=1&page_size=10")
    assert r.status_code == 200
    txns = r.json()
    assert txns["total"] > 200
    assert len(txns["items"]) == 10
    print(f"  [OK] Transactions OK: {txns['total']} total records")

    print("[*] Testing /api/insights...")
    r = httpx.get(f"{BASE_URL}/insights?user_id=1")
    assert r.status_code == 200
    insights = r.json()
    assert len(insights["headline_metrics"]) == 5
    assert len(insights["narratives"]) >= 2
    print("  [OK] Insights OK")

    print("[*] Testing /api/settings...")
    r = httpx.get(f"{BASE_URL}/settings?user_id=1")
    assert r.status_code == 200
    settings = r.json()
    assert settings["display_name"] == "Aarav Sharma"
    print("  [OK] Settings OK")

    print("[*] Testing negative paths:")
    # Negative 1: Unsupported mime / file format
    r = httpx.post(f"{BASE_URL}/upload?user_id=1", files={"file": ("test.txt", b"plain text", "text/plain")})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "INVALID_FILE_TYPE"
    print("  [OK] Negative path 1 (invalid file extension) properly returned 400 INVALID_FILE_TYPE")

    # Negative 2: Unknown upload_id
    r = httpx.delete(f"{BASE_URL}/uploads/nonexistent_id?user_id=1")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "UPLOAD_NOT_FOUND"
    print("  [OK] Negative path 2 (unknown upload_id) properly returned 404 UPLOAD_NOT_FOUND")

    # Negative 3: Invalid subscription status
    r = httpx.patch(f"{BASE_URL}/subscriptions/{first_sub['id']}?user_id=1", json={"status": "invalid_status_value"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "INVALID_STATUS"
    print("  [OK] Negative path 3 (invalid status) properly returned 400 INVALID_STATUS")

    print("\n[OK] ALL API SMOKE TESTS PASSED!")

if __name__ == "__main__":
    test_api()
