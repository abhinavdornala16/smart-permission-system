"""Faculty leave request and workflow history models."""
from datetime import datetime
from ..extensions import db


class FacultyLeave(db.Model):
    """Faculty leave/permission request."""
    __tablename__ = 'faculty_leave'

    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    coordinator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    leave_type = db.Column(db.String(30), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    session = db.Column(db.String(20), nullable=True)  # morning, afternoon, full_day, custom
    from_time = db.Column(db.Time, nullable=True)
    to_time = db.Column(db.Time, nullable=True)
    status = db.Column(db.String(30), default='pending_coordinator', index=True)
    current_approver = db.Column(db.String(30), default='coordinator')
    remarks = db.Column(db.Text, nullable=True)
    coordinator_approved_at = db.Column(db.DateTime, nullable=True)
    coordinator_remarks = db.Column(db.Text, nullable=True)
    hod_approved_at = db.Column(db.DateTime, nullable=True)
    hod_remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    LEAVE_TYPES = ['medical', 'personal', 'official_work', 'conference', 'training', 'emergency', 'other']
    SESSIONS = ['morning', 'afternoon', 'full_day', 'custom']
    STATUSES = ['pending_coordinator', 'pending_hod', 'approved', 'rejected', 'cancelled', 'coordinator_review', 'hod_review']

    faculty = db.relationship('User', foreign_keys=[faculty_id], backref='leave_requests')
    coordinator = db.relationship('User', foreign_keys=[coordinator_id], backref='assigned_faculty_leaves')
    department = db.relationship('Department', foreign_keys=[department_id])
    history = db.relationship('FacultyLeaveHistory', backref='leave', lazy='dynamic', cascade='all, delete-orphan', order_by='FacultyLeaveHistory.timestamp.asc()')
    substitute_requests = db.relationship('SubstituteRequest', backref='leave', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_substitutes=False, include_history=True):
        data = {
            'id': self.id,
            'request_number': self.request_number,
            'faculty_id': self.faculty_id,
            'faculty_name': self.faculty.full_name if self.faculty else None,
            'coordinator_id': self.coordinator_id,
            'coordinator_name': self.coordinator.full_name if self.coordinator else None,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else (self.faculty.faculty_profile.department if self.faculty and self.faculty.faculty_profile else None),
            'leave_type': self.leave_type,
            'reason': self.reason,
            'date': self.date.isoformat() if self.date else None,
            'start_date': (self.start_date or self.date).isoformat() if (self.start_date or self.date) else None,
            'end_date': (self.end_date or self.date).isoformat() if (self.end_date or self.date) else None,
            'session': self.session,
            'from_time': self.from_time.strftime('%H:%M') if self.from_time else None,
            'to_time': self.to_time.strftime('%H:%M') if self.to_time else None,
            'status': self.status,
            'current_approver': self.current_approver,
            'remarks': self.remarks,
            'coordinator_approved_at': self.coordinator_approved_at.isoformat() if self.coordinator_approved_at else None,
            'coordinator_remarks': self.coordinator_remarks,
            'hod_approved_at': self.hod_approved_at.isoformat() if self.hod_approved_at else None,
            'hod_remarks': self.hod_remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_history:
            data['history'] = [h.to_dict() for h in self.history.all()]
        if include_substitutes:
            data['substitutes'] = [s.to_dict() for s in self.substitute_requests.all()]
        return data


class FacultyLeaveHistory(db.Model):
    """Tracks each action in the Faculty Leave approval workflow."""
    __tablename__ = 'faculty_leave_history'

    id = db.Column(db.Integer, primary_key=True)
    leave_id = db.Column(db.Integer, db.ForeignKey('faculty_leave.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(30), nullable=False)  # faculty, coordinator, hod
    action = db.Column(db.String(30), nullable=False)  # submitted, approved, rejected
    status_after = db.Column(db.String(30), nullable=False)  # pending_coordinator, pending_hod, approved, rejected
    remarks = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'leave_id': self.leave_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else None,
            'role': self.role,
            'action': self.action,
            'status_after': self.status_after,
            'remarks': self.remarks,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
