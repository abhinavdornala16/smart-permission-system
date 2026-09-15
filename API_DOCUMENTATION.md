# Smart Permission System — REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
- **Request Body**: `{ "username": "student1", "password": "student123" }`
- **Response**: Returns `access_token`, `refresh_token`, and user profile data.

### `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Current user profile.

### `POST /api/auth/refresh`
- **Headers**: `Authorization: Bearer <refresh_token>`
- **Response**: New `access_token`.

### `POST /api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`

---

## 2. Student Permissions (`/api/permissions`)

### `POST /api/permissions`
- **Headers**: `Authorization: Bearer <token>` (Student)
- **Body**: `{ "permission_type": "out_pass", "reason": "...", "date": "2026-08-15", "from_time": "10:00", "to_time": "16:00", "destination": "..." }`
- **Response**: 201 Created request object with initial approver assigned.

### `GET /api/permissions/my-requests`
- **Headers**: `Authorization: Bearer <token>` (Student)
- **Query Params**: `status`, `page`, `per_page`

### `GET /api/permissions/pending`
- **Headers**: `Authorization: Bearer <token>` (Mentor / CT / HOD / Admin)
- **Response**: Requests awaiting action by the caller's role.

### `POST /api/permissions/<id>/approve`
- **Body**: `{ "remarks": "..." }`
- **Behavior**: Advances request to next workflow step. If final step, generates QR Pass.

### `POST /api/permissions/<id>/reject`
- **Body**: `{ "remarks": "Rejection reason" }`

### `GET /api/permissions/verify/<pass_number>`
- **Public Endpoint** (No Auth Required)
- **Response**: Pass status (`VALID`, `EXPIRED`, `INVALID`) and verified student metadata.

---

## 3. Faculty Leave & Substitutes (`/api/faculty` & `/api/substitutes`)

### `POST /api/faculty/leave`
- **Body**: `{ "leave_type": "medical", "reason": "...", "date": "2026-08-15", "session": "full_day" }`
- **Response**: Identifies affected classes during the leave period.

### `GET /api/substitutes/available`
- **Query Params**: `date`, `start_time`, `end_time`, `department`, `subject`
- **Algorithm**: Returns active faculty ranked by suitability score (free timetable period, same department, related subject, low substitute load).

### `POST /api/substitutes/request`
- **Body**: `{ "leave_id": 1, "substitute_faculty_id": 5, "subject": "DBMS", "section": "CSE-A", "date": "...", "start_time": "10:00", "end_time": "11:00" }`

### `POST /api/substitutes/<id>/accept`
- **Headers**: `Authorization: Bearer <substitute_token>`

### `POST /api/substitutes/coordinator/<id>/approve`
- **Headers**: `Authorization: Bearer <coordinator_token>`

### `POST /api/substitutes/hod/<id>/approve`
- **Headers**: `Authorization: Bearer <hod_token>`

---

## 4. Admin & Analytics (`/api/admin` & `/api/reports`)

### `GET /api/admin/users`
- User list with role filtering and search.

### `POST /api/admin/workflows`
- Add/update dynamic approval steps per permission type.

### `GET /api/reports/dashboard`
- Dashboard metrics and analytics data.
