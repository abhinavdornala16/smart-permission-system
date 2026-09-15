"""Reports and analytics routes."""
from datetime import datetime, timedelta, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from ..extensions import db
from ..models.permission import PermissionRequest
from ..models.faculty_leave import FacultyLeave
from ..models.substitute import SubstituteRequest
from ..models.user import User
from ..utils.decorators import role_required, get_current_user

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/permissions', methods=['GET'])
@jwt_required()
@role_required('admin', 'hod', 'coordinator')
def permission_reports():
    """Get permission statistics and analytics."""
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)

    # Total counts
    total = PermissionRequest.query.filter(PermissionRequest.created_at >= datetime.combine(start_date, datetime.min.time())).count()
    approved = PermissionRequest.query.filter(
        PermissionRequest.created_at >= datetime.combine(start_date, datetime.min.time()),
        PermissionRequest.status == 'approved'
    ).count()
    rejected = PermissionRequest.query.filter(
        PermissionRequest.created_at >= datetime.combine(start_date, datetime.min.time()),
        PermissionRequest.status == 'rejected'
    ).count()
    pending = PermissionRequest.query.filter(
        PermissionRequest.created_at >= datetime.combine(start_date, datetime.min.time()),
        PermissionRequest.status.in_(['pending', 'under_review'])
    ).count()

    # By type
    by_type = db.session.query(
        PermissionRequest.permission_type,
        func.count(PermissionRequest.id)
    ).filter(
        PermissionRequest.created_at >= datetime.combine(start_date, datetime.min.time())
    ).group_by(PermissionRequest.permission_type).all()

    # By status
    by_status = db.session.query(
        PermissionRequest.status,
        func.count(PermissionRequest.id)
    ).filter(
        PermissionRequest.created_at >= datetime.combine(start_date, datetime.min.time())
    ).group_by(PermissionRequest.status).all()

    # Daily trend
    daily = db.session.query(
        func.date(PermissionRequest.created_at),
        func.count(PermissionRequest.id)
    ).filter(
        PermissionRequest.created_at >= datetime.combine(start_date, datetime.min.time())
    ).group_by(func.date(PermissionRequest.created_at)).all()

    return jsonify({
        'success': True,
        'message': 'Permission reports retrieved.',
        'data': {
            'summary': {
                'total': total,
                'approved': approved,
                'rejected': rejected,
                'pending': pending,
                'approval_rate': round((approved / total * 100) if total > 0 else 0, 1),
            },
            'by_type': [{'type': t, 'count': c} for t, c in by_type],
            'by_status': [{'status': s, 'count': c} for s, c in by_status],
            'daily_trend': [{'date': str(d), 'count': c} for d, c in daily],
        }
    }), 200


@reports_bp.route('/faculty-leaves', methods=['GET'])
@jwt_required()
@role_required('admin', 'hod', 'coordinator')
def faculty_leave_reports():
    """Get faculty leave statistics."""
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)

    total = FacultyLeave.query.filter(FacultyLeave.created_at >= datetime.combine(start_date, datetime.min.time())).count()
    approved = FacultyLeave.query.filter(
        FacultyLeave.created_at >= datetime.combine(start_date, datetime.min.time()),
        FacultyLeave.status == 'approved'
    ).count()
    rejected = FacultyLeave.query.filter(
        FacultyLeave.created_at >= datetime.combine(start_date, datetime.min.time()),
        FacultyLeave.status == 'rejected'
    ).count()

    # By type
    by_type = db.session.query(
        FacultyLeave.leave_type,
        func.count(FacultyLeave.id)
    ).filter(
        FacultyLeave.created_at >= datetime.combine(start_date, datetime.min.time())
    ).group_by(FacultyLeave.leave_type).all()

    # Substitution stats
    total_subs = SubstituteRequest.query.filter(
        SubstituteRequest.created_at >= datetime.combine(start_date, datetime.min.time())
    ).count()
    accepted_subs = SubstituteRequest.query.filter(
        SubstituteRequest.created_at >= datetime.combine(start_date, datetime.min.time()),
        SubstituteRequest.status == 'accepted'
    ).count()
    rejected_subs = SubstituteRequest.query.filter(
        SubstituteRequest.created_at >= datetime.combine(start_date, datetime.min.time()),
        SubstituteRequest.status == 'rejected'
    ).count()

    return jsonify({
        'success': True,
        'message': 'Faculty leave reports retrieved.',
        'data': {
            'summary': {
                'total_leaves': total,
                'approved': approved,
                'rejected': rejected,
                'total_substitutions': total_subs,
                'substitution_acceptance_rate': round((accepted_subs / total_subs * 100) if total_subs > 0 else 0, 1),
            },
            'by_type': [{'type': t, 'count': c} for t, c in by_type],
            'substitutions': {
                'total': total_subs,
                'accepted': accepted_subs,
                'rejected': rejected_subs,
            }
        }
    }), 200


@reports_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required('admin', 'hod', 'coordinator')
def dashboard_stats():
    """Combined dashboard statistics for admin/HOD."""
    user = get_current_user()

    stats = {
        'permissions': {
            'pending': PermissionRequest.query.filter(PermissionRequest.status.in_(['pending', 'under_review'])).count(),
            'approved_today': PermissionRequest.query.filter(
                PermissionRequest.status == 'approved',
                func.date(PermissionRequest.updated_at) == date.today()
            ).count(),
            'total_this_month': PermissionRequest.query.filter(
                func.extract('month', PermissionRequest.created_at) == date.today().month,
                func.extract('year', PermissionRequest.created_at) == date.today().year,
            ).count(),
        },
        'faculty_leaves': {
            'pending': FacultyLeave.query.filter(
                FacultyLeave.status.in_(['pending', 'substitute_pending', 'coordinator_review', 'hod_review'])
            ).count(),
            'approved_this_month': FacultyLeave.query.filter(
                FacultyLeave.status == 'approved',
                func.extract('month', FacultyLeave.created_at) == date.today().month,
            ).count(),
        },
        'substitutions': {
            'pending': SubstituteRequest.query.filter_by(status='pending').count(),
            'today': SubstituteRequest.query.filter(
                SubstituteRequest.date == date.today(),
                SubstituteRequest.status == 'accepted'
            ).count(),
        },
        'users': {
            'total': User.query.filter_by(is_active=True).count(),
            'students': User.query.filter_by(role='student', is_active=True).count(),
            'faculty': User.query.filter(
                User.role.in_(['faculty', 'mentor', 'class_teacher', 'coordinator', 'hod']),
                User.is_active == True
            ).count(),
        }
    }

    return jsonify({
        'success': True,
        'message': 'Dashboard stats retrieved.',
        'data': stats
    }), 200
