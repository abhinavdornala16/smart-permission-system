"""Substitute management routes — smart selection, request, accept/reject."""
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

substitutes_bp = Blueprint('substitutes', __name__)


# ─── Smart Substitute Selection ─────────────────────────────────────────────

@substitutes_bp.route('/available', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def get_available_substitutes():
    """Find available substitute faculty using smart selection logic.
    
    Algorithm:
    1. Get all active faculty (excluding the requesting faculty)
    2. Remove faculty with timetable conflicts at the requested time
    3. Remove faculty already assigned as substitutes at the requested time
    4. Check explicit availability records
    5. Rank by: same department > related subject > other department
    """
    target_date = request.args.get('date')
    start = request.args.get('start_time')
    end = request.args.get('end_time')
    department = request.args.get('department', '')
    subject = request.args.get('subject', '')
    exclude_faculty_id = request.args.get('exclude_faculty_id', type=int)

    if not target_date or not start or not end:
        return jsonify({'success': False, 'message': 'date, start_time, and end_time are required.',
                       'error': 'MISSING_FIELDS'}), 400

    try:
        d = date.fromisoformat(target_date)
        start_time = time.fromisoformat(start)
        end_time = time.fromisoformat(end)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date/time format.', 'error': 'INVALID_FORMAT'}), 400

    day_name = d.strftime('%A')

    # Step 1: All active faculty with profiles
    faculty_query = User.query.join(Faculty, User.id == Faculty.user_id).filter(
        User.is_active == True,
        Faculty.is_available == True,
    )
    if exclude_faculty_id:
        faculty_query = faculty_query.filter(User.id != exclude_faculty_id)

    all_faculty = faculty_query.all()

    # Step 2: Find faculty with timetable conflicts
    busy_ids = set()
    conflicting = FacultyTimetable.query.filter(
        FacultyTimetable.day == day_name,
        FacultyTimetable.is_active == True,
        FacultyTimetable.start_time < end_time,
        FacultyTimetable.end_time > start_time,
    ).all()
    for c in conflicting:
        busy_ids.add(c.faculty_id)

    # Step 3: Find faculty already assigned as substitutes at this time
    assigned = SubstituteRequest.query.filter(
        SubstituteRequest.date == d,
        SubstituteRequest.status.in_(['pending', 'accepted']),
        SubstituteRequest.start_time < end_time,
        SubstituteRequest.end_time > start_time,
    ).all()
    for a in assigned:
        busy_ids.add(a.substitute_faculty_id)

    # Step 4: Check explicit unavailability
    unavailable = FacultyAvailability.query.filter(
        FacultyAvailability.date == d,
        FacultyAvailability.available == False,
    ).all()
    for u in unavailable:
        # Check time overlap if times are specified
        if u.start_time and u.end_time:
            if u.start_time < end_time and u.end_time > start_time:
                busy_ids.add(u.faculty_id)
        else:
            busy_ids.add(u.faculty_id)  # Whole day unavailable

    # Step 5: Filter and rank
    available = []
    for f in all_faculty:
        if f.id in busy_ids:
            continue

        fp = f.faculty_profile
        if not fp:
            continue

        # Calculate suitability score
        score = 0
        reasons = []

        # Same department = highest priority
        if department and fp.department and fp.department.lower() == department.lower():
            score += 3
            reasons.append('Same department')

        # Related subject
        if subject and fp.specialization and subject.lower() in fp.specialization.lower():
            score += 2
            reasons.append('Related subject')

        # Count current substitute assignments (fewer = better)
        current_assignments = SubstituteRequest.query.filter_by(
            substitute_faculty_id=f.id, status='accepted'
        ).filter(SubstituteRequest.date >= date.today()).count()

        available.append({
            'faculty_id': f.id,
            'faculty_name': f.full_name,
            'employee_id': fp.employee_id,
            'department': fp.department,
            'designation': fp.designation,
            'specialization': fp.specialization,
            'current_assignments': current_assignments,
            'suitability_score': score,
            'suitability_reasons': reasons,
        })

    # Sort by score descending, then by current assignments ascending
    available.sort(key=lambda x: (-x['suitability_score'], x['current_assignments']))

    return jsonify({
        'success': True,
        'message': f'{len(available)} available substitutes found.',
        'data': available
    }), 200


# ─── Create Substitute Request ──────────────────────────────────────────────

@substitutes_bp.route('/request', methods=['POST'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator')
def create_substitute_request():
    """Request a specific faculty member as substitute for a class."""
    user = get_current_user()
    data = request.get_json()

    required = ['leave_id', 'substitute_faculty_id', 'subject', 'section', 'date', 'start_time', 'end_time']
    for field in required:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'{field} is required.', 'error': 'MISSING_FIELD'}), 400

    leave = db.session.get(FacultyLeave, data['leave_id'])
    if not leave:
        return jsonify({'success': False, 'message': 'Leave request not found.', 'error': 'NOT_FOUND'}), 404

    sub_faculty = db.session.get(User, data['substitute_faculty_id'])
    if not sub_faculty:
        return jsonify({'success': False, 'message': 'Substitute faculty not found.', 'error': 'NOT_FOUND'}), 404

    try:
        sub_date = date.fromisoformat(data['date'])
        start = time.fromisoformat(data['start_time'])
        end = time.fromisoformat(data['end_time'])
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date/time format.', 'error': 'INVALID_FORMAT'}), 400

    sub_req = SubstituteRequest(
        leave_id=leave.id,
        original_faculty_id=user.id,
        substitute_faculty_id=sub_faculty.id,
        timetable_entry_id=data.get('timetable_entry_id'),
        subject=data['subject'],
        section=data['section'],
        date=sub_date,
        start_time=start,
        end_time=end,
        room=data.get('room', ''),
        status='pending',
    )
    db.session.add(sub_req)

    # Update leave status
    leave.status = 'substitute_pending'
    leave.current_approver = 'substitute'
    db.session.commit()

    # Notify substitute
    create_notification(
        sub_faculty.id, 'Substitution Request',
        f'{user.full_name} has requested you as substitute for {data["subject"]} ({data["section"]}) on {data["date"]}.',
        'warning', 'substitute', sub_req.id
    )

    create_audit_log(user.id, 'created_substitute_request', 'substitute', sub_req.id,
                     new_status='pending', ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Substitute request sent.',
        'data': sub_req.to_dict()
    }), 201


