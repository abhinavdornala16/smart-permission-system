"""Test suite for role-based authentication and authorization."""
import pytest
from app import create_app
from app.extensions import db
from app.models.user import User


@pytest.fixture(scope='module')
def client():
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
    res = client.post('/api/auth/login', json={'username': username, 'password': password})
    assert res.status_code == 200
    return res.json['data']['access_token'], res.json['data']['user']


def auth_header(token):
    return {'Authorization': f'Bearer {token}'}


def test_1_student_login(client):
    token, user = get_token(client, 'rahul.sharma', 'student123')
    assert user['role'] == 'student'
    res = client.get('/api/auth/me', headers=auth_header(token))
    assert res.status_code == 200


def test_2_faculty_login(client):
    token, user = get_token(client, 'arjun.mehta', 'faculty123')
    assert user['role'] == 'faculty'
    res = client.get('/api/faculty/profile', headers=auth_header(token))
    assert res.status_code == 200


def test_3_mentor_login(client):
    token, user = get_token(client, 'lakshmi.devi', 'mentor123')
    assert user['role'] == 'mentor'
    res = client.get('/api/permissions/pending', headers=auth_header(token))
    assert res.status_code == 200


def test_4_class_teacher_login(client):
    token, user = get_token(client, 'mahesh.rao', 'teacher123')
    assert user['role'] == 'class_teacher'
    res = client.get('/api/permissions/pending', headers=auth_header(token))
    assert res.status_code == 200


def test_5_coordinator_login(client):
    token, user = get_token(client, 'divya.sharma', 'coordinator123')
    assert user['role'] == 'coordinator'
    res = client.get('/api/substitutes/coordinator/pending', headers=auth_header(token))
    assert res.status_code == 200


def test_6_hod_login(client):
    token, user = get_token(client, 'ravi.kumar', 'hod123')
    assert user['role'] == 'hod'
    res = client.get('/api/substitutes/hod/pending', headers=auth_header(token))
    assert res.status_code == 200


def test_7_admin_login(client):
    token, user = get_token(client, 'admin', 'admin123')
    assert user['role'] == 'admin'
    res = client.get('/api/admin/dashboard', headers=auth_header(token))
    assert res.status_code == 200


def test_8_student_attempts_faculty_leave_forbidden(client):
    token, _ = get_token(client, 'rahul.sharma', 'student123')
    res = client.get('/api/faculty/leaves', headers=auth_header(token))
    assert res.status_code == 403


def test_9_student_attempts_admin_forbidden(client):
    token, _ = get_token(client, 'rahul.sharma', 'student123')
    res = client.get('/api/admin/users', headers=auth_header(token))
    assert res.status_code == 403


def test_10_faculty_attempts_admin_forbidden(client):
    token, _ = get_token(client, 'arjun.mehta', 'faculty123')
    res = client.get('/api/admin/users', headers=auth_header(token))
    assert res.status_code == 403


def test_11_mentor_attempts_admin_forbidden(client):
    token, _ = get_token(client, 'lakshmi.devi', 'mentor123')
    res = client.get('/api/admin/users', headers=auth_header(token))
    assert res.status_code == 403


def test_12_admin_accesses_authorized_pages(client):
    token, _ = get_token(client, 'admin', 'admin123')
    headers = auth_header(token)
    assert client.get('/api/admin/dashboard', headers=headers).status_code == 200
    assert client.get('/api/admin/users', headers=headers).status_code == 200
    assert client.get('/api/reports/dashboard', headers=headers).status_code == 200
    assert client.get('/api/admin/audit-logs', headers=headers).status_code == 200
