"""Authentication routes — login, logout, refresh, profile."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from ..models.user import User
from ..utils.decorators import get_current_user
from ..utils.permissions import create_audit_log

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT tokens."""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Request body is required.', 'error': 'BAD_REQUEST'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.', 'error': 'MISSING_FIELDS'}), 400

    # Allow login by username or email
    user = User.query.filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid username or password.', 'error': 'INVALID_CREDENTIALS'}), 401

    if not user.is_active:
        return jsonify({'success': False, 'message': 'Your account has been deactivated. Contact admin.', 'error': 'ACCOUNT_DEACTIVATED'}), 403

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    create_audit_log(user.id, 'login', 'user', user.id, ip_address=request.remote_addr)

    return jsonify({
        'success': True,
        'message': 'Login successful.',
        'data': {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict(include_profile=True),
        }
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Get current authenticated user profile."""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Authenticated user not found.', 'error': 'USER_NOT_FOUND'}), 401

    return jsonify({
        'success': True,
        'message': 'Profile retrieved.',
        'data': user.to_dict(include_profile=True),
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token."""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(user_id))
    return jsonify({
        'success': True,
        'message': 'Token refreshed.',
        'data': {'access_token': access_token}
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Log out current user (client-side token discard)."""
    user = get_current_user()
    if user:
        create_audit_log(user.id, 'logout', 'user', user.id, ip_address=request.remote_addr)
    return jsonify({'success': True, 'message': 'Logged out successfully.', 'data': None}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change the current user's password."""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Authenticated user not found.', 'error': 'USER_NOT_FOUND'}), 401

    data = request.get_json()

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not old_password or not new_password:
        return jsonify({'success': False, 'message': 'Both old and new passwords are required.', 'error': 'MISSING_FIELDS'}), 400

    if not user.check_password(old_password):
        return jsonify({'success': False, 'message': 'Current password is incorrect.', 'error': 'INVALID_PASSWORD'}), 401

    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.', 'error': 'WEAK_PASSWORD'}), 400

    from ..extensions import db
    user.set_password(new_password)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Password changed successfully.', 'data': None}), 200
