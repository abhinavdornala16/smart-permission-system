"""Faculty routes — profile, timetable, leave requests."""
import uuid
from datetime import date, time, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.user import User, Faculty
from ..models.timetable import FacultyTimetable, FacultyAvailability
from ..models.faculty_leave import FacultyLeave
from ..models.substitute import SubstituteRequest
from ..utils.decorators import role_required, get_current_user
from ..utils.permissions import create_audit_log
from ..utils.notifications import create_notification

faculty_bp = Blueprint('faculty', __name__)


# ─── Faculty Profile ────────────────────────────────────────────────────────

@faculty_bp.route('/profile', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod')
def get_profile():
    """Get current faculty profile with stats."""
    user = get_current_user()
    faculty = user.faculty_profile

    # Today's classes
    today_name = datetime.now().strftime('%A')
    today_classes = FacultyTimetable.query.filter_by(
        faculty_id=user.id, day=today_name, is_active=True
    ).order_by(FacultyTimetable.start_time).all()

    # Leave stats
    total_leaves = FacultyLeave.query.filter_by(faculty_id=user.id).count()
    pending_leaves = FacultyLeave.query.filter_by(faculty_id=user.id, status='pending').count()
    approved_leaves = FacultyLeave.query.filter_by(faculty_id=user.id, status='approved').count()

    # Substitute assignments (as substitute)
    sub_assignments = SubstituteRequest.query.filter_by(
        substitute_faculty_id=user.id, status='accepted'
    ).count()

    return jsonify({
        'success': True,
        'message': 'Profile retrieved.',
        'data': {
            'user': user.to_dict(include_profile=True),
            'today_classes': [c.to_dict() for c in today_classes],
            'stats': {
                'today_classes': len(today_classes),
                'total_leaves': total_leaves,
                'pending_leaves': pending_leaves,
                'approved_leaves': approved_leaves,
                'substitute_assignments': sub_assignments,
            }
        }
    }), 200


# ─── Faculty Timetable ──────────────────────────────────────────────────────

@faculty_bp.route('/timetable', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def get_timetable():
    """Get the weekly timetable for a faculty member."""
    user = get_current_user()
    faculty_id = request.args.get('faculty_id', user.id, type=int)

    # Non-admin can only view their own timetable unless coordinator/hod/admin
    if faculty_id != user.id and user.role not in ('coordinator', 'hod', 'admin'):
        return jsonify({'success': False, 'message': 'Access denied.', 'error': 'FORBIDDEN'}), 403

    entries = FacultyTimetable.query.filter_by(
        faculty_id=faculty_id, is_active=True
    ).order_by(FacultyTimetable.day, FacultyTimetable.start_time).all()

    # Group by day
    timetable = {}
    for entry in entries:
        if entry.day not in timetable:
            timetable[entry.day] = []
        timetable[entry.day].append(entry.to_dict())

    return jsonify({
        'success': True,
        'message': 'Timetable retrieved.',
        'data': {
            'faculty_id': faculty_id,
            'timetable': timetable,
            'entries': [e.to_dict() for e in entries],
        }
    }), 200


# ─── Faculty: Apply Leave ───────────────────────────────────────────────────

@faculty_bp.route('/leave', methods=['POST'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator')
def apply_leave():
    """Faculty submits a leave request."""
    user = get_current_user()
    data = request.get_json()

    required = ['leave_type', 'reason']
    for field in required:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'{field} is required.', 'error': 'MISSING_FIELD'}), 400

    # Ensure date or start_date is provided
    if not data.get('date') and not data.get('start_date'):
        return jsonify({'success': False, 'message': 'Leave date is required.', 'error': 'MISSING_FIELD'}), 400

    leave_type = data['leave_type']
    if leave_type not in FacultyLeave.LEAVE_TYPES:
        return jsonify({'success': False, 'message': f'Invalid leave type: {leave_type}', 'error': 'INVALID_TYPE'}), 400

    session = data.get('session', 'full_day')
    if session not in FacultyLeave.SESSIONS:
        session = 'full_day'

    try:
        if data.get('start_date'):
            start_d = date.fromisoformat(data['start_date'])
            end_d = date.fromisoformat(data.get('end_date', data['start_date']))
            leave_date = start_d
        else:
            leave_date = date.fromisoformat(data['date'])
            start_d = leave_date
            end_d = date.fromisoformat(data.get('end_date', data['date']))
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format.', 'error': 'INVALID_FORMAT'}), 400

    # Parse times based on session
    from_time = None
    to_time = None
    if session == 'morning':
        from_time = time(9, 0)
        to_time = time(13, 0)
    elif session == 'afternoon':
        from_time = time(13, 0)
        to_time = time(17, 0)
    elif session == 'full_day':
        from_time = time(9, 0)
        to_time = time(17, 0)
    elif session == 'custom':
        try:
            from_time = time.fromisoformat(data.get('from_time', '09:00'))
            to_time = time.fromisoformat(data.get('to_time', '17:00'))
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid time format.', 'error': 'INVALID_FORMAT'}), 400

    # 1. Map Faculty to Department Coordinator
    coord = None
    from ..models.user import Department
    if user.department_id:
        coord = User.query.filter_by(department_id=user.department_id, role='coordinator', is_active=True).first()
    if not coord and user.faculty_profile and user.faculty_profile.department:
        dept = Department.query.filter(
            (Department.name.ilike(user.faculty_profile.department)) |
            (Department.code.ilike(user.faculty_profile.department))
        ).first()
        if dept:
            coord = User.query.filter_by(department_id=dept.id, role='coordinator', is_active=True).first()
    if not coord:
        coord = User.query.filter_by(role='coordinator', is_active=True).first()

    req_number = f"FL-{uuid.uuid4().hex[:6].upper()}"

    leave = FacultyLeave(
        request_number=req_number,
        faculty_id=user.id,
        coordinator_id=coord.id if coord else None,
        department_id=user.department_id or (coord.department_id if coord else None),
        leave_type=leave_type,
        reason=data['reason'],
        date=leave_date,
        start_date=start_d,
        end_date=end_d,
        session=session,
        from_time=from_time,
        to_time=to_time,
        status='pending_coordinator',
        current_approver='coordinator',
        remarks=data.get('remarks', ''),
    )
    db.session.add(leave)
    db.session.flush()

    # Record initial history
    from ..models.faculty_leave import FacultyLeaveHistory
    history = FacultyLeaveHistory(
        leave_id=leave.id,
        user_id=user.id,
        role='faculty',
        action='submitted',
        status_after='pending_coordinator',
        remarks=data.get('remarks', 'Leave request submitted by faculty.')
    )
    db.session.add(history)
    db.session.commit()

    # Notify Coordinator ONLY
    if coord:
        create_notification(
            coord.id, 'New Faculty Leave Request',
            f'New faculty leave request from {user.full_name} requires your approval.',
            'warning', 'leave', leave.id
        )

    create_audit_log(user.id, 'created_leave', 'leave', leave.id,
                     new_status='pending_coordinator', ip_address=request.remote_addr)

    # Find affected classes
    day_name = leave_date.strftime('%A')
    affected = FacultyTimetable.query.filter_by(
        faculty_id=user.id, day=day_name, is_active=True
    ).all()

    # Filter by time range
    affected_classes = []
    for cls in affected:
        if from_time and to_time:
            if cls.start_time < to_time and cls.end_time > from_time:
                affected_classes.append(cls.to_dict())
        else:
            affected_classes.append(cls.to_dict())

    return jsonify({
        'success': True,
        'message': 'Faculty leave request submitted and forwarded to Coordinator.',
        'data': {
            'leave': leave.to_dict(include_history=True, include_substitutes=True),
            'affected_classes': affected_classes,
        }
    }), 201


# ─── Faculty: Get My Leaves ─────────────────────────────────────────────────

@faculty_bp.route('/leaves', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod')
def get_my_leaves():
    """Get leave requests for the current faculty."""
    user = get_current_user()
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    query = FacultyLeave.query.filter_by(faculty_id=user.id)
    if status:
        query = query.filter_by(status=status)

    query = query.order_by(FacultyLeave.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'message': 'Leave requests retrieved.',
        'data': {
            'leaves': [l.to_dict(include_substitutes=True, include_history=True) for l in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
        }
    }), 200


# ─── Faculty: Get Leave Detail & Timeline ───────────────────────────────────

@faculty_bp.route('/leave/<int:leave_id>', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def get_leave_detail(leave_id):
    """Get leave request details with substitute info and approval timeline."""
    leave = db.get_or_404(FacultyLeave, leave_id)
    user = get_current_user()

    # Faculty can only see their own leaves; coordinator/hod/admin can see all
    if leave.faculty_id != user.id and user.role not in ('coordinator', 'hod', 'admin'):
        return jsonify({'success': False, 'message': 'You are not authorized to access this resource.', 'error': 'FORBIDDEN'}), 403

    # Get affected classes
    day_name = leave.date.strftime('%A')
    affected = FacultyTimetable.query.filter_by(
        faculty_id=leave.faculty_id, day=day_name, is_active=True
    ).all()

    affected_classes = []
    for cls in affected:
        if leave.from_time and leave.to_time:
            if cls.start_time < leave.to_time and cls.end_time > leave.from_time:
                affected_classes.append(cls.to_dict())
        else:
            affected_classes.append(cls.to_dict())

    return jsonify({
        'success': True,
        'message': 'Leave details retrieved.',
        'data': {
            'leave': leave.to_dict(include_substitutes=True, include_history=True),
            'affected_classes': affected_classes,
        }
    }), 200


@faculty_bp.route('/leave/<int:leave_id>/timeline', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def get_leave_timeline(leave_id):
    """Get approval history timeline for a faculty leave request."""
    leave = db.get_or_404(FacultyLeave, leave_id)
    user = get_current_user()

    if leave.faculty_id != user.id and user.role not in ('coordinator', 'hod', 'admin'):
        return jsonify({'success': False, 'message': 'You are not authorized to access this resource.', 'error': 'FORBIDDEN'}), 403

    return jsonify({
        'success': True,
        'message': 'Approval timeline retrieved.',
        'data': [h.to_dict() for h in leave.history.all()]
    }), 200


# ─── Faculty: Get Affected Classes for a Date ───────────────────────────────

@faculty_bp.route('/affected-classes', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator')
def get_affected_classes():
    """Get classes affected by a potential leave on a given date."""
    user = get_current_user()
    leave_date = request.args.get('date')
    session = request.args.get('session', 'full_day')

    if not leave_date:
        return jsonify({'success': False, 'message': 'Date is required.', 'error': 'MISSING_FIELD'}), 400

    try:
        d = date.fromisoformat(leave_date)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date.', 'error': 'INVALID_FORMAT'}), 400

    day_name = d.strftime('%A')
    entries = FacultyTimetable.query.filter_by(
        faculty_id=user.id, day=day_name, is_active=True
    ).order_by(FacultyTimetable.start_time).all()

    # Filter by session time
    if session == 'morning':
        entries = [e for e in entries if e.start_time < time(13, 0)]
    elif session == 'afternoon':
        entries = [e for e in entries if e.start_time >= time(13, 0)]

    return jsonify({
        'success': True,
        'message': 'Affected classes retrieved.',
        'data': [e.to_dict() for e in entries]
    }), 200
