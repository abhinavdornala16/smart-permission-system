"""Tests for Faculty Leave Multi-Tier Approval Workflow:
Faculty -> Coordinator -> HOD -> Approved / Rejected.
"""
import pytest
from datetime import date, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.faculty_leave import FacultyLeave, FacultyLeaveHistory
from app.models.notification import Notification
from seed import seed, _sync_sqlite_columns


@pytest.fixture(scope='module')
def client():
    app = create_app('testing')
    with app.test_client() as test_client:
        with app.app_context():
            from app.models import User, Faculty, Student, Department, Section, PermissionRequest, ApprovalHistory, FacultyLeave, FacultyLeaveHistory, SubstituteRequest, Notification, AuditLog, WorkflowConfig
            db.create_all()
            _sync_sqlite_columns()
            seed(app)
        yield test_client


def get_token(client, username, password):
    res = client.post('/api/auth/login', json={'username': username, 'password': password})
    assert res.status_code == 200, f"Login failed for {username}: {res.json}"
    return res.get_json()['data']['access_token']


def auth_header(token):
    return {'Authorization': f'Bearer {token}'}


def test_faculty_leave_submission_targets_coordinator(client):
    """When a faculty applies for leave, it MUST have status pending_coordinator and notify Coordinator."""
    faculty_token = get_token(client, 'arjun.mehta', 'faculty123')
    
    # Submit leave
    leave_payload = {
        'leave_type': 'medical',
        'reason': 'Dental surgery and post-op care.',
        'start_date': (date.today() + timedelta(days=7)).isoformat(),
        'end_date': (date.today() + timedelta(days=8)).isoformat(),
        'session': 'full_day',
        'remarks': 'Dr. appointment confirmed.'
    }
    
    res = client.post('/api/faculty/leave', json=leave_payload, headers=auth_header(faculty_token))
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    
    leave_data = data['data']['leave']
    assert leave_data['status'] == 'pending_coordinator'
    assert leave_data['current_approver'] == 'coordinator'
    assert leave_data['coordinator_id'] is not None
    assert leave_data['coordinator_name'] == 'Divya Sharma'
    
    # Verify initial history entry in returned object
    history = leave_data.get('history', [])
    assert len(history) >= 1
    assert history[0]['action'] == 'submitted'
    assert history[0]['role'] == 'faculty'
    assert history[0]['status_after'] == 'pending_coordinator'


def test_coordinator_pending_and_hod_isolation(client):
    """Coordinator sees pending_coordinator leaves, but HOD does NOT see them yet."""
    coord_token = get_token(client, 'divya.sharma', 'coordinator123')
    hod_token = get_token(client, 'ravi.kumar', 'hod123')
    
    # Coordinator pending leaves
    coord_res = client.get('/api/substitutes/coordinator/pending', headers=auth_header(coord_token))
    assert coord_res.status_code == 200
    coord_leaves = coord_res.get_json()['data']
    coord_req_nums = [l['request_number'] for l in coord_leaves]
    
    # FL-FAC001-01 (seeded for Arjun Mehta) is pending_coordinator
    assert 'FL-FAC001-01' in coord_req_nums
    
    # HOD pending leaves
    hod_res = client.get('/api/substitutes/hod/pending', headers=auth_header(hod_token))
    assert hod_res.status_code == 200
    hod_leaves = hod_res.get_json()['data']
    hod_req_nums = [l['request_number'] for l in hod_leaves]
    
    # HOD must NOT see FL-FAC001-01 (still pending coordinator)
    assert 'FL-FAC001-01' not in hod_req_nums
    # HOD MUST see FL-FAC002-01 (seeded as pending_hod)
    assert 'FL-FAC002-01' in hod_req_nums


