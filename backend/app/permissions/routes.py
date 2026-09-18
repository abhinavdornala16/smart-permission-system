"""Student permission routes — CRUD, approval workflow, QR pass, timeline."""
import uuid
from datetime import datetime, date, time
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.user import User, Student
from ..models.permission import PermissionRequest, ApprovalHistory
from ..models.qr_pass import QRPass
from ..models.workflow import WorkflowConfig
from ..utils.decorators import role_required, get_current_user
from ..utils.time_utils import utcnow
from ..utils.permissions import (
    get_first_approver_role, get_current_step_number,
    get_next_step, is_final_step, create_audit_log
)
from ..utils.notifications import create_notification, notify_approval_chain
from ..utils.qr import generate_qr_pass

permissions_bp = Blueprint('permissions', __name__)


# ─── Student: Create Permission Request ─────────────────────────────────────

@permissions_bp.route('', methods=['POST'])
@jwt_required()
@role_required('student')
def create_permission():
    """Student submits a new permission request."""
    user = get_current_user()
    data = request.get_json()

    # Validate required fields
    required = ['permission_type', 'reason', 'date', 'from_time', 'to_time']
    for field in required:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'{field} is required.', 'error': 'MISSING_FIELD'}), 400

    ptype = data['permission_type']
    if ptype not in PermissionRequest.TYPES:
        return jsonify({'success': False, 'message': f'Invalid permission type: {ptype}', 'error': 'INVALID_TYPE'}), 400

    # Parse date and times
    try:
        pdate = date.fromisoformat(data['date'])
        from_time = time.fromisoformat(data['from_time'])
        to_time = time.fromisoformat(data['to_time'])
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date or time format.', 'error': 'INVALID_FORMAT'}), 400

    if to_time <= from_time:
        return jsonify({'success': False, 'message': 'End time must be after start time.', 'error': 'INVALID_TIME'}), 400

    if pdate < date.today():
        return jsonify({'success': False, 'message': 'Date cannot be in the past.', 'error': 'INVALID_DATE'}), 400

    # Check for overlapping active requests
    overlap = PermissionRequest.query.filter(
        PermissionRequest.student_id == user.id,
        PermissionRequest.date == pdate,
        PermissionRequest.status.in_(['pending', 'under_review', 'approved']),
        PermissionRequest.from_time < to_time,
        PermissionRequest.to_time > from_time,
    ).first()
    if overlap:
        return jsonify({'success': False, 'message': 'You have an overlapping active request.', 'error': 'OVERLAP'}), 409

    # Generate unique request number
    req_number = f"PER-{uuid.uuid4().hex[:6].upper()}"

    # Determine first approver from workflow config
    first_role = get_first_approver_role(ptype)

    # Find the specific approver user for this student
    first_approver_id = _find_approver_for_student(user, first_role)

    perm = PermissionRequest(
        request_number=req_number,
        student_id=user.id,
        permission_type=ptype,
        reason=data['reason'],
        date=pdate,
        from_time=from_time,
        to_time=to_time,
        destination=data.get('destination', ''),
        contact_number=data.get('contact_number', ''),
        remarks=data.get('remarks', ''),
        status='pending',
        current_approver_role=first_role,
        current_approver_id=first_approver_id,
    )
    db.session.add(perm)
    db.session.commit()

    # Notify student
    create_notification(user.id, 'Permission Submitted',
                       f'Your {ptype} permission request {req_number} has been submitted.',
                       'info', 'permission', perm.id)

    # Notify first approver
    if first_approver_id:
        create_notification(first_approver_id, 'Approval Required',
                           f'New {ptype} permission request {req_number} from {user.full_name} requires your approval.',
                           'warning', 'permission', perm.id)

    create_audit_log(user.id, 'created_permission', 'permission', perm.id,
                     new_status='pending', ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Permission request submitted successfully.',
        'data': perm.to_dict()
    }), 201


# ─── Student: Get My Requests ───────────────────────────────────────────────

@permissions_bp.route('/my-requests', methods=['GET'])
@jwt_required()
@role_required('student')
def get_my_requests():
    """Get all permission requests for the current student."""
    user = get_current_user()
    status_filter = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = PermissionRequest.query.filter_by(student_id=user.id)
    if status_filter:
        query = query.filter_by(status=status_filter)

    query = query.order_by(PermissionRequest.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'message': 'Requests retrieved.',
        'data': {
            'requests': [r.to_dict() for r in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
        }
    }), 200


