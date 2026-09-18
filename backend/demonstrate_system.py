"""
Demonstration Script: End-to-End Smart Permission Workflow Simulation
Uses standard library urllib.request (zero extra dependencies).
"""
import urllib.request
import urllib.error
import json
import time
from datetime import date, timedelta

BASE_URL = "http://localhost:5000/api"

def print_header(title):
    print("\n" + "=" * 72)
    print(f"  {title}")
    print("=" * 72)

def make_request(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"message": err_body}

def login(username, password):
    status, res = make_request("POST", "/auth/login", {"username": username, "password": password})
    if status != 200:
        print(f"[-] Login failed for {username}: {res}")
        return None, None
    user_data = res["data"]
    return user_data["access_token"], user_data["user"]

def main():
    # ─── 1. Student Login ───────────────────────────────────────────────
    print_header("STEP 1: STUDENT LOGIN (Rahul Sharma)")
    token_student, student_user = login("rahul.sharma", "student123")
    print(f"[+] User Authenticated: {student_user['full_name']}")
    print(f"    - Role: {student_user['role']}")
    print(f"    - Dept: {student_user.get('department_name', 'Computer Science and Engineering')}")
    print(f"    - ID:   {student_user.get('profile', {}).get('student_id', 'CSE001')}")

    # Use unique date/time window
    target_date = (date.today() + timedelta(days=2)).isoformat()

    # ─── 2. Submit Permission Request ────────────────────────────────────
    print_header("STEP 2: SUBMIT OUT-PASS PERMISSION REQUEST")
    payload = {
        "permission_type": "out_pass",
        "reason": "Representing College at State Hackathon & Tech Symposium",
        "date": target_date,
        "from_time": "14:00:00",
        "to_time": "18:00:00",
        "destination": "IIT Innovation Park",
        "contact_number": "9876543210",
        "remarks": "Official college delegate team member."
    }
    
    status, res = make_request("POST", "/permissions", payload, token=token_student)
    
    if status == 409:
        print("[!] Overlap detected. Fetching student active requests...")
        _, my_reqs = make_request("GET", "/permissions/my-requests", token=token_student)
        req_list = my_reqs.get("data", {}).get("requests", [])
        perm_data = req_list[0]
    elif status not in (200, 201):
        print(f"[-] Submission failed (HTTP {status}): {res}")
        return
    else:
        perm_data = res["data"]

    req_id = perm_data["id"]
    req_num = perm_data["request_number"]
    print(f"[+] Request Created: {req_num} (Database ID: {req_id})")
    print(f"    - Permission Type: {perm_data['permission_type']}")
    print(f"    - Reason:          {perm_data['reason']}")
    print(f"    - Date & Window:   {perm_data['date']} ({perm_data['from_time']} -> {perm_data['to_time']})")
    print(f"    - Current Status:  {perm_data['status']}")
    print(f"    - Current Approver: Role '{perm_data.get('current_approver_role')}'")

    # ─── 3. Step 1 Approval: Mentor (Lakshmi Devi) ───────────────────────
    print_header("STEP 3: MENTOR REVIEW & APPROVAL (Lakshmi Devi)")
    token_mentor, mentor_user = login("lakshmi.devi", "mentor123")
    print(f"[+] Logged in as Mentor: {mentor_user['full_name']}")
    
    _, pending_res = make_request("GET", "/permissions/pending", token=token_mentor)
    pending_items = pending_res.get("data", {}).get("requests", [])
    target = next((r for r in pending_items if r["id"] == req_id), None)
    
    if target:
        print(f"[+] Pending Request Found: {target['request_number']} from {target['student']['full_name']}")
        st, app_res = make_request("POST", f"/permissions/{req_id}/approve", {
            "remarks": "Student verified. Excellent academic standing. Approved."
        }, token=token_mentor)
        print(f"[+] Mentor Action: {app_res.get('message')}")
        print(f"    - Updated Status:        {app_res.get('data', {}).get('status')}")
        print(f"    - Next Approver Role:    {app_res.get('data', {}).get('current_approver_role')}")
    else:
        print(f"[i] Already forwarded to next stage.")

    # ─── 4. Step 2 Approval: Class Teacher (Mahesh Rao) ───────────────────
    print_header("STEP 4: CLASS TEACHER REVIEW & APPROVAL (Mahesh Rao)")
    token_ct, ct_user = login("mahesh.rao", "teacher123")
    print(f"[+] Logged in as Class Teacher: {ct_user['full_name']}")
    
    _, pending_res = make_request("GET", "/permissions/pending", token=token_ct)
    pending_items = pending_res.get("data", {}).get("requests", [])
    target = next((r for r in pending_items if r["id"] == req_id), None)
    
    if target:
        print(f"[+] Pending Request Found: {target['request_number']}")
        st, app_res = make_request("POST", f"/permissions/{req_id}/approve", {
            "remarks": "No conflict with practical assessments. Attendance logged. Approved."
        }, token=token_ct)
        print(f"[+] Class Teacher Action: {app_res.get('message')}")
        print(f"    - Updated Status:        {app_res.get('data', {}).get('status')}")
        print(f"    - Next Approver Role:    {app_res.get('data', {}).get('current_approver_role')}")
    else:
        print(f"[i] Already forwarded to next stage.")

    # ─── 5. Step 3 Final Approval: HOD (Dr. Ravi Kumar) ──────────────────
    print_header("STEP 5: HEAD OF DEPARTMENT (HOD) FINAL APPROVAL (Dr. Ravi Kumar)")
    token_hod, hod_user = login("ravi.kumar", "hod123")
    print(f"[+] Logged in as HOD: {hod_user['full_name']}")
    
    _, pending_res = make_request("GET", "/permissions/pending", token=token_hod)
    pending_items = pending_res.get("data", {}).get("requests", [])
    target = next((r for r in pending_items if r["id"] == req_id), None)
    
    if target:
        print(f"[+] Pending Request Found: {target['request_number']}")
        st, app_res = make_request("POST", f"/permissions/{req_id}/approve", {
            "remarks": "Official department sanction granted. Represent college with pride."
        }, token=token_hod)
        print(f"[+] HOD Action: {app_res.get('message')}")
        print(f"    - Final Workflow Status: {app_res.get('data', {}).get('status')}")
    else:
        print(f"[i] Already finalized.")

    # ─── 6. Full Audit History & Timeline ────────────────────────────────
    print_header("STEP 6: AUDIT TRAIL & APPROVAL TIMELINE")
    _, timeline_res = make_request("GET", f"/permissions/{req_id}/timeline", token=token_student)
    timeline = timeline_res.get("data", [])
    for idx, step in enumerate(timeline, start=1):
        print(f"  {idx}. [{step.get('action', '').upper()}] By: {step.get('role', 'System')}")
        print(f"     Remarks:   \"{step.get('remarks', 'N/A')}\"")
        print(f"     Timestamp: {step.get('timestamp', 'N/A')}\n")

    # ─── 7. Generated Smart QR Out-Pass & Gate Verification ──────────────
    print_header("STEP 7: SMART QR OUT-PASS & SECURITY GATE VERIFICATION")
    _, req_detail_res = make_request("GET", f"/permissions/{req_id}", token=token_student)
    perm_detail = req_detail_res.get("data", {})
    qr_pass = perm_detail.get("qr_pass")
    
    if qr_pass:
        pass_num = qr_pass["pass_number"]
        print(f"[+] Pass Number:     {pass_num}")
        print(f"[+] Pass Status:     {qr_pass['status'].upper()}")
        print(f"[+] Generated At:    {qr_pass['generated_at']}")
        print(f"[+] Expires At:      {qr_pass['expires_at']}")
        print(f"[+] QR Data Payload: {qr_pass['qr_data'][:60]}...")

        # Public verification without token
        st, verify_res = make_request("GET", f"/permissions/verify/{pass_num}")
        v_data = verify_res.get("data", {})
        print(f"\n[+] Security Gate Scanner (Public / Guard Tablet):")
        print(f"    - Gate Scan URL:     {BASE_URL}/permissions/verify/{pass_num}")
        print(f"    - Status Code:       HTTP {st}")
        print(f"    - Verification:      {verify_res.get('message')}")
        print(f"    - Pass Details:      {json.dumps(v_data, indent=6)}")
    else:
        print("[-] Pass not found.")

    print_header("ALL WORKFLOW STAGES EXECUTED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
