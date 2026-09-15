"""Flask application factory."""
import os
from flask import Flask, jsonify
from .config import config_map
from .extensions import db, jwt, cors


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_map.get(config_name, config_map['development']))

    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.instance_path, exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'Token has expired. Please log in again.',
            'error': 'TOKEN_EXPIRED'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'success': False,
            'message': 'Invalid token.',
            'error': 'INVALID_TOKEN'
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'success': False,
            'message': 'Please log in to continue.',
            'error': 'MISSING_TOKEN'
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'Token has been revoked.',
            'error': 'TOKEN_REVOKED'
        }), 401

    # Register blueprints
    from .auth.routes import auth_bp
    from .permissions.routes import permissions_bp
    from .faculty.routes import faculty_bp
    from .substitutes.routes import substitutes_bp
    from .admin.routes import admin_bp
    from .notifications.routes import notifications_bp
    from .reports.routes import reports_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(permissions_bp, url_prefix='/api/permissions')
    app.register_blueprint(faculty_bp, url_prefix='/api/faculty')
    app.register_blueprint(substitutes_bp, url_prefix='/api/substitutes')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    # Global error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': 'Resource not found.',
            'error': 'NOT_FOUND'
        }), 404

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'message': 'You do not have permission to access this resource.',
            'error': 'FORBIDDEN'
        }), 403

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Something went wrong. Please try again.',
            'error': 'INTERNAL_ERROR'
        }), 500

    @app.errorhandler(413)
    def too_large(error):
        return jsonify({
            'success': False,
            'message': 'File too large. Maximum size is 5MB.',
            'error': 'FILE_TOO_LARGE'
        }), 413

    # Health check endpoints
    @app.route('/health')
    @app.route('/api/health')
    def health_check():
        """Public health check endpoint with safe database connectivity verification."""
        from sqlalchemy import text
        db_status = 'ok'
        try:
            db.session.execute(text('SELECT 1'))
        except Exception as err:
            app.logger.error(f"Database health check error: {err}")
            db_status = 'unavailable'

        is_healthy = (db_status == 'ok')
        return jsonify({
            'status': 'ok' if is_healthy else 'degraded',
            'database': db_status,
            'service': 'Dhondi Smart Permission API',
            'version': '1.0.0'
        }), 200 if is_healthy else 503

    return app