# ─── Get Single Request with Timeline ───────────────────────────────────────

@permissions_bp.route('/<int:request_id>', methods=['GET'])
@jwt_required()
def get_request_detail(request_id):
    """Get permission request details with approval timeline."""
    perm = db.get_or_404(PermissionRequest, request_id)
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Authenticated user not found.', 'error': 'USER_NOT_FOUND'}), 401

    # Students can only see their own requests; approvers can see requests assigned to them
    if user.role == 'student' and perm.student_id != user.id:
        return jsonify({'success': False, 'message': 'You are not authorized to access this resource.', 'error': 'FORBIDDEN'}), 403

    return jsonify({
        'success': True,
        'message': 'Request details retrieved.',
        'data': perm.to_dict(include_history=True)
    }), 200


# ─── Get Approval Timeline ─────────────────────────────────────────────────

@permissions_bp.route('/<int:request_id>/timeline', methods=['GET'])
@jwt_required()
def get_timeline(request_id):
    """Get the approval timeline for a specific request."""
    perm = db.get_or_404(PermissionRequest, request_id)
    history = ApprovalHistory.query.filter_by(request_id=request_id).order_by(ApprovalHistory.timestamp).all()

    # Build full timeline including submission
    timeline = [{
        'step': 'Submitted',
        'actor': perm.student.full_name if perm.student else 'Student',
        'action': 'submitted',
        'timestamp': perm.created_at.isoformat() if perm.created_at else None,
        'remarks': None,
    }]
    for h in history:
        timeline.append({
            'step': f'{h.approver_role.replace("_", " ").title()}',
            'actor': h.approver.full_name if h.approver else '',
            'action': h.action,
            'timestamp': h.timestamp.isoformat() if h.timestamp else None,
            'remarks': h.remarks,
        })

    if perm.status == 'approved' and perm.qr_pass:
        timeline.append({
            'step': 'QR Pass Generated',
            'actor': 'System',
            'action': 'qr_generated',
            'timestamp': perm.qr_pass.generated_at.isoformat() if perm.qr_pass.generated_at else None,
            'remarks': f'Pass: {perm.qr_pass.pass_number}',
        })

    return jsonify({
        'success': True,
        'message': 'Timeline retrieved.',
        'data': timeline
    }), 200


# ─── Approver: Get Pending Requests ─────────────────────────────────────────

@permissions_bp.route('/pending', methods=['GET'])
@jwt_required()
@role_required('mentor', 'class_teacher', 'hod', 'coordinator', 'admin')
def get_pending_requests():
    """Get pending permission requests for the current approver."""
    user = get_current_user()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    ptype = request.args.get('type')

    query = PermissionRequest.query.filter(
        PermissionRequest.status.in_(['pending', 'under_review']),
        PermissionRequest.current_approver_role == user.role
    )

    # For mentor/class_teacher, only show students assigned to them
    if user.role in ('mentor', 'class_teacher'):
        query = query.filter(PermissionRequest.current_approver_id == user.id)

    # HOD sees all in their department
    if user.role == 'hod' and user.department_id:
        student_ids = [s.user_id for s in Student.query.filter_by(
            department=user.department_ref.name if user.department_ref else ''
        ).all()]
        query = query.filter(PermissionRequest.student_id.in_(student_ids))

    if ptype:
        query = query.filter_by(permission_type=ptype)

    query = query.order_by(PermissionRequest.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'message': 'Pending requests retrieved.',
        'data': {
            'requests': [r.to_dict() for r in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
        }
    }), 200


# ─── Approver: Approve Request ──────────────────────────────────────────────

