"""Permission request and approval history models."""
from datetime import datetime
from ..extensions import db


class PermissionRequest(db.Model):
    """Student permission request."""
    __tablename__ = 'permission_requests'

    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    permission_type = db.Column(db.String(30), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    date = db.Column(db.Date, nullable=False)
    from_time = db.Column(db.Time, nullable=False)
    to_time = db.Column(db.Time, nullable=False)
    destination = db.Column(db.String(200), nullable=True)
    contact_number = db.Column(db.String(15), nullable=True)
    document_path = db.Column(db.String(300), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending', index=True)
    current_approver_role = db.Column(db.String(30), nullable=True)
    current_approver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Permission types
    TYPES = [
        'out_pass', 'medical', 'personal', 'club_activity',
        'college_event', 'department_activity', 'other'
    ]

    # Status values
    STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'cancelled', 'expired']

    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], backref='permission_requests')
    current_approver = db.relationship('User', foreign_keys=[current_approver_id])
    approval_history = db.relationship('ApprovalHistory', backref='request', lazy='dynamic',
                                       order_by='ApprovalHistory.timestamp')
    qr_pass = db.relationship('QRPass', backref='request', uselist=False)

    def to_dict(self, include_history=False):
        student_data = None
        mentor_name = None
        class_teacher_name = None
        hod_name = None

        if self.student:
            student_data = self.student.to_dict(include_profile=True)
            sp = self.student.student_profile
            if sp:
                if sp.mentor and sp.mentor.full_name:
                    mentor_name = sp.mentor.full_name
                if sp.class_teacher and sp.class_teacher.full_name:
                    class_teacher_name = sp.class_teacher.full_name
                dept = self.student.department_ref
                if dept and dept.hod_id:
                    from .user import User as _User
                    hod_user = _User.query.get(dept.hod_id)
                    if hod_user:
                        hod_name = hod_user.full_name

        data = {
            'id': self.id,
            'request_number': self.request_number,
            'student_id': self.student_id,
            'student': student_data,
            'permission_type': self.permission_type,
            'reason': self.reason,
            'date': self.date.isoformat() if self.date else None,
            'from_time': self.from_time.strftime('%H:%M') if self.from_time else None,
            'to_time': self.to_time.strftime('%H:%M') if self.to_time else None,
            'destination': self.destination,
            'contact_number': self.contact_number,
            'document_path': self.document_path,
            'remarks': self.remarks,
            'status': self.status,
            'current_approver_role': self.current_approver_role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'mentor_name': mentor_name,
            'class_teacher_name': class_teacher_name,
            'hod_name': hod_name,
        }
        if include_history:
            data['approval_timeline'] = [h.to_dict() for h in self.approval_history.all()]
        if self.qr_pass:
            data['qr_pass'] = self.qr_pass.to_dict()
        return data


class ApprovalHistory(db.Model):
    """Tracks each approval/rejection step in the workflow."""
    __tablename__ = 'approval_history'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('permission_requests.id'), nullable=False)
    approver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approver_role = db.Column(db.String(30), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # approved, rejected
    remarks = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    approver = db.relationship('User', foreign_keys=[approver_id])

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'approver_id': self.approver_id,
            'approver_name': self.approver.full_name if self.approver else None,
            'approver_role': self.approver_role,
            'action': self.action,
            'remarks': self.remarks,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
