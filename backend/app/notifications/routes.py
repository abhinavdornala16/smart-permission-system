"""Notification routes — list, read, mark-read."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.notification import Notification
from ..utils.decorators import get_current_user

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for the current user."""
    user = get_current_user()
    if not user:
        return jsonify({
            'success': False,
            'message': 'Authenticated user not found.',
            'error': 'USER_NOT_FOUND'
        }), 401

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'

    query = Notification.query.filter_by(user_id=user.id)
    if unread_only:
        query = query.filter_by(is_read=False)

    query = query.order_by(Notification.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()

    return jsonify({
        'success': True,
        'message': 'Notifications retrieved.',
        'data': {
            'notifications': [n.to_dict() for n in pagination.items],
            'unread_count': unread_count,
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
        }
    }), 200


@notifications_bp.route('/<int:notif_id>/read', methods=['POST'])
@jwt_required()
def mark_as_read(notif_id):
    """Mark a notification as read."""
    user = get_current_user()
    if not user:
        return jsonify({
            'success': False,
            'message': 'Authenticated user not found.',
            'error': 'USER_NOT_FOUND'
        }), 401

    notif = db.get_or_404(Notification, notif_id)

    if notif.user_id != user.id:
        return jsonify({'success': False, 'message': 'You are not authorized to access this resource.', 'error': 'FORBIDDEN'}), 403

    notif.is_read = True
    db.session.commit()

    return jsonify({'success': True, 'message': 'Notification marked as read.', 'data': notif.to_dict()}), 200


@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_as_read():
    """Mark all notifications as read for the current user."""
    user = get_current_user()
    if not user:
        return jsonify({
            'success': False,
            'message': 'Authenticated user not found.',
            'error': 'USER_NOT_FOUND'
        }), 401

    Notification.query.filter_by(user_id=user.id, is_read=False).update({'is_read': True})
    db.session.commit()

    return jsonify({'success': True, 'message': 'All notifications marked as read.', 'data': None}), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get unread notification count."""
    user = get_current_user()
    if not user:
        return jsonify({
            'success': False,
            'message': 'Authenticated user not found.',
            'error': 'USER_NOT_FOUND'
        }), 401

    count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({'success': True, 'message': 'Count retrieved.', 'data': {'count': count}}), 200
