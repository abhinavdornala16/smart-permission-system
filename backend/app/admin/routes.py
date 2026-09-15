"""Admin routes — user management, departments, timetable, workflow config, audit logs."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.user import User, Student, Faculty, Department, Section
from ..models.timetable import FacultyTimetable
from ..models.workflow import WorkflowConfig
from ..models.audit_log import AuditLog
from ..utils.decorators import role_required, get_current_user
from ..utils.permissions import create_audit_log
from datetime import time

admin_bp = Blueprint('admin', __name__)


# ─── User Management ────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@role_required('admin', 'hod')
def get_users():
    """List all users with optional filters."""
    role = request.args.get('role')
    department = request.args.get('department')
    search = request.args.get('search', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = User.query
    if role:
        query = query.filter_by(role=role)
    if department:
        query = query.filter_by(department_id=department)
    if search:
        query = query.filter(
            (User.full_name.ilike(f'%{search}%')) |
            (User.username.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%'))
        )

    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'message': 'Users retrieved.',
        'data': {
            'users': [u.to_dict(include_profile=True) for u in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
        }
    }), 200


@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_user():
    """Create a new user."""
    data = request.get_json()
    required = ['username', 'email', 'password', 'full_name', 'role']
    for field in required:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'{field} is required.', 'error': 'MISSING_FIELD'}), 400

    if data['role'] not in User.ROLES:
        return jsonify({'success': False, 'message': 'Invalid role.', 'error': 'INVALID_ROLE'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'message': 'Username already exists.', 'error': 'DUPLICATE_USERNAME'}), 409

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'message': 'Email already exists.', 'error': 'DUPLICATE_EMAIL'}), 409

    user = User(
        username=data['username'],
        email=data['email'],
        full_name=data['full_name'],
        role=data['role'],
        department_id=data.get('department_id'),
        phone=data.get('phone', ''),
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()

    # Create profile based on role
    if data['role'] == 'student':
        student = Student(
            user_id=user.id,
            student_id=data.get('student_id', f'STU-{user.id}'),
            department=data.get('department_name', ''),
            section=data.get('section', 'A'),
            year=data.get('year', 1),
            semester=data.get('semester', 1),
            mentor_id=data.get('mentor_id'),
            class_teacher_id=data.get('class_teacher_id'),
        )
        db.session.add(student)
    elif data['role'] in ('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod'):
        faculty = Faculty(
            user_id=user.id,
            employee_id=data.get('employee_id', f'FAC-{user.id}'),
            department=data.get('department_name', ''),
            designation=data.get('designation', ''),
            specialization=data.get('specialization', ''),
        )
        db.session.add(faculty)

    db.session.commit()

    admin = get_current_user()
    create_audit_log(admin.id, 'created_user', 'user', user.id,
                     new_status='active', ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'User created successfully.',
        'data': user.to_dict(include_profile=True)
    }), 201


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
def update_user(user_id):
    """Update a user's information."""
    user = db.get_or_404(User, user_id)
    data = request.get_json()

    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'email' in data:
        existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
        if existing:
            return jsonify({'success': False, 'message': 'Email already in use.', 'error': 'DUPLICATE_EMAIL'}), 409
        user.email = data['email']
    if 'role' in data and data['role'] in User.ROLES:
        user.role = data['role']
    if 'department_id' in data:
        user.department_id = data['department_id']
    if 'phone' in data:
        user.phone = data['phone']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()

    admin = get_current_user()
    create_audit_log(admin.id, 'updated_user', 'user', user.id, ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'User updated.',
        'data': user.to_dict(include_profile=True)
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_user(user_id):
    """Deactivate a user (soft delete)."""
    user = db.get_or_404(User, user_id)
    user.is_active = False
    db.session.commit()

    admin = get_current_user()
    create_audit_log(admin.id, 'deactivated_user', 'user', user.id,
                     'active', 'deactivated', ip_address=request.remote_addr)

    return jsonify({'success': True, 'message': 'User deactivated.', 'data': None}), 200


# ─── Department Management ──────────────────────────────────────────────────

@admin_bp.route('/departments', methods=['GET'])
@jwt_required()
@role_required('admin', 'hod', 'coordinator')
def get_departments():
    """List all departments."""
    depts = Department.query.filter_by(is_active=True).all()
    return jsonify({
        'success': True,
        'message': 'Departments retrieved.',
        'data': [d.to_dict() for d in depts]
    }), 200


@admin_bp.route('/departments', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_department():
    """Create a new department."""
    data = request.get_json()
    if not data.get('name') or not data.get('code'):
        return jsonify({'success': False, 'message': 'Name and code required.', 'error': 'MISSING_FIELD'}), 400

    dept = Department(name=data['name'], code=data['code'], hod_id=data.get('hod_id'))
    db.session.add(dept)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Department created.', 'data': dept.to_dict()}), 201


# ─── Section Management ─────────────────────────────────────────────────────

@admin_bp.route('/sections', methods=['GET'])
@jwt_required()
@role_required('admin', 'hod', 'coordinator', 'class_teacher')
def get_sections():
    """List all sections."""
    dept_id = request.args.get('department_id', type=int)
    query = Section.query.filter_by(is_active=True)
    if dept_id:
        query = query.filter_by(department_id=dept_id)
    sections = query.all()
    return jsonify({
        'success': True,
        'message': 'Sections retrieved.',
        'data': [s.to_dict() for s in sections]
    }), 200


# ─── Timetable Management ───────────────────────────────────────────────────

@admin_bp.route('/timetable', methods=['GET'])
@jwt_required()
@role_required('admin', 'coordinator', 'hod')
def get_all_timetable():
    """Get all timetable entries with filters."""
    faculty_id = request.args.get('faculty_id', type=int)
    day = request.args.get('day')

    query = FacultyTimetable.query.filter_by(is_active=True)
    if faculty_id:
        query = query.filter_by(faculty_id=faculty_id)
    if day:
        query = query.filter_by(day=day)

    entries = query.order_by(FacultyTimetable.day, FacultyTimetable.start_time).all()
    return jsonify({
        'success': True,
        'message': 'Timetable retrieved.',
        'data': [e.to_dict() for e in entries]
    }), 200


@admin_bp.route('/timetable', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_timetable_entry():
    """Create a new timetable entry."""
    data = request.get_json()
    required = ['faculty_id', 'day', 'period', 'subject', 'section', 'start_time', 'end_time']
    for field in required:
        if not data.get(field) and data.get(field) != 0:
            return jsonify({'success': False, 'message': f'{field} is required.', 'error': 'MISSING_FIELD'}), 400

    try:
        start = time.fromisoformat(data['start_time'])
        end = time.fromisoformat(data['end_time'])
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid time format.', 'error': 'INVALID_FORMAT'}), 400

    entry = FacultyTimetable(
        faculty_id=data['faculty_id'],
        day=data['day'],
        period=data['period'],
        subject=data['subject'],
        section=data['section'],
        room=data.get('room', ''),
        start_time=start,
        end_time=end,
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Timetable entry created.', 'data': entry.to_dict()}), 201


@admin_bp.route('/timetable/<int:entry_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
def update_timetable_entry(entry_id):
    """Update a timetable entry."""
    entry = db.get_or_404(FacultyTimetable, entry_id)
    data = request.get_json()

    if 'subject' in data:
        entry.subject = data['subject']
    if 'section' in data:
        entry.section = data['section']
    if 'room' in data:
        entry.room = data['room']
    if 'start_time' in data:
        entry.start_time = time.fromisoformat(data['start_time'])
    if 'end_time' in data:
        entry.end_time = time.fromisoformat(data['end_time'])
    if 'is_active' in data:
        entry.is_active = data['is_active']

    db.session.commit()
    return jsonify({'success': True, 'message': 'Entry updated.', 'data': entry.to_dict()}), 200


@admin_bp.route('/timetable/<int:entry_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_timetable_entry(entry_id):
    """Deactivate a timetable entry."""
    entry = db.get_or_404(FacultyTimetable, entry_id)
    entry.is_active = False
    db.session.commit()
    return jsonify({'success': True, 'message': 'Entry deactivated.', 'data': None}), 200


# ─── Workflow Configuration ─────────────────────────────────────────────────

@admin_bp.route('/workflows', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_workflows():
    """Get all workflow configurations."""
    workflows = WorkflowConfig.query.order_by(
        WorkflowConfig.request_type, WorkflowConfig.step_number
    ).all()
    return jsonify({
        'success': True,
        'message': 'Workflows retrieved.',
        'data': [w.to_dict() for w in workflows]
    }), 200


@admin_bp.route('/workflows', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_workflow():
    """Create or update a workflow step."""
    data = request.get_json()
    required = ['request_type', 'step_number', 'approver_role']
    for field in required:
        if not data.get(field) and data.get(field) != 0:
            return jsonify({'success': False, 'message': f'{field} is required.', 'error': 'MISSING_FIELD'}), 400

    # Check for existing
    existing = WorkflowConfig.query.filter_by(
        request_type=data['request_type'],
        step_number=data['step_number']
    ).first()

    if existing:
        existing.approver_role = data['approver_role']
        existing.is_active = data.get('is_active', True)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Workflow step updated.', 'data': existing.to_dict()}), 200

    wf = WorkflowConfig(
        request_type=data['request_type'],
        step_number=data['step_number'],
        approver_role=data['approver_role'],
        is_active=data.get('is_active', True),
    )
    db.session.add(wf)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Workflow step created.', 'data': wf.to_dict()}), 201


@admin_bp.route('/workflows/<int:wf_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_workflow(wf_id):
    """Delete a workflow step."""
    wf = db.get_or_404(WorkflowConfig, wf_id)
    db.session.delete(wf)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Workflow step deleted.', 'data': None}), 200


# ─── Audit Logs ─────────────────────────────────────────────────────────────

@admin_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
@role_required('admin', 'hod')
def get_audit_logs():
    """Get audit logs with filters."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    entity_type = request.args.get('entity_type')
    user_id = request.args.get('user_id', type=int)

    query = AuditLog.query
    if entity_type:
        query = query.filter_by(entity_type=entity_type)
    if user_id:
        query = query.filter_by(user_id=user_id)

    query = query.order_by(AuditLog.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'message': 'Audit logs retrieved.',
        'data': {
            'logs': [l.to_dict() for l in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
        }
    }), 200


# ─── Dashboard Stats ────────────────────────────────────────────────────────

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_dashboard():
    """Get admin dashboard statistics."""
    from ..models.permission import PermissionRequest
    from ..models.faculty_leave import FacultyLeave
    from ..models.qr_pass import QRPass

    stats = {
        'total_users': User.query.count(),
        'active_users': User.query.filter_by(is_active=True).count(),
        'total_students': User.query.filter_by(role='student').count(),
        'total_faculty': User.query.filter(User.role.in_(['faculty', 'mentor', 'class_teacher', 'coordinator', 'hod'])).count(),
        'pending_permissions': PermissionRequest.query.filter(PermissionRequest.status.in_(['pending', 'under_review'])).count(),
        'approved_permissions': PermissionRequest.query.filter_by(status='approved').count(),
        'rejected_permissions': PermissionRequest.query.filter_by(status='rejected').count(),
        'pending_leaves': FacultyLeave.query.filter(FacultyLeave.status.in_(['pending', 'substitute_pending', 'coordinator_review', 'hod_review'])).count(),
        'approved_leaves': FacultyLeave.query.filter_by(status='approved').count(),
        'active_qr_passes': QRPass.query.filter_by(status='active').count(),
        'total_departments': Department.query.filter_by(is_active=True).count(),
    }

    return jsonify({
        'success': True,
        'message': 'Dashboard stats retrieved.',
        'data': stats
    }), 200
