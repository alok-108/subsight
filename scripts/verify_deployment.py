#!/usr/bin/env python3
"""
SUBSIGHT Production Verification Script
Tests health, database connectivity, seeding, CORS headers, endpoints, and frontend availability.

Usage:
    python scripts/verify_deployment.py --backend https://subsight-api.onrender.com --frontend https://subsight.vercel.app
"""

import sys
import argparse
import httpx


def test_endpoint(client: httpx.Client, method: str, url: str, name: str, expected_status: int = 200, **kwargs):
    print(f"[*] Testing {name} ({method} {url})...", end=" ")
    try:
        response = client.request(method, url, timeout=45.0, **kwargs)
        if response.status_code == expected_status:
            print(f"[OK] (HTTP {response.status_code})")
            return response
        else:
            print(f"[FAIL] (HTTP {response.status_code}, expected {expected_status})")
            print(f"    Body: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return None


def run_verification(backend_url: str, frontend_url: str = None):
    backend_url = backend_url.rstrip("/")
    if frontend_url:
        frontend_url = frontend_url.rstrip("/")

    print("=" * 60)
    print(f"SUBSIGHT PRODUCTION VERIFICATION")
    print(f"Backend Target : {backend_url}")
    if frontend_url:
        print(f"Frontend Target: {frontend_url}")
    print("=" * 60)

    passed = 0
    total = 0

    with httpx.Client() as client:
        # 1. Health check
        total += 1
        r = test_endpoint(client, "GET", f"{backend_url}/api/health", "Backend Health")
        if r and r.json().get("status") == "ok":
            print(f"    Database status: {r.json().get('db') or r.json().get('database')}")
            passed += 1

        # 2. Seed demo data
        total += 1
        r = test_endpoint(client, "POST", f"{backend_url}/api/demo/seed", "Demo Data Seeding")
        if r and r.json().get("status") == "ok":
            print(f"    {r.json().get('message')}")
            passed += 1

        # 3. Dashboard metrics
        total += 1
        r = test_endpoint(client, "GET", f"{backend_url}/api/dashboard", "Dashboard Metrics")
        if r:
            data = r.json()
            print(f"    Monthly spend: ${data.get('total_monthly')}, Active subs: {data.get('active_count')}")
            passed += 1

        # 4. Subscriptions list
        total += 1
        r = test_endpoint(client, "GET", f"{backend_url}/api/subscriptions", "Subscriptions List")
        if r:
            subs = r.json()
            print(f"    Detected subscriptions count: {len(subs)}")
            passed += 1

        # 5. Forgotten subscriptions list
        total += 1
        r = test_endpoint(client, "GET", f"{backend_url}/api/subscriptions/forgotten", "Forgotten Subscriptions")
        if r:
            forgotten = r.json()
            print(f"    Surfaced candidates count: {len(forgotten)}")
            passed += 1

        # 6. Transactions list
        total += 1
        r = test_endpoint(client, "GET", f"{backend_url}/api/transactions?limit=10", "Transactions Ledger")
        if r:
            txs = r.json().get("items", [])
            print(f"    Fetched {len(txs)} transactions")
            passed += 1

        # 7. Insights summary
        total += 1
        r = test_endpoint(client, "GET", f"{backend_url}/api/insights/summary", "Insights Summary")
        if r:
            passed += 1

        # 8. CORS preflight verification
        if frontend_url:
            total += 1
            print(f"[*] Testing CORS Preflight for Origin {frontend_url}...", end=" ")
            try:
                headers = {
                    "Origin": frontend_url,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "content-type"
                }
                res = client.options(f"{backend_url}/api/dashboard", headers=headers, timeout=20.0)
                allow_origin = res.headers.get("access-control-allow-origin")
                if allow_origin in [frontend_url, "*"]:
                    print(f"[OK] (Access-Control-Allow-Origin: {allow_origin})")
                    passed += 1
                else:
                    print(f"[FAIL] (Got Access-Control-Allow-Origin: {allow_origin})")
            except Exception as e:
                print(f"[ERROR] CORS check error: {e}")

        # 9. Frontend availability
        if frontend_url:
            total += 1
            r = test_endpoint(client, "GET", frontend_url, "Frontend Root URL")
            if r:
                passed += 1

    print("=" * 60)
    print(f"RESULTS: {passed}/{total} checks passed.")
    print("=" * 60)
    return passed == total


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify SUBSIGHT deployment")
    parser.add_argument("--backend", default="http://127.0.0.1:8000", help="Backend base URL")
    parser.add_argument("--frontend", default="http://localhost:3000", help="Frontend base URL")
    args = parser.parse_args()

    success = run_verification(args.backend, args.frontend)
    sys.exit(0 if success else 1)
