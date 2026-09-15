"""Entry point for the Flask application."""
import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db

app = create_app()

def _sync_sqlite_columns():
    """Ensure newly added columns exist in sqlite tables."""
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

# Create tables on startup (development only)
with app.app_context():
    # Import all models to ensure they're registered
    from app.models import *  # noqa: F401, F403
    db.create_all()
    _sync_sqlite_columns()
    print("[+] Database tables created/verified.")

if __name__ == '__main__':
    print("[+] Starting Smart Permission System API...")
    print("[+] API: http://localhost:5000/api")
    print("[+] Health: http://localhost:5000/api/health")
    app.run(host='0.0.0.0', port=5000, debug=True)
