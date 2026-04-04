import urllib.request, json

BASE = "http://localhost:8001"

print("=" * 50)
print("GigShield API Full Test")
print("=" * 50)

# 1. Health
try:
    r = urllib.request.urlopen(f"{BASE}/health")
    print(f"[PASS] /health -> {r.read().decode()}")
except Exception as e:
    print(f"[FAIL] /health -> {e}")

# 2. Worker Login
token = None
try:
    data = json.dumps({"phone": "9876543210", "password": "ravi1234"}).encode()
    req = urllib.request.Request(f"{BASE}/api/v1/auth/login", data=data, headers={"Content-Type": "application/json"})
    r = urllib.request.urlopen(req)
    body = json.loads(r.read().decode())
    token = body.get("access_token")
    print(f"[PASS] Worker login -> {body.get('name')} | role: {body.get('role')}")
except Exception as e:
    print(f"[FAIL] Worker login -> {e}")

# 3. Admin Login
admin_token = None
try:
    data = json.dumps({"phone": "0000000000", "password": "admin123"}).encode()
    req = urllib.request.Request(f"{BASE}/api/v1/auth/login", data=data, headers={"Content-Type": "application/json"})
    r = urllib.request.urlopen(req)
    body = json.loads(r.read().decode())
    admin_token = body.get("access_token")
    print(f"[PASS] Admin login -> {body.get('name')} | role: {body.get('role')}")
except Exception as e:
    print(f"[FAIL] Admin login -> {e}")

if token:
    h = {"Authorization": f"Bearer {token}"}
    # 4. Active policy
    try:
        req = urllib.request.Request(f"{BASE}/api/v1/policies/active", headers=h)
        r = urllib.request.urlopen(req)
        b = json.loads(r.read().decode())
        print(f"[PASS] Active policy -> {b['plan_type']} | remaining: {b['remaining_weekly_payout']}")
    except Exception as e:
        print(f"[FAIL] Active policy -> {e}")

    # 5. Plans
    try:
        req = urllib.request.Request(f"{BASE}/api/v1/policies/plans", headers=h)
        r = urllib.request.urlopen(req)
        b = json.loads(r.read().decode())
        print(f"[PASS] Plans -> risk: {b['zone_risk_score']} | AI rec: {b['ai_recommendation']}")
    except Exception as e:
        print(f"[FAIL] Plans -> {e}")

    # 6. Claims
    try:
        req = urllib.request.Request(f"{BASE}/api/v1/claims/", headers=h)
        r = urllib.request.urlopen(req)
        b = json.loads(r.read().decode())
        print(f"[PASS] Claims -> {b['total']} total | payout: {b['total_payout_received']}")
    except Exception as e:
        print(f"[FAIL] Claims -> {e}")

    # 7. Triggers
    try:
        req = urllib.request.Request(f"{BASE}/api/v1/triggers/active", headers=h)
        r = urllib.request.urlopen(req)
        b = json.loads(r.read().decode())
        print(f"[PASS] Triggers -> {len(b['live_triggers'])} live | {len(b['db_events'])} db events")
    except Exception as e:
        print(f"[FAIL] Triggers -> {e}")

    # 8. Simulate
    try:
        data = json.dumps({"trigger_type": "RAIN", "zone": "Tambaram"}).encode()
        req = urllib.request.Request(f"{BASE}/api/v1/triggers/simulate", data=data, headers={**h, "Content-Type": "application/json"})
        r = urllib.request.urlopen(req)
        b = json.loads(r.read().decode())
        print(f"[PASS] Simulate -> {b['trigger_type']} | claims: {b['claims_generated']} | payout: {b['total_payout_triggered']}")
    except Exception as e:
        print(f"[FAIL] Simulate -> {e}")

if admin_token:
    ah = {"Authorization": f"Bearer {admin_token}"}
    # 9. Dashboard
    try:
        req = urllib.request.Request(f"{BASE}/api/v1/admin/dashboard", headers=ah)
        r = urllib.request.urlopen(req)
        b = json.loads(r.read().decode())
        s = b["summary"]
        print(f"[PASS] Admin dashboard -> policies: {s['active_policies']} | workers: {s['total_workers']} | loss: {s['loss_ratio']}%")
    except Exception as e:
        print(f"[FAIL] Admin dashboard -> {e}")

    # 10. Workers
    try:
        req = urllib.request.Request(f"{BASE}/api/v1/admin/workers", headers=ah)
        r = urllib.request.urlopen(req)
        b = json.loads(r.read().decode())
        print(f"[PASS] Workers -> {b['total']} workers")
    except Exception as e:
        print(f"[FAIL] Workers -> {e}")

print("=" * 50)
print("Done!")
