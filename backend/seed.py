"""Seed script — creates realistic Indian college demo data.

Demo Dataset:
- Exactly 10 Students (rahul.sharma, priya.reddy, arun.kumar, sneha.rao, vivek.reddy, ananya.nair, karthik.rao, meghana.reddy, aditya.sharma, pooja.kumar)
- Exactly 6 Faculty (arjun.mehta, neha.sharma, suresh.kumar, anjali.rao, ravi.reddy, kiran.nair)
- Exactly 1 Mentor (lakshmi.devi)
- Exactly 1 Class Teacher (mahesh.rao)
- Exactly 1 Department Coordinator (divya.sharma)
- Exactly 1 HOD (ravi.kumar)
- Exactly 1 Admin (admin)
Total: Exactly 21 Demo Users.
"""
import sys
import os
from datetime import date, time, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.user import User, Student, Faculty, Department, Section
from app.models.timetable import FacultyTimetable, FacultyAvailability
from app.models.workflow import WorkflowConfig
from app.models.permission import PermissionRequest, ApprovalHistory
from app.models.qr_pass import QRPass
from app.models.notification import Notification
from app.models.faculty_leave import FacultyLeave, FacultyLeaveHistory
from app.models.substitute import SubstituteRequest
from app.utils.qr import generate_qr_pass


def _sync_sqlite_columns():
    """Ensure newly added columns exist in sqlite tables (no-op on other engines)."""
    from sqlalchemy import text
    if not db.engine.url.drivername.startswith('sqlite'):
        return
    try:
        cols = [c[1] for c in db.session.execute(text("PRAGMA table_info(faculty_leave)")).fetchall()]
        new_cols = {
            'coordinator_id': 'INTEGER',
            'department_id': 'INTEGER',
            'start_date': 'DATE',
            'end_date': 'DATE',
            'coordinator_approved_at': 'DATETIME',
            'coordinator_remarks': 'TEXT',
            'hod_approved_at': 'DATETIME',
            'hod_remarks': 'TEXT',
        }
        for col_name, col_type in new_cols.items():
            if col_name not in cols:
                db.session.execute(text(f"ALTER TABLE faculty_leave ADD COLUMN {col_name} {col_type}"))
        db.session.commit()
    except Exception as e:
        db.session.rollback()


def seed(app=None):
    """Run the seed script."""
    if app is None:
        from flask import has_app_context
        if has_app_context():
            db.create_all()
            _sync_sqlite_columns()
            _run_seed()
            return
        app = create_app()

    with app.app_context():
        db.create_all()
        _sync_sqlite_columns()
        _run_seed()


def _get_or_create_user(username, email, password, full_name, role, department_id=None, phone=None):
    """Find existing user by username or email, or create new. Updates password and info safely."""
    user = User.query.filter((User.username == username) | (User.email == email)).first()
    if not user:
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            role=role,
            department_id=department_id,
            phone=phone or '9876543210',
            is_active=True
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()
    else:
        user.username = username
        user.email = email
        user.full_name = full_name
        user.role = role
        user.department_id = department_id
        if phone:
            user.phone = phone
        user.is_active = True
        user.set_password(password)
        db.session.flush()
    return user


def _get_or_create_faculty(user_id, employee_id, department, designation, specialization):
    """Safely get or create/update faculty profile."""
    fp = Faculty.query.filter_by(user_id=user_id).first()
    if not fp:
        fp = Faculty.query.filter_by(employee_id=employee_id).first()
        if fp:
            fp.user_id = user_id
    if not fp:
        fp = Faculty(
            user_id=user_id,
            employee_id=employee_id,
            department=department,
            designation=designation,
            specialization=specialization,
            is_available=True
        )
        db.session.add(fp)
    else:
        fp.employee_id = employee_id
        fp.department = department
        fp.designation = designation
        fp.specialization = specialization
        fp.is_available = True
    db.session.flush()
    return fp


