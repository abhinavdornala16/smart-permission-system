-- ============================================================================
-- Smart Permission & Faculty Workflow Management System
-- Cloud PostgreSQL Database Schema (Supabase)
-- ============================================================================

-- Enable required Postgres extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    hod_id INTEGER,
    second_hod_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add circular foreign keys from departments to users
ALTER TABLE departments 
    DROP CONSTRAINT IF EXISTS fk_departments_hod,
    ADD CONSTRAINT fk_departments_hod FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE departments 
    DROP CONSTRAINT IF EXISTS fk_departments_second_hod,
    ADD CONSTRAINT fk_departments_second_hod FOREIGN KEY (second_hod_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. SECTIONS TABLE
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    class_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. STUDENTS PROFILE TABLE
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    department VARCHAR(50) NOT NULL,
    section VARCHAR(10) NOT NULL,
    year INTEGER NOT NULL,
    semester INTEGER,
    mentor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    class_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 5. FACULTY PROFILE TABLE
CREATE TABLE IF NOT EXISTS faculty (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    department VARCHAR(50) NOT NULL,
    designation VARCHAR(50),
    specialization VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE
);

-- 6. PERMISSION REQUESTS TABLE (Student Leave / Out-pass)
CREATE TABLE IF NOT EXISTS permission_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(20) NOT NULL UNIQUE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    from_time TIME NOT NULL,
    to_time TIME NOT NULL,
    destination VARCHAR(200),
    contact_number VARCHAR(15),
    document_path VARCHAR(300),
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    current_approver_role VARCHAR(30),
    current_approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. APPROVAL HISTORY TABLE
CREATE TABLE IF NOT EXISTS approval_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES permission_requests(id) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approver_role VARCHAR(30) NOT NULL,
    action VARCHAR(20) NOT NULL,
    remarks TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FACULTY LEAVE TABLE
CREATE TABLE IF NOT EXISTS faculty_leave (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(20) NOT NULL UNIQUE,
    faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coordinator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    leave_type VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    start_date DATE,
    end_date DATE,
    session VARCHAR(20),
    from_time TIME,
    to_time TIME,
    status VARCHAR(30) DEFAULT 'pending_coordinator',
    current_approver VARCHAR(30) DEFAULT 'coordinator',
    remarks TEXT,
    coordinator_approved_at TIMESTAMPTZ,
    coordinator_remarks TEXT,
    hod_approved_at TIMESTAMPTZ,
    hod_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FACULTY LEAVE HISTORY TABLE
CREATE TABLE IF NOT EXISTS faculty_leave_history (
    id SERIAL PRIMARY KEY,
    leave_id INTEGER NOT NULL REFERENCES faculty_leave(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL,
    action VARCHAR(30) NOT NULL,
    status_after VARCHAR(30) NOT NULL,
    remarks TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FACULTY TIMETABLE TABLE
CREATE TABLE IF NOT EXISTS faculty_timetable (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day VARCHAR(10) NOT NULL,
    period INTEGER NOT NULL,
    subject VARCHAR(100) NOT NULL,
    section VARCHAR(20) NOT NULL,
    room VARCHAR(20),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 11. FACULTY AVAILABILITY OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS faculty_availability (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    available BOOLEAN DEFAULT TRUE,
    remarks TEXT
);

-- 12. SUBSTITUTE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS substitute_requests (
    id SERIAL PRIMARY KEY,
    leave_id INTEGER NOT NULL REFERENCES faculty_leave(id) ON DELETE CASCADE,
    original_faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    substitute_faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timetable_entry_id INTEGER REFERENCES faculty_timetable(id) ON DELETE SET NULL,
    subject VARCHAR(100) NOT NULL,
    section VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    response_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. QR PASSES TABLE
CREATE TABLE IF NOT EXISTS qr_passes (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL UNIQUE REFERENCES permission_requests(id) ON DELETE CASCADE,
    pass_number VARCHAR(20) NOT NULL UNIQUE,
    qr_data TEXT NOT NULL,
    qr_image TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);

-- 14. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) DEFAULT 'info',
    entity_type VARCHAR(30),
    entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id INTEGER,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    remarks TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 16. WORKFLOW CONFIG TABLE
CREATE TABLE IF NOT EXISTS workflow_config (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(30) NOT NULL,
    step_number INTEGER NOT NULL,
    approver_role VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_workflow_step UNIQUE (request_type, step_number)
);

-- ============================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_mentor ON students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_students_class_teacher ON students(class_teacher_id);

CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON faculty(user_id);

CREATE INDEX IF NOT EXISTS idx_perm_req_student ON permission_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_perm_req_status ON permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_perm_req_date ON permission_requests(date);
CREATE INDEX IF NOT EXISTS idx_perm_req_approver ON permission_requests(current_approver_id);

CREATE INDEX IF NOT EXISTS idx_approval_history_request ON approval_history(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver ON approval_history(approver_id);

CREATE INDEX IF NOT EXISTS idx_faculty_leave_faculty ON faculty_leave(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_leave_status ON faculty_leave(status);
CREATE INDEX IF NOT EXISTS idx_faculty_leave_dept ON faculty_leave(department_id);

CREATE INDEX IF NOT EXISTS idx_substitute_leave ON substitute_requests(leave_id);
CREATE INDEX IF NOT EXISTS idx_substitute_orig_faculty ON substitute_requests(original_faculty_id);
CREATE INDEX IF NOT EXISTS idx_substitute_sub_faculty ON substitute_requests(substitute_faculty_id);
CREATE INDEX IF NOT EXISTS idx_substitute_status ON substitute_requests(status);

CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON faculty_timetable(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON faculty_timetable(day);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ============================================================================
-- INITIAL SEED DATA (Default Workflow Configuration)
-- ============================================================================
INSERT INTO workflow_config (request_type, step_number, approver_role, is_active)
VALUES
    ('out_pass', 1, 'mentor', TRUE),
    ('out_pass', 2, 'class_teacher', TRUE),
    ('out_pass', 3, 'hod', TRUE),
    ('medical', 1, 'mentor', TRUE),
    ('medical', 2, 'class_teacher', TRUE),
    ('medical', 3, 'hod', TRUE),
    ('club_activity', 1, 'mentor', TRUE),
    ('club_activity', 2, 'coordinator', TRUE),
    ('club_activity', 3, 'hod', TRUE),
    ('college_event', 1, 'coordinator', TRUE),
    ('college_event', 2, 'hod', TRUE),
    ('department_activity', 1, 'coordinator', TRUE),
    ('department_activity', 2, 'hod', TRUE),
    ('personal', 1, 'mentor', TRUE),
    ('personal', 2, 'class_teacher', TRUE),
    ('personal', 3, 'hod', TRUE),
    ('other', 1, 'mentor', TRUE),
    ('other', 2, 'class_teacher', TRUE),
    ('other', 3, 'hod', TRUE)
ON CONFLICT (request_type, step_number) DO NOTHING;