# ─── Substitute: Get Pending Requests ───────────────────────────────────────

@substitutes_bp.route('/pending', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def get_pending_substitute_requests():
    """Get substitute requests pending for the current faculty."""
    user = get_current_user()
    requests_list = SubstituteRequest.query.filter_by(
        substitute_faculty_id=user.id, status='pending'
    ).order_by(SubstituteRequest.created_at.desc()).all()

    return jsonify({
        'success': True,
        'message': 'Pending substitute requests retrieved.',
        'data': [r.to_dict() for r in requests_list]
    }), 200


# ─── Substitute: Accept ─────────────────────────────────────────────────────

@substitutes_bp.route('/<int:sub_id>/accept', methods=['POST'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def accept_substitute(sub_id):
    """Substitute faculty accepts a substitution request."""
    user = get_current_user()
    sub = db.get_or_404(SubstituteRequest, sub_id)

    if sub.substitute_faculty_id != user.id:
        return jsonify({'success': False, 'message': 'You are not authorized to access this resource.', 'error': 'FORBIDDEN'}), 403

    if sub.status != 'pending':
        return jsonify({'success': False, 'message': 'Request is not pending.', 'error': 'INVALID_STATUS'}), 400

    sub.status = 'accepted'
    db.session.commit()

    # Check if all substitutes for this leave are accepted
    leave = sub.leave
    all_subs = SubstituteRequest.query.filter_by(leave_id=leave.id).all()
    all_accepted = all(s.status == 'accepted' for s in all_subs)

    if all_accepted:
        leave.status = 'coordinator_review'
        leave.current_approver = 'coordinator'
        db.session.commit()

        # Notify coordinator
        coordinators = User.query.filter_by(role='coordinator', is_active=True).all()
        for coord in coordinators:
            create_notification(
                coord.id, 'Faculty Leave Review',
                f'Leave request {leave.request_number} has all substitutes confirmed. Please review.',
                'warning', 'leave', leave.id
            )

    # Notify requesting faculty
    create_notification(
        sub.original_faculty_id, 'Substitute Accepted',
        f'{user.full_name} has accepted your substitution request for {sub.subject}.',
        'success', 'substitute', sub.id
    )

    create_audit_log(user.id, 'accepted_substitute', 'substitute', sub.id,
                     'pending', 'accepted', ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Substitute request accepted.',
        'data': sub.to_dict()
    }), 200


# ─── Substitute: Reject ─────────────────────────────────────────────────────

@substitutes_bp.route('/<int:sub_id>/reject', methods=['POST'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def reject_substitute(sub_id):
    """Substitute faculty rejects a substitution request."""
    user = get_current_user()
    sub = db.get_or_404(SubstituteRequest, sub_id)
    data = request.get_json() or {}

    if sub.substitute_faculty_id != user.id:
        return jsonify({'success': False, 'message': 'You are not authorized to access this resource.', 'error': 'FORBIDDEN'}), 403

    if sub.status != 'pending':
        return jsonify({'success': False, 'message': 'Request is not pending.', 'error': 'INVALID_STATUS'}), 400

    reason = data.get('reason', '')
    if not reason:
        return jsonify({'success': False, 'message': 'Rejection reason is required.', 'error': 'MISSING_REASON'}), 400

    sub.status = 'rejected'
    sub.response_reason = reason
    db.session.commit()

    # Notify requesting faculty to select another substitute
    create_notification(
        sub.original_faculty_id, 'Substitute Rejected',
        f'{user.full_name} has declined your substitution request for {sub.subject}. Please select another substitute.',
        'error', 'substitute', sub.id
    )

    create_audit_log(user.id, 'rejected_substitute', 'substitute', sub.id,
                     'pending', 'rejected', reason, request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Substitute request rejected.',
        'data': sub.to_dict()
    }), 200


# ─── Substitute: My Assignments ─────────────────────────────────────────────

@substitutes_bp.route('/my-assignments', methods=['GET'])
@jwt_required()
@role_required('faculty', 'mentor', 'class_teacher', 'coordinator', 'hod', 'admin')
def get_my_assignments():
    """Get all substitute assignments for the current faculty."""
    user = get_current_user()
    status = request.args.get('status')

    query = SubstituteRequest.query.filter_by(substitute_faculty_id=user.id)
    if status:
        query = query.filter_by(status=status)

    assignments = query.order_by(SubstituteRequest.date.desc()).all()

    return jsonify({
        'success': True,
        'message': 'Assignments retrieved.',
        'data': [a.to_dict() for a in assignments]
    }), 200


# ─── Coordinator: Approve Leave ─────────────────────────────────────────────

@substitutes_bp.route('/coordinator/<int:leave_id>/approve', methods=['POST'])
@jwt_required()
@role_required('coordinator', 'admin')
def coordinator_approve(leave_id):
    """Coordinator approves faculty leave and forwards to HOD."""
    user = get_current_user()
    leave = db.get_or_404(FacultyLeave, leave_id)
    data = request.get_json() or {}
    remarks = data.get('remarks', '')

    if leave.status not in ('pending_coordinator', 'coordinator_review'):
        return jsonify({'success': False, 'message': 'Leave is not pending coordinator review.',
                       'error': 'INVALID_STATUS'}), 400

    leave.status = 'pending_hod'
    leave.current_approver = 'hod'
    leave.coordinator_approved_at = datetime.utcnow()
    leave.coordinator_remarks = remarks

    # Record history
    from ..models.faculty_leave import FacultyLeaveHistory
    history = FacultyLeaveHistory(
        leave_id=leave.id,
        user_id=user.id,
        role='coordinator',
        action='approved',
        status_after='pending_hod',
        remarks=remarks or 'Approved by Department Coordinator'
    )
    db.session.add(history)
    db.session.commit()

    # 1. Notify HOD
    from ..models.user import Department
    hod = None
    if leave.department_id:
        dept = db.session.get(Department, leave.department_id)
        if dept and dept.hod_id:
            hod = db.session.get(User, dept.hod_id)
    if not hod:
        hod = User.query.filter_by(role='hod', is_active=True).first()

    if hod:
        create_notification(
            hod.id, 'Faculty Leave Review',
            f'Faculty leave request {leave.request_number} from {leave.faculty.full_name} has been approved by Coordinator {user.full_name} and requires your approval.',
            'warning', 'leave', leave.id
        )

    # 2. Notify Faculty
    create_notification(
        leave.faculty_id, 'Leave Approved by Coordinator',
        f'Your faculty leave request {leave.request_number} has been approved by Coordinator {user.full_name} and forwarded to HOD.',
        'info', 'leave', leave.id
    )

    create_audit_log(user.id, 'coordinator approved leave', 'leave', leave.id,
                     'pending_coordinator', 'pending_hod', remarks,
                     request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Leave approved by coordinator and forwarded to HOD.',
        'data': leave.to_dict(include_substitutes=True, include_history=True)
    }), 200


# ─── Coordinator: Reject Leave ──────────────────────────────────────────────

@substitutes_bp.route('/coordinator/<int:leave_id>/reject', methods=['POST'])
@jwt_required()
@role_required('coordinator', 'admin')
def coordinator_reject(leave_id):
    """Coordinator rejects a faculty leave request."""
    user = get_current_user()
    leave = db.get_or_404(FacultyLeave, leave_id)
    data = request.get_json() or {}

    remarks = data.get('remarks', '')
    if not remarks:
        remarks = 'Rejected by Department Coordinator.'

    if leave.status not in ('pending_coordinator', 'coordinator_review'):
        return jsonify({'success': False, 'message': 'Leave is not pending coordinator review.',
                       'error': 'INVALID_STATUS'}), 400

    leave.status = 'rejected'
    leave.current_approver = None
    leave.coordinator_remarks = remarks

    # Record history
    from ..models.faculty_leave import FacultyLeaveHistory
    history = FacultyLeaveHistory(
        leave_id=leave.id,
        user_id=user.id,
        role='coordinator',
        action='rejected',
        status_after='rejected',
        remarks=remarks
    )
    db.session.add(history)
    db.session.commit()

    # Notify Faculty ONLY (do NOT send to HOD)
    create_notification(
        leave.faculty_id, 'Leave Rejected by Coordinator',
        f'Your faculty leave request {leave.request_number} has been rejected by the Coordinator: {remarks}',
        'error', 'leave', leave.id
    )

    create_audit_log(user.id, 'coordinator rejected leave', 'leave', leave.id,
                     'pending_coordinator', 'rejected', remarks, request.remote_addr)

    return jsonify({'success': True, 'message': 'Leave rejected by coordinator.', 'data': leave.to_dict(include_history=True)}), 200


# ─── HOD: Approve Faculty Leave ─────────────────────────────────────────────

@substitutes_bp.route('/hod/<int:leave_id>/approve', methods=['POST'])
@jwt_required()
@role_required('hod', 'admin')
def hod_approve_leave(leave_id):
    """HOD gives final approval for faculty leave."""
    user = get_current_user()
    leave = db.get_or_404(FacultyLeave, leave_id)
    data = request.get_json() or {}
    remarks = data.get('remarks', '')

    if leave.status not in ('pending_hod', 'hod_review'):
        return jsonify({'success': False, 'message': 'Leave is not pending HOD review.',
                       'error': 'INVALID_STATUS'}), 400

    leave.status = 'approved'
    leave.current_approver = None
    leave.hod_approved_at = datetime.utcnow()
    leave.hod_remarks = remarks

    # Record history
    from ..models.faculty_leave import FacultyLeaveHistory
    history = FacultyLeaveHistory(
        leave_id=leave.id,
        user_id=user.id,
        role='hod',
        action='approved',
        status_after='approved',
        remarks=remarks or 'Approved by Head of Department'
    )
    db.session.add(history)
    db.session.commit()

    # Notify faculty
    create_notification(
        leave.faculty_id, 'Leave Approved by HOD',
        f'Your faculty leave request {leave.request_number} has been approved by HOD.',
        'success', 'leave', leave.id
    )

    create_audit_log(user.id, 'hod approved leave', 'leave', leave.id,
                     'pending_hod', 'approved', remarks, request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Faculty leave approved by HOD.',
        'data': leave.to_dict(include_substitutes=True, include_history=True)
    }), 200


# ─── HOD: Reject Faculty Leave ──────────────────────────────────────────────

@substitutes_bp.route('/hod/<int:leave_id>/reject', methods=['POST'])
@jwt_required()
@role_required('hod', 'admin')
def hod_reject_leave(leave_id):
    """HOD rejects a faculty leave request."""
    user = get_current_user()
    leave = db.get_or_404(FacultyLeave, leave_id)
    data = request.get_json() or {}

    remarks = data.get('remarks', '')
    if not remarks:
        remarks = 'Rejected by Head of Department.'

    if leave.status not in ('pending_hod', 'hod_review'):
        return jsonify({'success': False, 'message': 'Leave is not pending HOD review.',
                       'error': 'INVALID_STATUS'}), 400

    leave.status = 'rejected'
    leave.current_approver = None
    leave.hod_remarks = remarks

    # Record history
    from ..models.faculty_leave import FacultyLeaveHistory
    history = FacultyLeaveHistory(
        leave_id=leave.id,
        user_id=user.id,
        role='hod',
        action='rejected',
        status_after='rejected',
        remarks=remarks
    )
    db.session.add(history)
    db.session.commit()

    create_notification(
        leave.faculty_id, 'Leave Rejected by HOD',
        f'Your faculty leave request {leave.request_number} has been rejected by HOD: {remarks}',
        'error', 'leave', leave.id
    )

    create_audit_log(user.id, 'hod rejected leave', 'leave', leave.id,
                     'pending_hod', 'rejected', remarks, request.remote_addr)

    return jsonify({'success': True, 'message': 'Leave rejected by HOD.', 'data': leave.to_dict(include_history=True)}), 200


# ─── Coordinator: Pending Leaves ────────────────────────────────────────────

@substitutes_bp.route('/coordinator/pending', methods=['GET'])
@jwt_required()
@role_required('coordinator', 'admin')
def get_coordinator_pending():
    """Get faculty leaves pending coordinator review."""
    user = get_current_user()
    query = FacultyLeave.query.filter(
        FacultyLeave.status.in_(['pending_coordinator', 'coordinator_review'])
    )

    if user.role == 'coordinator':
        if user.department_id:
            query = query.filter(
                (FacultyLeave.coordinator_id == user.id) |
                (FacultyLeave.department_id == user.department_id) |
                (FacultyLeave.coordinator_id.is_(None))
            )
        else:
            query = query.filter(
                (FacultyLeave.coordinator_id == user.id) |
                (FacultyLeave.coordinator_id.is_(None))
            )

    leaves = query.order_by(FacultyLeave.created_at.desc()).all()

    return jsonify({
        'success': True,
        'message': 'Pending leaves retrieved.',
        'data': [l.to_dict(include_substitutes=True, include_history=True) for l in leaves]
    }), 200


# ─── HOD: Pending Leaves ────────────────────────────────────────────────────

@substitutes_bp.route('/hod/pending', methods=['GET'])
@jwt_required()
@role_required('hod', 'admin')
def get_hod_pending_leaves():
    """Get faculty leaves pending HOD approval (only coordinator-approved)."""
    user = get_current_user()
    query = FacultyLeave.query.filter(
        FacultyLeave.status.in_(['pending_hod', 'hod_review'])
    )

    if user.role == 'hod' and user.department_id:
        query = query.filter(
            (FacultyLeave.department_id == user.department_id) |
            (FacultyLeave.department_id.is_(None))
        )

    leaves = query.order_by(FacultyLeave.created_at.desc()).all()

    return jsonify({
        'success': True,
        'message': 'Pending leaves retrieved.',
        'data': [l.to_dict(include_substitutes=True, include_history=True) for l in leaves]
    }), 200
