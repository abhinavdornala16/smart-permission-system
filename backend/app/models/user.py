"""User, Student, Faculty, Department, and Section models."""
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db
from ..utils.time_utils import utcnow


class Department(db.Model):
    """College department."""
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    code = db.Column(db.String(10), unique=True, nullable=False)
    hod_id = db.Column(db.Integer, db.ForeignKey('users.id', use_alter=True, name='fk_department_hod'), nullable=True)
    second_hod_id = db.Column(db.Integer, db.ForeignKey('users.id', use_alter=True, name='fk_department_second_hod'), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    users = db.relationship('User', backref='department_ref', foreign_keys='User.department_id')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'hod_id': self.hod_id,
            'second_hod_id': self.second_hod_id,
            'is_active': self.is_active,
        }


class Section(db.Model):
    """Class section within a department."""
    __tablename__ = 'sections'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(10), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    class_teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    department = db.relationship('Department', backref='sections')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'department_id': self.department_id,
            'year': self.year,
            'class_teacher_id': self.class_teacher_id,
            'is_active': self.is_active,
        }


class User(db.Model):
    """Base user model with role-based access."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(30), nullable=False, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    phone = db.Column(db.String(15), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    student_profile = db.relationship('Student', foreign_keys='Student.user_id', backref='user', uselist=False, cascade='all, delete-orphan')
    faculty_profile = db.relationship('Faculty', foreign_keys='Faculty.user_id', backref='user', uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    # Valid roles
    ROLES = [
        'student', 'mentor', 'class_teacher', 'faculty',
        'coordinator', 'hod', 'second_hod', 'admin'
    ]

    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against hash."""
        return check_password_hash(self.password_hash, password)

    def has_role(self, *roles):
        """Check if user has any of the specified roles."""
        return self.role in roles

    def to_dict(self, include_profile=False):
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'department_id': self.department_id,
            'department': self.department_ref.to_dict() if self.department_ref else None,
            'phone': self.phone,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_profile:
            if self.student_profile:
                data['student'] = self.student_profile.to_dict()
            if self.faculty_profile:
                data['faculty'] = self.faculty_profile.to_dict()
        return data


class Student(db.Model):
    """Student profile linked to a user."""
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    student_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    department = db.Column(db.String(50), nullable=False)
    section = db.Column(db.String(10), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Integer, nullable=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    class_teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    mentor = db.relationship('User', foreign_keys=[mentor_id], backref='mentored_students')
    class_teacher = db.relationship('User', foreign_keys=[class_teacher_id], backref='class_students')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'student_id': self.student_id,
            'department': self.department,
            'section': self.section,
            'year': self.year,
            'semester': self.semester,
            'mentor_id': self.mentor_id,
            'class_teacher_id': self.class_teacher_id,
        }


class Faculty(db.Model):
    """Faculty profile linked to a user."""
    __tablename__ = 'faculty'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    employee_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    department = db.Column(db.String(50), nullable=False)
    designation = db.Column(db.String(50), nullable=True)
    specialization = db.Column(db.String(100), nullable=True)
    is_available = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_id': self.employee_id,
            'department': self.department,
            'designation': self.designation,
            'specialization': self.specialization,
            'is_available': self.is_available,
        }