@permissions_bp.route('/<int:request_id>/approve', methods=['POST'])
@jwt_required()
@role_required('mentor', 'class_teacher', 'hod', 'second_hod', 'coordinator', 'admin')
def approve_request(request_id):
    """Approve a permission request and advance to the next workflow step."""
    user = get_current_user()
    perm = db.get_or_404(PermissionRequest, request_id)
    data = request.get_json() or {}

    if perm.status not in ('pending', 'under_review'):
        return jsonify({'success': False, 'message': 'Request is not pending.', 'error': 'INVALID_STATUS'}), 400

    if perm.current_approver_role != user.role:
        return jsonify({'success': False, 'message': 'You are not the current approver.', 'error': 'NOT_APPROVER'}), 403

    # Record approval in history
    history = ApprovalHistory(
        request_id=perm.id,
        approver_id=user.id,
        approver_role=user.role,
        action='approved',
        remarks=data.get('remarks', ''),
    )
    db.session.add(history)

    old_status = perm.status
    current_step = get_current_step_number(perm.permission_type, user.role)

    if is_final_step(perm.permission_type, user.role):
        # Final approval — generate QR pass
        perm.status = 'approved'
        perm.current_approver_role = None
        perm.current_approver_id = None
        db.session.commit()

        # Generate QR pass
        verification_url = current_app.config.get('QR_VERIFICATION_BASE_URL', 'http://localhost:5173/verify-pass')
        generate_qr_pass(perm, verification_url)

        notify_approval_chain(perm, 'approved', user.full_name)
    else:
        # Move to next step
        next_step = get_next_step(perm.permission_type, current_step)
        perm.status = 'under_review'
        perm.current_approver_role = next_step.approver_role

        # Find the specific next approver
        next_approver_id = _find_approver_for_student(perm.student, next_step.approver_role)
        perm.current_approver_id = next_approver_id
        db.session.commit()

        notify_approval_chain(perm, 'approved', user.full_name, next_approver_id)

    create_audit_log(user.id, f'{user.role} approved permission', 'permission',
                     perm.id, old_status=old_status, new_status=perm.status,
                     remarks=data.get('remarks'), ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Permission approved successfully.',
        'data': perm.to_dict(include_history=True)
    }), 200


# ─── Approver: Reject Request ───────────────────────────────────────────────

@permissions_bp.route('/<int:request_id>/reject', methods=['POST'])
@jwt_required()
@role_required('mentor', 'class_teacher', 'hod', 'second_hod', 'coordinator', 'admin')
def reject_request(request_id):
    """Reject a permission request."""
    user = get_current_user()
    perm = db.get_or_404(PermissionRequest, request_id)
    data = request.get_json() or {}

    if perm.status not in ('pending', 'under_review'):
        return jsonify({'success': False, 'message': 'Request is not pending.', 'error': 'INVALID_STATUS'}), 400

    if perm.current_approver_role != user.role:
        return jsonify({'success': False, 'message': 'You are not the current approver.', 'error': 'NOT_APPROVER'}), 403

    remarks = data.get('remarks', '')
    if not remarks:
        return jsonify({'success': False, 'message': 'Rejection reason is required.', 'error': 'MISSING_REMARKS'}), 400

    old_status = perm.status
    perm.status = 'rejected'
    perm.current_approver_role = None
    perm.current_approver_id = None

    history = ApprovalHistory(
        request_id=perm.id,
        approver_id=user.id,
        approver_role=user.role,
        action='rejected',
        remarks=remarks,
    )
    db.session.add(history)
    db.session.commit()

    notify_approval_chain(perm, 'rejected', user.full_name)
    create_audit_log(user.id, f'{user.role} rejected permission', 'permission',
                     perm.id, old_status=old_status, new_status='rejected',
                     remarks=remarks, ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Permission rejected.',
        'data': perm.to_dict(include_history=True)
    }), 200


# ─── Student: Cancel Request ────────────────────────────────────────────────

@permissions_bp.route('/<int:request_id>/cancel', methods=['POST'])
@jwt_required()
@role_required('student')
def cancel_request(request_id):
    """Student cancels their own pending permission request."""
    user = get_current_user()
    perm = db.get_or_404(PermissionRequest, request_id)

    if perm.student_id != user.id:
        return jsonify({'success': False, 'message': 'Access denied.', 'error': 'FORBIDDEN'}), 403

    # Only allow cancellation while the request is still in initial pending state
    # (before any approver has acted on it). Once under_review, the request is
    # locked to the approval flow.
    if perm.status != 'pending':
        return jsonify({'success': False, 'message': 'Only pending requests can be cancelled.', 'error': 'INVALID_STATUS'}), 400

    old_status = perm.status
    perm.status = 'cancelled'
    perm.current_approver_role = None
    perm.current_approver_id = None
    db.session.commit()

    create_audit_log(user.id, 'cancelled permission', 'permission', perm.id,
                     old_status, 'cancelled', ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Permission request cancelled.',
        'data': perm.to_dict()
    }), 200


# ─── QR Pass: Get Pass ──────────────────────────────────────────────────────

