"""Notification model."""
from datetime import datetime
from ..extensions import db
from ..utils.time_utils import utcnow


class Notification(db.Model):
    """In-app notification for users."""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(30), default='info')  # info, success, warning, error
    entity_type = db.Column(db.String(30), nullable=True)  # permission, leave, substitute
    entity_id = db.Column(db.Integer, nullable=True)
    is_read = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
