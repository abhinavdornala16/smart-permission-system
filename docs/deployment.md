# Cloud Production Deployment Guide
## Dhondi Smart Permission & Faculty Management System

This guide provides end-to-end instructions for deploying the **Dhondi Smart Permission & Faculty Management System** to the cloud as a true multi-user, multi-device web application connected to a centralized **PostgreSQL** database.

---

## 🏗️ 1. Production Architecture Overview

In production, multiple users on different laptops/browsers interact with a single centralized system:

```
                    INTERNET (HTTPS)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      STUDENT BROWSER             STAFF BROWSER
    (Laptops / Mobiles)        (Laptops / Mobiles)
             │                           │
             └─────────────┬─────────────┘
                           ▼
               CLOUD FRONTEND (Vite/React)
            (Vercel / Netlify / Render / S3)
                           │
                           │ HTTPS API Requests (JSON + JWT)
                           ▼
               CLOUD BACKEND (Flask + Gunicorn)
            (Render / Railway / Fly.io / AWS EC2)
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         AUTH / RBAC   WORKFLOWS    NOTIFICATIONS
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                 SQLALCHEMY ORM ENGINE
                           │
                           ▼
               MANAGED CLOUD POSTGRESQL
            (Neon / Supabase / Render / AWS RDS)
             [Single Central Database Engine]
```

---

## ⚙️ 2. Environment Variables Specification

### Backend Environment Variables (`backend/.env` / Cloud Provider Settings)

| Variable | Type | Example Value | Description |
|---|---|---|---|
| `FLASK_ENV` | String | `production` | Enables production configuration mode. |
| `PORT` | Integer | `5000` or `$PORT` | Port for the WSGI server. |
| `SECRET_KEY` | String (Hex) | `9f3c7e8a1d2...` | Flask session & cryptographic signature secret. |
| `JWT_SECRET_KEY` | String (Hex) | `e4b7c1a82f0...` | Secret key for signing and verifying JWT tokens. |
| `DATABASE_URL` | String (URI) | `postgresql://user:pass@host:5432/dbname?sslmode=require` | Cloud PostgreSQL connection string. |
| `JWT_ACCESS_TOKEN_EXPIRES` | Integer | `3600` | Access token lifespan in seconds (1 hour). |
| `JWT_REFRESH_TOKEN_EXPIRES` | Integer | `86400` | Refresh token lifespan in seconds (24 hours). |
| `CORS_ORIGINS` | Comma-delimited | `https://dhondi-app.vercel.app,https://dhondi-app.onrender.com` | Allowed frontend domains for CORS. |
| `QR_VERIFICATION_BASE_URL` | String (URL) | `https://dhondi-app.vercel.app/verify-pass` | Base URL embedded into QR codes for public verification. |

### Frontend Environment Variables (`frontend/.env` / Cloud Provider Settings)

| Variable | Example Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://dhondi-api.onrender.com` | Base URL of the deployed backend Flask API. |

---

## 🗄️ 3. Step-by-Step Cloud Deployment

### Phase A: Provision Cloud PostgreSQL Database
Recommended free/low-cost managed PostgreSQL providers: **Neon.tech**, **Supabase.com**, **Render.com**, or **Railway.app**.

1. Create a PostgreSQL 15+ database instance.
2. Note the connection URI:
   ```text
   postgresql://dhondi_admin:SecurePass123!@ep-xyz-neon.tech/dhondi_db?sslmode=require
   ```

---

### Phase B: Deploy the Backend API (Render / Railway / Fly.io)

1. **Push Code to GitHub / Git repository**.
2. **Create New Web Service** on Render or Railway:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT "run:app"`
3. **Configure Environment Variables in Dashboard**:
   - `FLASK_ENV`: `production`
   - `DATABASE_URL`: *(Your PostgreSQL Connection String)*
   - `SECRET_KEY`: *(Generate via `python -c "import secrets; print(secrets.token_hex(32))"`)*
   - `JWT_SECRET_KEY`: *(Generate via `python -c "import secrets; print(secrets.token_hex(32))"`)*
   - `CORS_ORIGINS`: `https://your-frontend-domain.vercel.app`
   - `QR_VERIFICATION_BASE_URL`: `https://your-frontend-domain.vercel.app/verify-pass`
4. **Deploy Service** and copy the backend URL (e.g. `https://dhondi-api.onrender.com`).
5. **Verify Health Endpoint**:
   - Open: `https://dhondi-api.onrender.com/health`
   - Output should be:
     ```json
     {
       "status": "ok",
       "database": "ok",
       "service": "Dhondi Smart Permission API",
       "version": "1.0.0"
     }
     ```

---

### Phase C: Initialize / Seed Database (One-Time Run)