def test_full_successful_approval_flow(client):
    """Full lifecycle: Faculty submit -> Coordinator approve -> HOD approve -> Approved."""
    faculty_token = get_token(client, 'arjun.mehta', 'faculty123')
    coord_token = get_token(client, 'divya.sharma', 'coordinator123')
    hod_token = get_token(client, 'ravi.kumar', 'hod123')
    
    # 1. Faculty submits
    sub_res = client.post('/api/faculty/leave', json={
        'leave_type': 'conference',
        'reason': 'Presenting AI paper at conference',
        'date': (date.today() + timedelta(days=10)).isoformat(),
        'session': 'full_day'
    }, headers=auth_header(faculty_token))
    assert sub_res.status_code == 201
    leave_id = sub_res.get_json()['data']['leave']['id']
    
    # 2. Coordinator approves
    coord_appr_res = client.post(f'/api/substitutes/coordinator/{leave_id}/approve', json={
        'remarks': 'Verified schedule and substitute faculty.'
    }, headers=auth_header(coord_token))
    assert coord_appr_res.status_code == 200
    assert coord_appr_res.get_json()['data']['status'] == 'pending_hod'
    assert coord_appr_res.get_json()['data']['current_approver'] == 'hod'
    
    # Leave should now be in HOD pending queue
    hod_pending = client.get('/api/substitutes/hod/pending', headers=auth_header(hod_token)).get_json()['data']
    assert any(l['id'] == leave_id for l in hod_pending)
    
    # 3. HOD approves
    hod_appr_res = client.post(f'/api/substitutes/hod/{leave_id}/approve', json={
        'remarks': 'Approved by HOD CSE.'
    }, headers=auth_header(hod_token))
    assert hod_appr_res.status_code == 200
    assert hod_appr_res.get_json()['data']['status'] == 'approved'
    assert hod_appr_res.get_json()['data']['current_approver'] is None
    
    # 4. Verify full history timeline
    timeline_res = client.get(f'/api/faculty/leave/{leave_id}/timeline', headers=auth_header(faculty_token))
    assert timeline_res.status_code == 200
    timeline = timeline_res.get_json()['data']
    assert len(timeline) == 3
    assert timeline[0]['role'] == 'faculty' and timeline[0]['action'] == 'submitted'
    assert timeline[1]['role'] == 'coordinator' and timeline[1]['action'] == 'approved'
    assert timeline[2]['role'] == 'hod' and timeline[2]['action'] == 'approved'


def test_coordinator_rejection_flow(client):
    """When Coordinator rejects, status becomes rejected and request does NOT go to HOD."""
    faculty_token = get_token(client, 'arjun.mehta', 'faculty123')
    coord_token = get_token(client, 'divya.sharma', 'coordinator123')
    hod_token = get_token(client, 'ravi.kumar', 'hod123')
    
    # 1. Faculty submits
    sub_res = client.post('/api/faculty/leave', json={
        'leave_type': 'personal',
        'reason': 'Vacation leave during mid-term exams',
        'date': (date.today() + timedelta(days=12)).isoformat(),
        'session': 'full_day'
    }, headers=auth_header(faculty_token))
    assert sub_res.status_code == 201
    leave_id = sub_res.get_json()['data']['leave']['id']
    
    # 2. Coordinator rejects
    rej_res = client.post(f'/api/substitutes/coordinator/{leave_id}/reject', json={
        'remarks': 'Cannot approve leave during mid-term exam week.'
    }, headers=auth_header(coord_token))
    assert rej_res.status_code == 200
    assert rej_res.get_json()['data']['status'] == 'rejected'
    assert rej_res.get_json()['data']['current_approver'] is None
    
    # 3. Verify HOD does NOT see it in pending
    hod_pending = client.get('/api/substitutes/hod/pending', headers=auth_header(hod_token)).get_json()['data']
    assert not any(l['id'] == leave_id for l in hod_pending)


def test_hod_rejection_flow(client):
    """When HOD rejects, status becomes rejected."""
    faculty_token = get_token(client, 'arjun.mehta', 'faculty123')
    coord_token = get_token(client, 'divya.sharma', 'coordinator123')
    hod_token = get_token(client, 'ravi.kumar', 'hod123')
    
    # 1. Faculty submits
    sub_res = client.post('/api/faculty/leave', json={
        'leave_type': 'official_work',
        'reason': 'External workshop participation',
        'date': (date.today() + timedelta(days=15)).isoformat(),
        'session': 'full_day'
    }, headers=auth_header(faculty_token))
    assert sub_res.status_code == 201
    leave_id = sub_res.get_json()['data']['leave']['id']
    
    # 2. Coordinator approves
    coord_res = client.post(f'/api/substitutes/coordinator/{leave_id}/approve', json={
        'remarks': 'Forwarded to HOD.'
    }, headers=auth_header(coord_token))
    assert coord_res.status_code == 200
    
    # 3. HOD rejects
    hod_rej_res = client.post(f'/api/substitutes/hod/{leave_id}/reject', json={
        'remarks': 'Department accreditation audit on this day.'
    }, headers=auth_header(hod_token))
    assert hod_rej_res.status_code == 200
    assert hod_rej_res.get_json()['data']['status'] == 'rejected'
    assert hod_rej_res.get_json()['data']['current_approver'] is None
