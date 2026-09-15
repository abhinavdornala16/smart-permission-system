"""Audit log model for accountability tracking."""
from datetime import datetime
from ..extensions import db


class AuditLog(db.Model):
    """Audit trail for all significant actions."""
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(30), nullable=False)  # permission, leave, substitute, user
    entity_id = db.Column(db.Integer, nullable=True)
    old_status = db.Column(db.String(20), nullable=True)
    new_status = db.Column(db.String(20), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref='audit_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else None,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'remarks': self.remarks,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
