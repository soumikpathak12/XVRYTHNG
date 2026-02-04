# XVRYTHNG – Solar CRM & Project Management

Phase 1: **Authentication & User Management** (Login + RBAC-ready schema).

## Tech Stack

- **Frontend:** React (Vite), no UI kits – custom CSS with brand colors
- **Backend:** Node.js (Express), JWT, bcrypt
- **Database:** MySQL
- **Auth:** JWT in localStorage; role-based redirect (Super Admin → `/admin`, Company Admin/Manager → `/dashboard`, Field Agent → `/mobile`)

## Project Structure

```
XVRYTHNG/
├── backend/
│   ├── src/
│   │   ├── config/       # DB pool
│   │   ├── controllers/ # authController
│   │   ├── routes/      # authRoutes
│   │   ├── services/    # authService (validate, JWT)
│   │   └── app.js
│   ├── database/
│   │   └── seed.js      # Super Admin user
│   ├── server.js
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/auth/  # LoginForm
│       ├── context/         # AuthContext
│       ├── services/        # api.js
│       ├── styles/          # theme, global.css
│       └── App.jsx
├── database/
│   └── schema.sql       # companies, roles, users
└── README.md
```

## Setup

### 1. Database

```bash
# Create DB and user (MySQL)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS xvrythng; CREATE USER IF NOT EXISTS 'xvrythng'@'localhost' IDENTIFIED BY 'your_password'; GRANT ALL ON xvrythng.* TO 'xvrythng'@'localhost'; FLUSH PRIVILEGES;"

# Run schema
mysql -u xvrythng -p xvrythng < database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DB_*, JWT_SECRET (min 32 chars)

npm install
npm run seed   # Creates Super Admin: admin@xvrythng.com / ChangeMe123!
npm run dev    # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

Vite proxies `/api` to the backend (see `vite.config.js`).

## API

- **POST /api/auth/login**  
  Body: `{ "email": "...", "password": "..." }`  
  Returns: `{ "success": true, "token": "...", "user": { "id", "name", "role", "companyId" } }`  
  JWT payload: `userId`, `role`, `companyId`.

## Design Decisions

- **RBAC:** `roles` table + `role_id` on `users`; JWT carries `role` for fast checks; permissions table left for Phase 2.
- **Multi-tenant:** `company_id` on users; Super Admin has `company_id` NULL; unique `(email, company_id)`.
- **Passwords:** bcrypt in authService; secrets only in env.
- **Frontend:** No MUI/AntD; single global CSS + component-level CSS; theme object for strict brand colors.
- **Token storage:** localStorage for now; structure allows future move to httpOnly cookie or offline sync.

## Brand Colors (strict)

| Use            | Hex       |
|----------------|-----------|
| Primary Teal   | `#1A7B7B` |
| Secondary Teal | `#4DB8A8` |
| Background     | `#FFFFFF` |
| Surface        | `#F5F5F5` |
| Text Primary   | `#1A1A2E` |
| Text Secondary | `#555555` |
| Success        | `#28A745` |
| Warning        | `#FFC107` |
| Danger         | `#DC3545` |
| Info           | `#17A2B8` |
