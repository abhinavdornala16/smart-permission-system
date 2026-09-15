"""Role-based authorization decorators."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from ..extensions import db
from ..models.user import User


def role_required(*roles):
    """Decorator to restrict access to specific roles.
    
    Usage:
        @role_required('admin', 'hod')
        def admin_only_route():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            try:
                user = db.session.get(User, int(user_id)) if user_id is not None else None
            except (ValueError, TypeError):
                user = None

            if not user:
                return jsonify({
                    'success': False,
                    'message': 'Authenticated user not found.',
                    'error': 'USER_NOT_FOUND'
                }), 401

            if not user.is_active:
                return jsonify({
                    'success': False,
                    'message': 'Account is deactivated.',
                    'error': 'ACCOUNT_DEACTIVATED'
                }), 403

            if user.role not in roles:
                return jsonify({
                    'success': False,
                    'message': 'You are not authorized to access this resource.',
                    'error': 'FORBIDDEN'
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user():
    """Get the current authenticated user object."""
    try:
        user_id = get_jwt_identity()
        if user_id is None:
            return None
        return db.session.get(User, int(user_id))
    except (ValueError, TypeError, Exception):
        return None

