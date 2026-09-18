"""Substitute request model."""
from ..extensions import db
from ..utils.time_utils import utcnow


class SubstituteRequest(db.Model):
    """Request for a substitute faculty member."""
    __tablename__ = 'substitute_requests'

    id = db.Column(db.Integer, primary_key=True)
    leave_id = db.Column(db.Integer, db.ForeignKey('faculty_leave.id'), nullable=False)
    original_faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    substitute_faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timetable_entry_id = db.Column(db.Integer, db.ForeignKey('faculty_timetable.id'), nullable=True)
    subject = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room = db.Column(db.String(20), nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected, cancelled
    response_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    STATUSES = ['pending', 'accepted', 'rejected', 'cancelled']

    original_faculty = db.relationship('User', foreign_keys=[original_faculty_id],
                                       backref='sent_substitute_requests')
    substitute_faculty = db.relationship('User', foreign_keys=[substitute_faculty_id],
                                         backref='received_substitute_requests')
    timetable_entry = db.relationship('FacultyTimetable', backref='substitute_requests')

    def to_dict(self):
        return {
            'id': self.id,
            'leave_id': self.leave_id,
            'original_faculty_id': self.original_faculty_id,
            'original_faculty_name': self.original_faculty.full_name if self.original_faculty else None,
            'substitute_faculty_id': self.substitute_faculty_id,
            'substitute_faculty_name': self.substitute_faculty.full_name if self.substitute_faculty else None,
            'subject': self.subject,
            'section': self.section,
            'date': self.date.isoformat() if self.date else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'room': self.room,
            'status': self.status,
            'response_reason': self.response_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