In Render / Railway shell or your local terminal connected to the cloud DB:
```powershell
# In backend directory with cloud DATABASE_URL set
python seed.py
```
> 💡 *The seed script is idempotent (`_get_or_create_user`) and safely creates all 21 demo users, workflow stages, and timetable schedules without duplicating or deleting existing records.*

---

### Phase D: Deploy Frontend (Vercel / Netlify / Cloudflare Pages)

1. **Create New Project** on Vercel or Netlify.
2. **Set Root Directory**: `frontend`
3. **Build Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Configure Environment Variable**:
   - `VITE_API_URL`: `https://dhondi-api.onrender.com`
5. **Deploy Frontend** and copy the frontend URL (e.g. `https://dhondi-app.vercel.app`).
6. **Update Backend CORS**:
   - Update `CORS_ORIGINS` on the backend to match the exact frontend domain: `https://dhondi-app.vercel.app`.

---

## 🧪 4. Multi-Computer Live Test Procedure

Verify multi-user synchronization across different laptops or distinct browser profiles:

### Scenario 1: Student Permission Request (Multi-Tier Chain)

```
[Laptop 1: Student]               [Laptop 2: Class Teacher]          [Laptop 3: Mentor]          [Laptop 4: HOD]
      │                                     │                                 │                         │
      │ 1. Submits Permission               │                                 │                         │
      │    (PER-XXXXXX)                     │                                 │                         │
      │ ─── status: PENDING_CLASS_TEACHER ─►│                                 │                         │
      │                                     │ 2. Real-time poll reflects req  │                         │
      │                                     │    Teacher clicks "Approve"     │                         │
      │                                     │ ─── status: PENDING_MENTOR ────►│                         │
      │                                     │                                 │ 3. Mentor polls req     │
      │                                     │                                 │    Mentor clicks Approve│
      │                                     │                                 │ ─── status: PENDING_HOD─►
      │                                     │                                 │                         │ 4. HOD polls req
      │                                     │                                 │                         │    HOD clicks Approve
      │◄────────────────────────────────────┴─────────────────────────────────┴─────────────────────────┤ ─── status: APPROVED
      │ 5. Student dashboard polls update (within 8s):
      │    - Status changes to "APPROVED"
      │    - Secure Digital QR Pass generates with verification link
```

### Scenario 2: Faculty Leave Request & Smart Substitute

```
[Laptop 1: Faculty]                [Laptop 2: Coordinator]               [Laptop 3: HOD]
      │                                     │                                   │
      │ 1. Applies for Leave                │                                   │
      │    (with smart substitute match)    │                                   │
      │ ─── status: PENDING_COORDINATOR ───►│                                   │
      │                                     │ 2. Coordinator approves           │
      │                                     │ ─── status: PENDING_HOD ─────────►│
      │                                     │                                   │ 3. HOD gives final approval
      │◄────────────────────────────────────┴───────────────────────────────────┤ ─── status: APPROVED
      │ 4. Faculty dashboard updates with approved status & active QR pass.
```

### Scenario 3: Rejection Handling

- If Coordinator or Class Teacher **Rejects**:
  - Request immediately transitions to `REJECTED`.
  - Next tier approvers (HOD/Mentor) **never receive** the request.
  - Student / Faculty dashboard updates to `REJECTED` with remarks.
  - **No QR pass is generated**.

---

## 🔒 5. Security & Best Practices

1. **HTTPS Only**: Ensure both frontend and backend enforce HTTPS. Cloud providers (Vercel, Render) manage SSL/TLS certificates automatically.
2. **Never Commit Secrets**: Ensure `.env` is listed in `.gitignore` and only configure secrets via cloud dashboard environment variables.
3. **Database Security**:
   - Use `sslmode=require` on PostgreSQL connection strings.
   - Connection pool pre-pinging (`pool_pre_ping=True`) is enabled to prune stale connections automatically.
4. **CORS Restriction**: Explicitly whitelist only the production frontend domain in `CORS_ORIGINS`.

---

## 🛠️ 6. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| CORS Error in Browser Console | `CORS_ORIGINS` does not match the frontend domain. | Update `CORS_ORIGINS` in backend environment variables to include the frontend URL without trailing slash. |
| Database connection timeout | PostgreSQL SSL mode or cloud host firewall. | Append `?sslmode=require` to `DATABASE_URL`. |
| Login 401 after page reload | Expired token / invalid secret. | Check `SECRET_KEY` and `JWT_SECRET_KEY` are consistent across server restarts. |
| QR Code points to localhost | `QR_VERIFICATION_BASE_URL` not set. | Set `QR_VERIFICATION_BASE_URL=https://<your-frontend>/verify-pass` in backend environment variables. |