@permissions_bp.route('/qr/<string:pass_number>', methods=['GET'])
@jwt_required()
def get_qr_pass(pass_number):
    """Get QR pass details for a student."""
    qr = QRPass.query.filter_by(pass_number=pass_number).first_or_404()
    return jsonify({
        'success': True,
        'message': 'QR pass retrieved.',
        'data': qr.to_dict()
    }), 200


# ─── QR Pass: Public Verification ───────────────────────────────────────────

@permissions_bp.route('/verify/<string:pass_number>', methods=['GET'])
def verify_pass(pass_number):
    """Public endpoint to verify a QR pass — no authentication required."""
    qr = QRPass.query.filter_by(pass_number=pass_number).first()
    if not qr:
        return jsonify({
            'success': False,
            'message': 'Pass not found.',
            'data': {'status': 'INVALID', 'valid': False}
        }), 404

    perm = qr.request
    now = utcnow()

    if qr.status == 'revoked' or (perm and perm.status == 'rejected'):
        verification_status = 'INVALID'
        valid = False
    elif now > qr.expires_at:
        verification_status = 'EXPIRED'
        valid = False
        if qr.status != 'expired':
            qr.status = 'expired'
            db.session.commit()
    else:
        verification_status = 'VALID'
        valid = True

    return jsonify({
        'success': True,
        'message': f'Pass is {verification_status}.',
        'data': {
            'status': verification_status,
            'valid': valid,
            'pass_number': qr.pass_number,
            'student_name': perm.student.full_name if perm and perm.student else '',
            'student_id': perm.student.student_profile.student_id if perm and perm.student and perm.student.student_profile else '',
            'permission_type': perm.permission_type if perm else '',
            'date': perm.date.isoformat() if perm and perm.date else '',
            'from_time': perm.from_time.strftime('%H:%M') if perm and perm.from_time else '',
            'to_time': perm.to_time.strftime('%H:%M') if perm and perm.to_time else '',
            'expires_at': qr.expires_at.isoformat() if qr.expires_at else '',
        }
    }), 200


# ─── Student: Get My QR Passes ──────────────────────────────────────────────

@permissions_bp.route('/my-passes', methods=['GET'])
@jwt_required()
@role_required('student')
def get_my_passes():
    """Get all QR passes for the current student."""
    user = get_current_user()
    passes = QRPass.query.join(PermissionRequest).filter(
        PermissionRequest.student_id == user.id
    ).order_by(QRPass.generated_at.desc()).all()

    return jsonify({
        'success': True,
        'message': 'Passes retrieved.',
        'data': [p.to_dict() for p in passes]
    }), 200


# ─── Approver: Get Approval History ─────────────────────────────────────────

@permissions_bp.route('/history', methods=['GET'])
@jwt_required()
@role_required('mentor', 'class_teacher', 'hod', 'coordinator', 'admin')
def get_approval_history():
    """Get approval history for the current approver."""
    user = get_current_user()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = ApprovalHistory.query.filter_by(approver_id=user.id)
    query = query.order_by(ApprovalHistory.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'message': 'Approval history retrieved.',
        'data': {
            'history': [h.to_dict() for h in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
        }
    }), 200


# ─── Helper: Find Approver for Student ──────────────────────────────────────

def _find_approver_for_student(student_user, approver_role):
    """Find the specific approver user for a student based on role.
    
    For mentor/class_teacher, uses the student's assigned mentor/CT.
    For hod, finds the HOD of the student's department.
    """
    student = student_user.student_profile if student_user else None

    if approver_role == 'mentor' and student and student.mentor_id:
        return student.mentor_id
    elif approver_role == 'class_teacher' and student and student.class_teacher_id:
        return student.class_teacher_id
    elif approver_role in ('hod', 'second_hod'):
        # Find HOD or Second HOD for the student's department
        from ..models.user import Department
        if student:
            dept = Department.query.filter_by(name=student.department).first()
            if dept:
                if approver_role == 'second_hod' and dept.second_hod_id:
                    return dept.second_hod_id
                elif dept.hod_id:
                    return dept.hod_id
        # Fallback: find any HOD or second HOD
        hod = User.query.filter(User.role.in_(['hod', 'second_hod']), User.is_active==True).first()
        return hod.id if hod else None
    elif approver_role == 'coordinator':
        coord = User.query.filter_by(role='coordinator', is_active=True).first()
        return coord.id if coord else None

    # Fallback: find any user with the required role
    approver = User.query.filter_by(role=approver_role, is_active=True).first()
    return approver.id if approver else None