def _get_or_create_student(user_id, student_id, department, section, year, semester, mentor_id, class_teacher_id):
    """Safely get or create/update student profile."""
    sp = Student.query.filter_by(user_id=user_id).first()
    if not sp:
        sp = Student.query.filter_by(student_id=student_id).first()
        if sp:
            sp.user_id = user_id
    if not sp:
        sp = Student(
            user_id=user_id,
            student_id=student_id,
            department=department,
            section=section,
            year=year,
            semester=semester,
            mentor_id=mentor_id,
            class_teacher_id=class_teacher_id
        )
        db.session.add(sp)
    else:
        sp.student_id = student_id
        sp.department = department
        sp.section = section
        sp.year = year
        sp.semester = semester
        sp.mentor_id = mentor_id
        sp.class_teacher_id = class_teacher_id
    db.session.flush()
    return sp


from app.models.audit_log import AuditLog

def _run_seed():
    """Execute idempotent seeding."""
    print("[+] Starting database seeding with realistic demo accounts...")

    # Delete old timetable, logs and requests for clean demo state
    AuditLog.query.delete()
    FacultyTimetable.query.delete()
    FacultyAvailability.query.delete()
    SubstituteRequest.query.delete()
    FacultyLeave.query.delete()
    QRPass.query.delete()
    ApprovalHistory.query.delete()
    PermissionRequest.query.delete()
    Notification.query.delete()
    db.session.commit()

    # Clean legacy generic demo usernames if present
    legacy_usernames = [
        'student1', 'student2', 'mentor1', 'ct1', 'coord1', 'hod_cse',
        'faculty1', 'faculty2', 'faculty3'
    ]
    legacy_users = User.query.filter(User.username.in_(legacy_usernames)).all()
    for lu in legacy_users:
        db.session.delete(lu)
    db.session.commit()

    # ─── 1. Workflow Configurations ─────────────────────────────────
    print("[+] Configuring approval workflows...")
    workflow_steps = [
        ('out_pass', 1, 'mentor'),
        ('out_pass', 2, 'class_teacher'),
        ('out_pass', 3, 'hod'),
        ('medical', 1, 'mentor'),
        ('medical', 2, 'hod'),
        ('personal', 1, 'mentor'),
        ('personal', 2, 'class_teacher'),
        ('personal', 3, 'hod'),
        ('club_activity', 1, 'coordinator'),
        ('club_activity', 2, 'hod'),
        ('college_event', 1, 'coordinator'),
        ('college_event', 2, 'hod'),
        ('department_activity', 1, 'class_teacher'),
        ('department_activity', 2, 'hod'),
        ('other', 1, 'mentor'),
        ('other', 2, 'class_teacher'),
        ('other', 3, 'hod'),
    ]

    for req_type, step, role in workflow_steps:
        wf = WorkflowConfig.query.filter_by(request_type=req_type, step_number=step).first()
        if not wf:
            wf = WorkflowConfig(request_type=req_type, step_number=step, approver_role=role, is_active=True)
            db.session.add(wf)
        else:
            wf.approver_role = role
            wf.is_active = True
    db.session.commit()

    # ─── 2. Department ──────────────────────────────────────────────
    print("[+] Setting up departments...")
    cse_dept = Department.query.filter_by(code='CSE').first()
    if not cse_dept:
        cse_dept = Department(name='Computer Science and Engineering', code='CSE')
        db.session.add(cse_dept)
        db.session.flush()

    ece_dept = Department.query.filter_by(code='ECE').first()
    if not ece_dept:
        ece_dept = Department(name='Electronics and Communication Engineering', code='ECE')
        db.session.add(ece_dept)
        db.session.flush()
    db.session.commit()

    # ─── 3. Admin Account ───────────────────────────────────────────
    admin_user = _get_or_create_user(
        username='admin',
        email='admin@college.edu',
        password='admin123',
        full_name='System Administrator',
        role='admin',
        department_id=cse_dept.id,
        phone='9999999999'
    )
    db.session.commit()

    # ─── 4. HOD Account (Dr. Ravi Kumar) ────────────────────────────
    hod_user = _get_or_create_user(
        username='ravi.kumar',
        email='ravi.kumar@college.edu',
        password='hod123',
        full_name='Dr. Ravi Kumar',
        role='hod',
        department_id=cse_dept.id,
        phone='9888800001'
    )
    cse_dept.hod_id = hod_user.id
    _get_or_create_faculty(
        user_id=hod_user.id,
        employee_id='FAC-HOD-001',
        department=cse_dept.name,
        designation='Professor & Head of Department',
        specialization='Computer Science & Systems Architecture'
    )
    db.session.commit()

    # ─── 5. Department Coordinator (Divya Sharma) ───────────────────
    coord_user = _get_or_create_user(
        username='divya.sharma',
        email='divya.sharma@college.edu',
        password='coordinator123',
        full_name='Divya Sharma',
        role='coordinator',
        department_id=cse_dept.id,
        phone='9888800002'
    )
    _get_or_create_faculty(
        user_id=coord_user.id,
        employee_id='FAC-COORD-001',
        department=cse_dept.name,
        designation='Associate Professor & Dept Coordinator',
        specialization='Academic Operations & Cloud Computing'
    )
    db.session.commit()

    # ─── 6. Mentor Account (Lakshmi Devi) ───────────────────────────
    mentor_user = _get_or_create_user(
        username='lakshmi.devi',
        email='lakshmi.devi@college.edu',
        password='mentor123',
        full_name='Lakshmi Devi',
        role='mentor',
        department_id=cse_dept.id,
        phone='9888800003'
    )
    _get_or_create_faculty(
        user_id=mentor_user.id,
        employee_id='FAC-MEN-001',
        department=cse_dept.name,
        designation='Assistant Professor & Mentor',
        specialization='Data Structures & Algorithm Design'
    )
    db.session.commit()

    # ─── 7. Class Teacher Account (Mahesh Rao) ──────────────────────
    ct_user = _get_or_create_user(
        username='mahesh.rao',
        email='mahesh.rao@college.edu',
        password='teacher123',
        full_name='Mahesh Rao',
        role='class_teacher',
        department_id=cse_dept.id,
        phone='9888800004'
    )
    _get_or_create_faculty(
        user_id=ct_user.id,
        employee_id='FAC-CT-001',
        department=cse_dept.name,
        designation='Assistant Professor & Class Teacher',
        specialization='Operating Systems & System Software'
    )

    # Sections setup
    sec_a = Section.query.filter_by(department_id=cse_dept.id, year=3, name='A').first()
    if not sec_a:
        sec_a = Section(name='A', department_id=cse_dept.id, year=3, class_teacher_id=ct_user.id)
        db.session.add(sec_a)
    else:
        sec_a.class_teacher_id = ct_user.id

    sec_b = Section.query.filter_by(department_id=cse_dept.id, year=3, name='B').first()
    if not sec_b:
        sec_b = Section(name='B', department_id=cse_dept.id, year=3, class_teacher_id=ct_user.id)
        db.session.add(sec_b)
    else:
        sec_b.class_teacher_id = ct_user.id
    db.session.commit()

    # ─── 8. Exactly 6 Faculty Accounts ──────────────────────────────
    print("[+] Creating 6 Faculty accounts...")
    faculty_data = [
        {
            'name': 'Arjun Mehta',
            'username': 'arjun.mehta',
            'email': 'arjun.mehta@college.edu',
            'emp_id': 'FAC001',
            'specialization': 'Data Structures',
            'phone': '9876500001'
        },
        {
            'name': 'Neha Sharma',
            'username': 'neha.sharma',
            'email': 'neha.sharma@college.edu',
            'emp_id': 'FAC002',
            'specialization': 'DBMS',
            'phone': '9876500002'
        },
        {
            'name': 'Suresh Kumar',
            'username': 'suresh.kumar',
            'email': 'suresh.kumar@college.edu',
            'emp_id': 'FAC003',
            'specialization': 'Computer Networks',
            'phone': '9876500003'
        },
        {
            'name': 'Anjali Rao',
            'username': 'anjali.rao',
            'email': 'anjali.rao@college.edu',
            'emp_id': 'FAC004',
            'specialization': 'Operating Systems',
            'phone': '9876500004'
        },
        {
            'name': 'Ravi Reddy',
            'username': 'ravi.reddy',
            'email': 'ravi.reddy@college.edu',
            'emp_id': 'FAC005',
            'specialization': 'Python Programming',
            'phone': '9876500005'
        },
        {
            'name': 'Kiran Nair',
            'username': 'kiran.nair',
            'email': 'kiran.nair@college.edu',
            'emp_id': 'FAC006',
            'specialization': 'Software Engineering',
            'phone': '9876500006'
        },
    ]

    faculty_users = {}
    for f in faculty_data:
        u = _get_or_create_user(
            username=f['username'],
            email=f['email'],
            password='faculty123',
            full_name=f['name'],
            role='faculty',
            department_id=cse_dept.id,
            phone=f['phone']
        )
        _get_or_create_faculty(
            user_id=u.id,
            employee_id=f['emp_id'],
            department=cse_dept.name,
            designation='Assistant Professor',
            specialization=f['specialization']
        )
        faculty_users[f['username']] = u

    db.session.commit()

    # ─── 9. Exactly 10 Student Accounts ─────────────────────────────
    print("[+] Creating 10 Student accounts...")
    student_data = [
        {'name': 'Rahul Sharma', 'username': 'rahul.sharma', 'email': 'rahul.sharma@college.edu', 'student_id': 'CSE001', 'section': 'A', 'year': 3, 'sem': 5, 'phone': '9777700001'},
        {'name': 'Priya Reddy', 'username': 'priya.reddy', 'email': 'priya.reddy@college.edu', 'student_id': 'CSE002', 'section': 'A', 'year': 3, 'sem': 5, 'phone': '9777700002'},
        {'name': 'Arun Kumar', 'username': 'arun.kumar', 'email': 'arun.kumar@college.edu', 'student_id': 'CSE003', 'section': 'A', 'year': 3, 'sem': 5, 'phone': '9777700003'},
        {'name': 'Sneha Rao', 'username': 'sneha.rao', 'email': 'sneha.rao@college.edu', 'student_id': 'CSE004', 'section': 'A', 'year': 3, 'sem': 5, 'phone': '9777700004'},
        {'name': 'Vivek Reddy', 'username': 'vivek.reddy', 'email': 'vivek.reddy@college.edu', 'student_id': 'CSE005', 'section': 'B', 'year': 3, 'sem': 5, 'phone': '9777700005'},
        {'name': 'Ananya Nair', 'username': 'ananya.nair', 'email': 'ananya.nair@college.edu', 'student_id': 'CSE006', 'section': 'B', 'year': 3, 'sem': 5, 'phone': '9777700006'},
        {'name': 'Karthik Rao', 'username': 'karthik.rao', 'email': 'karthik.rao@college.edu', 'student_id': 'CSE007', 'section': 'B', 'year': 3, 'sem': 5, 'phone': '9777700007'},
        {'name': 'Meghana Reddy', 'username': 'meghana.reddy', 'email': 'meghana.reddy@college.edu', 'student_id': 'CSE008', 'section': 'A', 'year': 2, 'sem': 3, 'phone': '9777700008'},
        {'name': 'Aditya Sharma', 'username': 'aditya.sharma', 'email': 'aditya.sharma@college.edu', 'student_id': 'CSE009', 'section': 'A', 'year': 2, 'sem': 3, 'phone': '9777700009'},
        {'name': 'Pooja Kumar', 'username': 'pooja.kumar', 'email': 'pooja.kumar@college.edu', 'student_id': 'CSE010', 'section': 'B', 'year': 2, 'sem': 3, 'phone': '9777700010'},
    ]

    student_users = {}
    for s in student_data:
        u = _get_or_create_user(
            username=s['username'],
            email=s['email'],
            password='student123',
            full_name=s['name'],
            role='student',
            department_id=cse_dept.id,
            phone=s['phone']
        )
        _get_or_create_student(
            user_id=u.id,
            student_id=s['student_id'],
            department=cse_dept.name,
            section=s['section'],
            year=s['year'],
            semester=s['sem'],
            mentor_id=mentor_user.id,
            class_teacher_id=ct_user.id
        )
        student_users[s['username']] = u

    db.session.commit()

    # ─── 10. Faculty Timetable Sample Data ───────────────────────────
    print("[+] Populating Faculty Timetable schedule (Mon - Fri)...")
    faculty_ids = [u.id for u in faculty_users.values()]
    FacultyTimetable.query.filter(FacultyTimetable.faculty_id.in_(faculty_ids)).delete(synchronize_session=False)

    timetable_schedule = [
        # Monday Schedule
        {'faculty': 'arjun.mehta', 'day': 'Monday', 'period': 1, 'subject': 'Data Structures', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(9, 0), 'end': time(10, 0)},
        {'faculty': 'neha.sharma', 'day': 'Monday', 'period': 2, 'subject': 'DBMS', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(10, 0), 'end': time(11, 0)},
        {'faculty': 'suresh.kumar', 'day': 'Monday', 'period': 3, 'subject': 'Computer Networks', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(11, 0), 'end': time(12, 0)},
        {'faculty': 'anjali.rao', 'day': 'Monday', 'period': 4, 'subject': 'Operating Systems', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(12, 0), 'end': time(13, 0)},
        {'faculty': 'ravi.reddy', 'day': 'Monday', 'period': 5, 'subject': 'Python Programming', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(14, 0), 'end': time(15, 0)},
        {'faculty': 'kiran.nair', 'day': 'Monday', 'period': 6, 'subject': 'Software Engineering', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(15, 0), 'end': time(16, 0)},

        # Tuesday Schedule
        {'faculty': 'neha.sharma', 'day': 'Tuesday', 'period': 1, 'subject': 'DBMS', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(9, 0), 'end': time(10, 0)},
        {'faculty': 'suresh.kumar', 'day': 'Tuesday', 'period': 2, 'subject': 'Computer Networks', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(10, 0), 'end': time(11, 0)},
        {'faculty': 'anjali.rao', 'day': 'Tuesday', 'period': 3, 'subject': 'Operating Systems', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(11, 0), 'end': time(12, 0)},
        {'faculty': 'ravi.reddy', 'day': 'Tuesday', 'period': 4, 'subject': 'Python Programming', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(12, 0), 'end': time(13, 0)},
        {'faculty': 'kiran.nair', 'day': 'Tuesday', 'period': 5, 'subject': 'Software Engineering', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(14, 0), 'end': time(15, 0)},
        {'faculty': 'arjun.mehta', 'day': 'Tuesday', 'period': 6, 'subject': 'Data Structures', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(15, 0), 'end': time(16, 0)},

        # Wednesday Schedule
        {'faculty': 'suresh.kumar', 'day': 'Wednesday', 'period': 1, 'subject': 'Computer Networks', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(9, 0), 'end': time(10, 0)},
        {'faculty': 'anjali.rao', 'day': 'Wednesday', 'period': 2, 'subject': 'Operating Systems', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(10, 0), 'end': time(11, 0)},
        {'faculty': 'ravi.reddy', 'day': 'Wednesday', 'period': 3, 'subject': 'Python Programming', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(11, 0), 'end': time(12, 0)},
        {'faculty': 'kiran.nair', 'day': 'Wednesday', 'period': 4, 'subject': 'Software Engineering', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(12, 0), 'end': time(13, 0)},
        {'faculty': 'arjun.mehta', 'day': 'Wednesday', 'period': 5, 'subject': 'Data Structures', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(14, 0), 'end': time(15, 0)},
        {'faculty': 'neha.sharma', 'day': 'Wednesday', 'period': 6, 'subject': 'DBMS', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(15, 0), 'end': time(16, 0)},

        # Thursday Schedule
        {'faculty': 'anjali.rao', 'day': 'Thursday', 'period': 1, 'subject': 'Operating Systems', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(9, 0), 'end': time(10, 0)},
        {'faculty': 'ravi.reddy', 'day': 'Thursday', 'period': 2, 'subject': 'Python Programming', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(10, 0), 'end': time(11, 0)},
        {'faculty': 'kiran.nair', 'day': 'Thursday', 'period': 3, 'subject': 'Software Engineering', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(11, 0), 'end': time(12, 0)},
        {'faculty': 'arjun.mehta', 'day': 'Thursday', 'period': 4, 'subject': 'Data Structures', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(12, 0), 'end': time(13, 0)},
        {'faculty': 'neha.sharma', 'day': 'Thursday', 'period': 5, 'subject': 'DBMS', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(14, 0), 'end': time(15, 0)},
        {'faculty': 'suresh.kumar', 'day': 'Thursday', 'period': 6, 'subject': 'Computer Networks', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(15, 0), 'end': time(16, 0)},

        # Friday Schedule
        {'faculty': 'ravi.reddy', 'day': 'Friday', 'period': 1, 'subject': 'Python Programming', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(9, 0), 'end': time(10, 0)},
        {'faculty': 'kiran.nair', 'day': 'Friday', 'period': 2, 'subject': 'Software Engineering', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(10, 0), 'end': time(11, 0)},
        {'faculty': 'arjun.mehta', 'day': 'Friday', 'period': 3, 'subject': 'Data Structures', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(11, 0), 'end': time(12, 0)},
        {'faculty': 'neha.sharma', 'day': 'Friday', 'period': 4, 'subject': 'DBMS', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(12, 0), 'end': time(13, 0)},
        {'faculty': 'suresh.kumar', 'day': 'Friday', 'period': 5, 'subject': 'Computer Networks', 'sec': 'CSE-A', 'room': 'LH-101', 'start': time(14, 0), 'end': time(15, 0)},
        {'faculty': 'anjali.rao', 'day': 'Friday', 'period': 6, 'subject': 'Operating Systems', 'sec': 'CSE-B', 'room': 'LH-102', 'start': time(15, 0), 'end': time(16, 0)},
    ]

    for item in timetable_schedule:
        fac_user = faculty_users[item['faculty']]
        entry = FacultyTimetable(
            faculty_id=fac_user.id,
            day=item['day'],
            period=item['period'],
            subject=item['subject'],
            section=item['sec'],
            room=item['room'],
            start_time=item['start'],
            end_time=item['end'],
            is_active=True
        )
        db.session.add(entry)

    db.session.commit()

    # ─── 11. Sample Student Permissions ──────────────────────────────
    print("[+] Creating sample student permissions & history...")
    rahul = student_users['rahul.sharma']
    priya = student_users['priya.reddy']
    arun = student_users['arun.kumar']

    # 1. Pending out_pass for Rahul (Mentor review)
    req1 = PermissionRequest.query.filter_by(request_number='PER-CSE001-01').first()
    if not req1:
        req1 = PermissionRequest(
            request_number='PER-CSE001-01',
            student_id=rahul.id,
            permission_type='out_pass',
            reason='Need to visit bank and municipality office for educational loan verification.',
            date=date.today() + timedelta(days=1),
            from_time=time(10, 0),
            to_time=time(14, 0),
            destination='State Bank of India Main Branch',
            contact_number='9777700001',
            status='pending',
            current_approver_role='mentor',
            current_approver_id=mentor_user.id
        )
        db.session.add(req1)
        db.session.flush()

        n1 = Notification(
            user_id=mentor_user.id,
            title='New Permission Application',
            message='Rahul Sharma has requested an Out Pass (PER-CSE001-01). Please review.',
            notification_type='warning',
            entity_type='permission',
            entity_id=req1.id
        )
        db.session.add(n1)

    # 2. Approved Medical Permission for Priya (with QR pass)
    req2 = PermissionRequest.query.filter_by(request_number='PER-CSE002-01').first()
    if not req2:
        req2 = PermissionRequest(
            request_number='PER-CSE002-01',
            student_id=priya.id,
            permission_type='medical',
            reason='Scheduled medical consultation and blood test at Apollo Clinic.',
            date=date.today(),
            from_time=time(9, 0),
            to_time=time(13, 0),
            destination='Apollo Clinic Health Center',
            contact_number='9777700002',
            status='approved',
            current_approver_role=None,
            current_approver_id=None
        )
        db.session.add(req2)
        db.session.flush()

        h1 = ApprovalHistory(request_id=req2.id, approver_id=mentor_user.id, approver_role='mentor', action='approved', remarks='Verified medical appointment slip.')
        h2 = ApprovalHistory(request_id=req2.id, approver_id=hod_user.id, approver_role='hod', action='approved', remarks='Approved. Take care.')
        db.session.add_all([h1, h2])

        qr_base_url = os.getenv('QR_VERIFICATION_BASE_URL', 'http://localhost:5173/verify-pass')
        generate_qr_pass(req2, qr_base_url)

    # 3. Under Review Permission for Arun (Class Teacher review)
    req3 = PermissionRequest.query.filter_by(request_number='PER-CSE003-01').first()
    if not req3:
        req3 = PermissionRequest(
            request_number='PER-CSE003-01',
            student_id=arun.id,
            permission_type='personal',
            reason='Attending family function out of station.',
            date=date.today() + timedelta(days=2),
            from_time=time(11, 0),
            to_time=time(17, 0),
            destination='Home Town',
            contact_number='9777700003',
            status='under_review',
            current_approver_role='class_teacher',
            current_approver_id=ct_user.id
        )
        db.session.add(req3)
        db.session.flush()
        h3 = ApprovalHistory(request_id=req3.id, approver_id=mentor_user.id, approver_role='mentor', action='approved', remarks='Parent consent confirmed.')
        db.session.add(h3)

    db.session.commit()

    # ─── 12. Sample Faculty Leave & Substitutes ──────────────────────
    print("[+] Creating sample faculty leaves & substitution workflows...")
    arjun = faculty_users['arjun.mehta']
    neha = faculty_users['neha.sharma']
    suresh = faculty_users['suresh.kumar']
    anjali = faculty_users['anjali.rao']

    # Delete existing faculty leaves for fresh deterministic demo state
    FacultyLeaveHistory.query.delete()
    SubstituteRequest.query.delete()
    FacultyLeave.query.delete()
    db.session.commit()

    # REQUEST 1: Arjun Mehta -> PENDING_COORDINATOR (appears on Coordinator dashboard)
    fl1 = FacultyLeave(
        request_number='FL-FAC001-01',
        faculty_id=arjun.id,
        coordinator_id=coord_user.id,
        department_id=cse_dept.id,
        leave_type='personal',
        reason='Personal work and family commitments.',
        date=date.today() + timedelta(days=1),
        start_date=date.today() + timedelta(days=1),
        end_date=date.today() + timedelta(days=3),
        session='full_day',
        from_time=time(9, 0),
        to_time=time(17, 0),
        status='pending_coordinator',
        current_approver='coordinator',
        remarks='All lesson slides prepared.'
    )
    db.session.add(fl1)
    db.session.flush()

    h1_1 = FacultyLeaveHistory(
        leave_id=fl1.id,
        user_id=arjun.id,
        role='faculty',
        action='submitted',
        status_after='pending_coordinator',
        remarks='Leave request submitted by Arjun Mehta.'
    )
    db.session.add(h1_1)

    n_fl1 = Notification(
        user_id=coord_user.id,
        title='New Faculty Leave Request',
        message='New faculty leave request from Arjun Mehta requires your approval.',
        notification_type='warning',
        entity_type='leave',
        entity_id=fl1.id
    )
    db.session.add(n_fl1)

    # Optional sample substitute request for fl1
    sr1 = SubstituteRequest(
        leave_id=fl1.id,
        original_faculty_id=arjun.id,
        substitute_faculty_id=neha.id,
        subject='Data Structures',
        section='CSE-A',
        room='LH-101',
        date=date.today() + timedelta(days=1),
        start_time=time(9, 0),
        end_time=time(10, 0),
        status='accepted'
    )
    db.session.add(sr1)

    # REQUEST 2: Neha Sharma -> PENDING_HOD (appears on HOD dashboard)
    fl2 = FacultyLeave(
        request_number='FL-FAC002-01',
        faculty_id=neha.id,
        coordinator_id=coord_user.id,
        department_id=cse_dept.id,
        leave_type='medical',
        reason='Medical consultation and follow-up tests.',
        date=date.today() + timedelta(days=2),
        start_date=date.today() + timedelta(days=2),
        end_date=date.today() + timedelta(days=3),
        session='full_day',
        from_time=time(9, 0),
        to_time=time(17, 0),
        status='pending_hod',
        current_approver='hod',
        coordinator_approved_at=datetime.utcnow() - timedelta(hours=2),
        coordinator_remarks='Substitute arrangements verified. Recommended for approval.'
    )
    db.session.add(fl2)
    db.session.flush()

    h2_1 = FacultyLeaveHistory(
        leave_id=fl2.id,
        user_id=neha.id,
        role='faculty',
        action='submitted',
        status_after='pending_coordinator',
        remarks='Medical leave application.'
    )
    h2_2 = FacultyLeaveHistory(
        leave_id=fl2.id,
        user_id=coord_user.id,
        role='coordinator',
        action='approved',
        status_after='pending_hod',
        remarks='Substitute arrangements verified. Recommended for approval.'
    )
    db.session.add_all([h2_1, h2_2])

    n_fl2 = Notification(
        user_id=hod_user.id,
        title='Faculty Leave Review',
        message='Faculty leave request from Neha Sharma has been approved by Coordinator Divya Sharma and requires your approval.',
        notification_type='warning',
        entity_type='leave',
        entity_id=fl2.id
    )
    db.session.add(n_fl2)

    # REQUEST 3: Suresh Kumar -> APPROVED
    fl3 = FacultyLeave(
        request_number='FL-FAC003-01',
        faculty_id=suresh.id,
        coordinator_id=coord_user.id,
        department_id=cse_dept.id,
        leave_type='conference',
        reason='Presenting research paper on Cloud Native Architectures at IEEE National Conference.',
        date=date.today() - timedelta(days=5),
        start_date=date.today() - timedelta(days=5),
        end_date=date.today() - timedelta(days=4),
        session='full_day',
        status='approved',
        current_approver=None,
        coordinator_approved_at=datetime.utcnow() - timedelta(days=6),
        coordinator_remarks='Conference participation verified.',
        hod_approved_at=datetime.utcnow() - timedelta(days=5, hours=18),
        hod_remarks='Approved. Good luck with the conference presentation.'
    )
    db.session.add(fl3)
    db.session.flush()

    h3_1 = FacultyLeaveHistory(
        leave_id=fl3.id,
        user_id=suresh.id,
        role='faculty',
        action='submitted',
        status_after='pending_coordinator',
        remarks='IEEE Conference paper presentation.'
    )
    h3_2 = FacultyLeaveHistory(
        leave_id=fl3.id,
        user_id=coord_user.id,
        role='coordinator',
        action='approved',
        status_after='pending_hod',
        remarks='Conference participation verified.'
    )
    h3_3 = FacultyLeaveHistory(
        leave_id=fl3.id,
        user_id=hod_user.id,
        role='hod',
        action='approved',
        status_after='approved',
        remarks='Approved. Good luck with the conference presentation.'
    )
    db.session.add_all([h3_1, h3_2, h3_3])

    # REQUEST 4: Anjali Rao -> REJECTED
    fl4 = FacultyLeave(
        request_number='FL-FAC004-01',
        faculty_id=anjali.id,
        coordinator_id=coord_user.id,
        department_id=cse_dept.id,
        leave_type='personal',
        reason='Personal travel.',
        date=date.today() - timedelta(days=2),
        start_date=date.today() - timedelta(days=2),
        end_date=date.today() - timedelta(days=2),
        session='morning',
        status='rejected',
        current_approver=None,
        coordinator_remarks='Critical internal lab examination scheduled on this date. Please reschedule.'
    )
    db.session.add(fl4)
    db.session.flush()

    h4_1 = FacultyLeaveHistory(
        leave_id=fl4.id,
        user_id=anjali.id,
        role='faculty',
        action='submitted',
        status_after='pending_coordinator',
        remarks='Personal travel request.'
    )
    h4_2 = FacultyLeaveHistory(
        leave_id=fl4.id,
        user_id=coord_user.id,
        role='coordinator',
        action='rejected',
        status_after='rejected',
        remarks='Critical internal lab examination scheduled on this date. Please reschedule.'
    )
    db.session.add_all([h4_1, h4_2])

    db.session.commit()

    print("\n" + "="*60)
    print("      *** SEEDING COMPLETED SUCCESSFULLY ***")
    print("="*60)
    print("  Total Demo Accounts: 21 (10 Students, 6 Faculty, 1 Mentor,")
    print("                           1 Class Teacher, 1 Coordinator,")
    print("                           1 HOD, 1 Admin)")
    print("-" * 60)
    print("  DEMO LOGIN CREDENTIALS:")
    print("  ------------------------------------------------------------")
    print("  Students (Password: student123):")
    for s in student_data:
        print(f"    - {s['username']:<15} ({s['name']:<15} - ID: {s['student_id']})")
    print("\n  Faculty (Password: faculty123):")
    for f in faculty_data:
        print(f"    - {f['username']:<15} ({f['name']:<15} - ID: {f['emp_id']})")
    print("\n  Other Roles:")
    print("    - lakshmi.devi   / mentor123       (Mentor)")
    print("    - mahesh.rao     / teacher123      (Class Teacher)")
    print("    - divya.sharma   / coordinator123  (Dept Coordinator)")
    print("    - ravi.kumar     / hod123          (HOD CSE)")
    print("    - admin          / admin123        (System Admin)")
    print("="*60 + "\n")


if __name__ == '__main__':
    seed()
