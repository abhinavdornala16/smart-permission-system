"""Models package - import all models for SQLAlchemy discovery."""
from .user import User, Student, Faculty, Department, Section
from .permission import PermissionRequest, ApprovalHistory
from .qr_pass import QRPass
from .timetable import FacultyTimetable, FacultyAvailability
from .faculty_leave import FacultyLeave, FacultyLeaveHistory
from .substitute import SubstituteRequest
from .notification import Notification
from .audit_log import AuditLog
from .workflow import WorkflowConfig

__all__ = [
    'User', 'Student', 'Faculty', 'Department', 'Section',
    'PermissionRequest', 'ApprovalHistory',
    'QRPass',
    'FacultyTimetable', 'FacultyAvailability',
    'FacultyLeave', 'FacultyLeaveHistory',
    'SubstituteRequest',
    'Notification',
    'AuditLog',
    'WorkflowConfig',
]
