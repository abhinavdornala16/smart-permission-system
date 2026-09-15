# Smart Permission & Faculty Management System

> **Dhondi College Application — Standalone Extension Module**

A complete, production-style web application designed as a standalone extension module for the **Dhondi College App**. Automates two core institutional administrative workflows:

1. **Student Permission Management** — Multi-level configurable approval workflow, digital permission pass generation, QR code verification.
2. **Faculty Leave & Substitute Management** — Faculty leave requests, smart substitute recommendation logic based on timetable availability & workload, multi-tier coordinator/HOD approvals.

---

## 🌟 Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, React Router v6, Axios, Recharts, Lucide Icons, PWA Service Worker.
- **Backend**: Python 3.10, Flask 3.1, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS, Werkzeug, PyJWT, qrcode.
- **Database**: SQLite (default development) / PostgreSQL (production-ready via `DATABASE_URL`).

---

## 🚀 Quick Start (Local Setup)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\python seed.py
.\venv\Scripts\python run.py
```
- API Server runs at: `http://localhost:5000/api`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
- Web Application runs at: `http://localhost:5173`

---

## 🔑 Demo Login Credentials

| Role | Username | Password |
|------|----------|----------|
| **Student** | `rahul.sharma` | `student123` |
| **Student** | `priya.reddy` | `student123` |
| **Student** | `arun.kumar` | `student123` |
| **Student** | `sneha.rao` | `student123` |
| **Student** | `vivek.reddy` | `student123` |
| **Student** | `ananya.nair` | `student123` |
| **Student** | `karthik.rao` | `student123` |
| **Student** | `meghana.reddy` | `student123` |
| **Student** | `aditya.sharma` | `student123` |
| **Student** | `pooja.kumar` | `student123` |
| **Faculty** | `arjun.mehta` | `faculty123` |
| **Faculty** | `neha.sharma` | `faculty123` |
| **Faculty** | `suresh.kumar` | `faculty123` |
| **Faculty** | `anjali.rao` | `faculty123` |
| **Faculty** | `ravi.reddy` | `faculty123` |
| **Faculty** | `kiran.nair` | `faculty123` |
| **Mentor** | `lakshmi.devi` | `mentor123` |
| **Class Teacher** | `mahesh.rao` | `teacher123` |
| **Coordinator** | `divya.sharma` | `coordinator123` |
| **HOD** | `ravi.kumar` | `hod123` |
| **Admin** | `admin` | `admin123` |

---

## 🧪 Running Unit Tests

```bash
cd backend
.\venv\Scripts\python -m pytest tests/ -v
```

---

## 📄 License & Minor Project Note
Designed and developed as a B.Tech Minor Project extension module for college ERP applications.
