"""Faculty timetable and availability models."""
from datetime import datetime
from ..extensions import db


class FacultyTimetable(db.Model):
    """Weekly timetable entry for a faculty member."""
    __tablename__ = 'faculty_timetable'

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    day = db.Column(db.String(10), nullable=False)  # Monday, Tuesday, etc.
    period = db.Column(db.Integer, nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(20), nullable=False)
    room = db.Column(db.String(20), nullable=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    faculty = db.relationship('User', backref='timetable_entries')

    def to_dict(self):
        return {
            'id': self.id,
            'faculty_id': self.faculty_id,
            'faculty_name': self.faculty.full_name if self.faculty else None,
            'day': self.day,
            'period': self.period,
            'subject': self.subject,
            'section': self.section,
            'room': self.room,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'is_active': self.is_active,
        }


class FacultyAvailability(db.Model):
    """Explicit availability overrides for specific dates."""
    __tablename__ = 'faculty_availability'

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    available = db.Column(db.Boolean, default=True)
    remarks = db.Column(db.Text, nullable=True)

    faculty = db.relationship('User', backref='availability_records')

    def to_dict(self):
        return {
            'id': self.id,
            'faculty_id': self.faculty_id,
            'date': self.date.isoformat() if self.date else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'available': self.available,
            'remarks': self.remarks,
        }
