import urllib.request
import urllib.parse
import json
import urllib.error

BASE = "http://127.0.0.1:5000/api"

def request_json(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

print("="*60)
print("       SMART PERMISSION SYSTEM - LIVE API SMOKE TEST")
print("="*60)

# 1. Health Check
status, res = request_json(f"{BASE}/health")
assert status == 200
print(f"[OK] Health Check: {res['status']} | {res['service']} (DB: {res['database']})")

# 2. Student Login
status, res = request_json(f"{BASE}/auth/login", method="POST", data={"username": "rahul.sharma", "password": "student123"})
assert status == 200
student_data = res["data"]
student_token = student_data["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}
print(f"[OK] Student Login: Welcome {student_data['user']['full_name']} (Role: {student_data['user']['role']})")

# 3. Student Profile (/me)
status, res = request_json(f"{BASE}/auth/me", headers=student_headers)
assert status == 200
profile = res["data"]
print(f"[OK] Student Profile (/auth/me): {profile['student']['student_id']} - Dept: {profile['student']['department']}")

# 4. Backend Role Security Checks for Student
status, res = request_json(f"{BASE}/faculty/leaves", headers=student_headers)
assert status == 403, f"Expected 403, got {status}"
print(f"[OK] Role Security: Student accessing /faculty/leaves blocked with 403 Forbidden")

status, res = request_json(f"{BASE}/admin/users", headers=student_headers)
assert status == 403, f"Expected 403, got {status}"
print(f"[OK] Role Security: Student accessing /admin/users blocked with 403 Forbidden")

# 5. Admin Login & Dashboard
status, res = request_json(f"{BASE}/auth/login", method="POST", data={"username": "admin", "password": "admin123"})
assert status == 200
admin_token = res["data"]["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
status, res = request_json(f"{BASE}/admin/dashboard", headers=admin_headers)
assert status == 200
dash = res["data"]
print(f"[OK] Admin Dashboard: Total Users={dash['total_users']}, Students={dash['total_students']}, Faculty={dash['total_faculty']}, Departments={dash['total_departments']}")

# 6. HOD Login & Reports
status, res = request_json(f"{BASE}/auth/login", method="POST", data={"username": "ravi.kumar", "password": "hod123"})
assert status == 200
hod_token = res["data"]["access_token"]
hod_headers = {"Authorization": f"Bearer {hod_token}"}
status, res = request_json(f"{BASE}/reports/dashboard", headers=hod_headers)
assert status == 200
rep = res["data"]
print(f"[OK] HOD Reports Dashboard: Active Users={rep['users']['total']}, Pending Permissions={rep['permissions']['pending']}")

# 7. Faculty Login & Smart Substitute Selection
status, res = request_json(f"{BASE}/auth/login", method="POST", data={"username": "arjun.mehta", "password": "faculty123"})
assert status == 200
fac_token = res["data"]["access_token"]
fac_headers = {"Authorization": f"Bearer {fac_token}"}
status, res = request_json(
    f"{BASE}/substitutes/available?date=2026-08-20&start_time=10:00&end_time=11:00&department=Computer%20Science%20and%20Engineering",
    headers=fac_headers
)
assert status == 200
subs = res["data"]
print(f"[OK] Smart Substitute Selection: Found {len(subs)} available faculty | Top match: {subs[0]['faculty_name']} (Score: {subs[0]['suitability_score']})")

# 8. Student Create Permission & Full Multi-Level Approval Workflow
import random
from datetime import date, timedelta
test_date = (date.today() + timedelta(days=random.randint(10, 30))).isoformat()
start_hr = random.randint(9, 11)
status, res = request_json(
    f"{BASE}/permissions",
    method="POST",
    headers=student_headers,
    data={
        "permission_type": "medical",
        "reason": "Doctor appointment at City Hospital",
        "date": test_date,
        "from_time": f"{start_hr:02d}:00",
        "to_time": f"{start_hr+2:02d}:00",
        "destination": "City Hospital",
        "contact_number": "9876543210"
    }
)
assert status == 201
perm = res["data"]
req_id = perm["id"]
print(f"[OK] Student Created Permission: {perm['request_number']} (Status: {perm['status']}, Approver: {perm['current_approver_role']})")

# Mentor Approval
status, res = request_json(f"{BASE}/auth/login", method="POST", data={"username": "lakshmi.devi", "password": "mentor123"})
mentor_token = res["data"]["access_token"]
mentor_headers = {"Authorization": f"Bearer {mentor_token}"}
status, res = request_json(f"{BASE}/permissions/{req_id}/approve", method="POST", headers=mentor_headers, data={"remarks": "Medical reason verified."})
assert status == 200
perm_after_mentor = res["data"]
print(f"[OK] Mentor Approved: Status -> {perm_after_mentor['status']}, Next Approver -> {perm_after_mentor['current_approver_role']}")

# HOD Approval (Medical workflow is Mentor -> HOD)
status, res = request_json(f"{BASE}/permissions/{req_id}/approve", method="POST", headers=hod_headers, data={"remarks": "Approved by HOD."})
assert status == 200
perm_final = res["data"]
qr_pass = perm_final.get("qr_pass")
assert qr_pass is not None
pass_num = qr_pass["pass_number"]
print(f"[OK] HOD Final Approval: Status -> {perm_final['status']} | QR Pass Generated -> {pass_num}")

# Public QR Verification (No Auth required)
status, res = request_json(f"{BASE}/permissions/verify/{pass_num}")
assert status == 200
verify_data = res["data"]
print(f"[OK] Public QR Verification (/verify/{pass_num}): Pass Status -> {verify_data['status']} (Valid: {verify_data['valid']})")

# 9. Notifications
status, res = request_json(f"{BASE}/notifications", headers=student_headers)
assert status == 200
notif_data = res["data"]
print(f"[OK] Student Notifications: {notif_data['total']} notification(s) found (Unread: {notif_data['unread_count']})")

print("="*60)
print("       ALL LIVE API SMOKE TESTS PASSED PERFECTLY!")
print("="*60)
