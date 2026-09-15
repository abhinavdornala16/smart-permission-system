"""Backend API test suite."""
import json
import pytest
from datetime import date, timedelta
from app import create_app
from app.extensions import db
from seed import seed


@pytest.fixture(scope='module')
def client():
    """Test client fixture initialized with seeded database."""
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            from app.models import User, Faculty, Student, Department, Section, PermissionRequest, ApprovalHistory, FacultyLeave, FacultyLeaveHistory, SubstituteRequest, Notification, AuditLog, WorkflowConfig
            db.create_all()
            from seed import seed, _sync_sqlite_columns
            _sync_sqlite_columns()
            seed(app)
        yield client
        with app.app_context():
            db.session.remove()


def get_token(client, username, password):
    """Helper to obtain JWT access token."""
    res = client.post('/api/auth/login', json={'username': username, 'password': password})
    assert res.status_code == 200, f"Login failed for {username}: {res.json}"
    return res.json['data']['access_token']


def test_login_success(client):
    """Test successful login for student."""
    res = client.post('/api/auth/login', json={
        'username': 'rahul.sharma',
        'password': 'student123'
    })
    assert res.status_code == 200
    data = res.json
    assert data['success'] is True
    assert 'access_token' in data['data']
    assert data['data']['user']['role'] == 'student'


def test_login_invalid_credentials(client):
    """Test login failure with wrong password."""
    res = client.post('/api/auth/login', json={
        'username': 'rahul.sharma',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401
    assert res.json['success'] is False


def test_student_profile(client):
    """Test getting current user profile."""
    token = get_token(client, 'rahul.sharma', 'student123')
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json['data']['username'] == 'rahul.sharma'


def test_student_forbidden_from_faculty_leave(client):
    """Test backend role security: Student CANNOT access faculty leave."""
    token = get_token(client, 'rahul.sharma', 'student123')
    res = client.get('/api/faculty/leaves', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 403
    assert res.json['success'] is False
    assert res.json['error'] == 'FORBIDDEN'


def test_student_forbidden_from_admin(client):
    """Test backend role security: Student CANNOT access admin endpoints."""
    token = get_token(client, 'rahul.sharma', 'student123')
    res = client.get('/api/admin/users', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 403
    assert res.json['success'] is False
    assert res.json['error'] == 'FORBIDDEN'


def test_create_permission_request(client):
    """Test student creating a new out_pass permission request."""
    token = get_token(client, 'rahul.sharma', 'student123')
    tomorrow = (date.today() + timedelta(days=2)).isoformat()
    
    res = client.post('/api/permissions', headers={'Authorization': f'Bearer {token}'}, json={
        'permission_type': 'out_pass',
        'reason': 'Visiting hospital for health checkup.',
        'date': tomorrow,
        'from_time': '10:00',
        'to_time': '14:00',
        'destination': 'City Hospital',
        'contact_number': '9876543210',
    })
    assert res.status_code == 201
    data = res.json['data']
    assert data['status'] == 'pending'
    assert data['current_approver_role'] == 'mentor'


def test_permission_approval_workflow(client):
    """Test full multi-level approval flow: Student -> Mentor -> Class Teacher -> HOD -> QR Pass."""
    # 1. Student creates request
    stu_token = get_token(client, 'priya.reddy', 'student123')
    req_date = (date.today() + timedelta(days=3)).isoformat()
    
    create_res = client.post('/api/permissions', headers={'Authorization': f'Bearer {stu_token}'}, json={
        'permission_type': 'out_pass',
        'reason': 'Attending hackathon',
        'date': req_date,
        'from_time': '09:00',
        'to_time': '17:00',
        'destination': 'Tech Park',
    })
    assert create_res.status_code == 201
    req_id = create_res.json['data']['id']

    # 2. Mentor approves
    mentor_token = get_token(client, 'lakshmi.devi', 'mentor123')
    mentor_app = client.post(f'/api/permissions/{req_id}/approve',
                             headers={'Authorization': f'Bearer {mentor_token}'},
                             json={'remarks': 'Approved by mentor.'})
    assert mentor_app.status_code == 200
    assert mentor_app.json['data']['current_approver_role'] == 'class_teacher'

    # 3. Class Teacher approves
    ct_token = get_token(client, 'mahesh.rao', 'teacher123')
    ct_app = client.post(f'/api/permissions/{req_id}/approve',
                          headers={'Authorization': f'Bearer {ct_token}'},
                          json={'remarks': 'Approved by class teacher.'})
    assert ct_app.status_code == 200
    assert ct_app.json['data']['current_approver_role'] == 'hod'

    # 4. HOD approves (Final approval -> QR pass generated)
    hod_token = get_token(client, 'ravi.kumar', 'hod123')
    hod_app = client.post(f'/api/permissions/{req_id}/approve',
                           headers={'Authorization': f'Bearer {hod_token}'},
                           json={'remarks': 'Final approval by HOD.'})
    assert hod_app.status_code == 200
    data = hod_app.json['data']
    assert data['status'] == 'approved'
    assert 'qr_pass' in data
    pass_number = data['qr_pass']['pass_number']

    # 5. Public QR Verification
    verify_res = client.get(f'/api/permissions/verify/{pass_number}')
    assert verify_res.status_code == 200
    assert verify_res.json['data']['status'] == 'VALID'
    assert verify_res.json['data']['valid'] is True


def test_smart_substitute_selection(client):
    """Test smart substitute selection logic."""
    fac_token = get_token(client, 'arjun.mehta', 'faculty123')
    target_date = (date.today() + timedelta(days=1)).isoformat()
    
    res = client.get(f'/api/substitutes/available?date={target_date}&start_time=09:00&end_time=10:00&department=Computer%20Science%20and%20Engineering',
                     headers={'Authorization': f'Bearer {fac_token}'})
    assert res.status_code == 200
    substitutes = res.json['data']
    assert len(substitutes) > 0
    assert 'suitability_score' in substitutes[0]
