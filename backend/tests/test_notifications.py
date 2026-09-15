"""Test suite for notifications and JWT authentication edge cases."""
import pytest
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
    res = client.post('/api/auth/login', json={'username': username, 'password': password})
    assert res.status_code == 200, f"Login failed for {username}: {res.json}"
    return res.json['data']['access_token']


# Test A — Student (rahul.sharma)
def test_notifications_student_rahul(client):
    token = get_token(client, 'rahul.sharma', 'student123')
    res = client.get('/api/notifications?per_page=5', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json['success'] is True
    assert 'notifications' in res.json['data']
    assert 'unread_count' in res.json['data']


# Test B — Another Student (priya.reddy)
def test_notifications_student_priya(client):
    token = get_token(client, 'priya.reddy', 'student123')
    res = client.get('/api/notifications?per_page=5', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json['success'] is True


# Test C — Faculty (arjun.mehta)
def test_notifications_faculty_arjun(client):
    token = get_token(client, 'arjun.mehta', 'faculty123')
    res = client.get('/api/notifications?per_page=5', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json['success'] is True


# Test D — HOD (ravi.kumar)
def test_notifications_hod_ravi(client):
    token = get_token(client, 'ravi.kumar', 'hod123')
    res = client.get('/api/notifications?per_page=5', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json['success'] is True


# Test E — Admin (admin)
def test_notifications_admin(client):
    token = get_token(client, 'admin', 'admin123')
    res = client.get('/api/notifications?per_page=5', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json['success'] is True


# Test F — No Token
def test_notifications_no_token(client):
    res = client.get('/api/notifications?per_page=5')
    assert res.status_code == 401
    assert res.json['success'] is False


# Test G — Invalid Token
def test_notifications_invalid_token(client):
    res = client.get('/api/notifications?per_page=5', headers={'Authorization': 'Bearer invalid.token.value'})
    assert res.status_code == 401
    assert res.json['success'] is False


# Test H — User With No Notifications
def test_notifications_empty_for_clean_user(client):
    token = get_token(client, 'pooja.kumar', 'student123')
    res = client.get('/api/notifications?per_page=5', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json['success'] is True
    assert res.json['data']['total'] == 0
    assert res.json['data']['notifications'] == []
