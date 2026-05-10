# MarineOps — Maritime Operations & Compliance System

A full-stack application for managing ship maintenance, safety drills, and compliance monitoring across a maritime fleet.

---

## Features

### Core
| Module | Admin | Crew |
|---|---|---|
| **Maintenance** | Create/edit/delete tasks, assign to crew, set priority & due date | View assigned tasks, update status, add notes |
| **Safety Drills** | Schedule drills, assign to ships, manage attendance | View upcoming drills, mark attendance/completion |
| **Compliance** | Fleet-wide dashboard with charts, per-ship risk levels, 6-month trend | Personal compliance score |
| **Ships** | Full CRUD for fleet vessels | View assigned ship |
| **Users** | Create/manage crew accounts, assign to ships | View own profile |

### Bonus Features Implemented
- **JWT Authentication** with role-based access control (Admin / Crew)
- **Filters** by ship, status, date, and priority on all list views
- **Real-time Notifications** bell with critical/warning alerts in the header
- **Charts** — Pie chart (task breakdown), Bar chart (monthly trend), Line chart (compliance trend), Radar chart (compliance radar)
- **Docker setup** with PostgreSQL, backend, and frontend services
- **Overdue detection** — tasks/drills past due date are automatically highlighted in red
- **Compliance calculation** — `(completed/total) * 100` for maintenance; `(attended_drills/past_drills) * 100` for safety; combined for overall

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Recharts |
| **Backend** | Node.js + Express + TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Containerization** | Docker + Docker Compose |

---

## Quick Start

### Option A: Docker (Recommended)

```bash
docker-compose up --build
```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/health

### Option B: Local Development

**Prerequisites:** Node.js 18+, PostgreSQL running locally

**1. Backend**
```bash
cd backend
cp .env.example .env
# Edit .env — set your DATABASE_URL

npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run dev
```

**2. Frontend**
```bash
cd frontend
cp .env.example .env

npm install
npm start
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@maritime.com | admin123 |
| Crew (Ship 1) | john@maritime.com | crew123 |
| Crew (Ship 1) | sarah@maritime.com | crew123 |
| Crew (Ship 2) | mike@maritime.com | crew123 |

---

## API Reference

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user |

### Ships
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/ships` | Any | List all ships |
| POST | `/api/ships` | Admin | Create ship |
| PUT | `/api/ships/:id` | Admin | Update ship |
| DELETE | `/api/ships/:id` | Admin | Delete ship |

### Maintenance Tasks
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/maintenance?shipId=&status=&priority=` | Any | List tasks (crew: own only) |
| POST | `/api/maintenance` | Admin | Create task |
| PUT | `/api/maintenance/:id` | Admin/Assigned Crew | Update task |
| POST | `/api/maintenance/:id/notes` | Admin/Assigned Crew | Add note |
| DELETE | `/api/maintenance/:id` | Admin | Delete task |

### Safety Drills
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/drills?shipId=&type=&upcoming=` | Any | List drills |
| POST | `/api/drills` | Admin | Schedule drill |
| POST | `/api/drills/:id/attendance` | Any | Mark attendance |
| DELETE | `/api/drills/:id` | Admin | Delete drill |

### Compliance
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/compliance/summary?shipId=` | Any | Get compliance summary |
| GET | `/api/compliance/ships` | Any | Per-ship compliance |
| GET | `/api/compliance/trend?shipId=` | Any | 6-month trend |
| GET | `/api/compliance/notifications` | Any | Alerts & notifications |

---

## Database Schema

```
User          — id, name, email, passwordHash, role, shipId
Ship          — id, name, imoNumber, type, flag
MaintenanceTask — id, title, description, shipId, assignedToId, status, priority, dueDate
TaskNote      — id, taskId, userId, note
SafetyDrill   — id, title, type, shipId, scheduledDate, description
DrillAttendance — id, drillId, userId, attended, completedAt
```

---

## Architecture Decisions

### Why Prisma over raw SQL?
Type-safe ORM that generates TypeScript types from schema. Eliminates entire class of bugs and speeds up development significantly.

### Why JWT over sessions?
Stateless auth fits well for a distributed maritime system where backend instances may scale horizontally. The 24h expiry provides a balance between UX and security.

### Compliance Calculation Logic
```
maintenanceRate = (completedTasks / totalTasks) * 100
drillRate = ((pastDrills - missedDrills) / pastDrills) * 100
overallCompliance = (maintenanceRate + drillRate) / 2

isCompliant = overallCompliance >= 80
riskLevel = >= 80 → LOW | >= 60 → MEDIUM | < 60 → HIGH
```

### Overdue Detection
- Tasks: `status != COMPLETED AND dueDate < now()`
- Drills: `scheduledDate < now() AND no attendance records`
- Calculated at query time on the backend, not stored — always reflects current state.

### RBAC Implementation
- JWT payload includes `{ userId, role, shipId }`
- `authenticate` middleware validates token on every protected route
- `requireAdmin` middleware gates admin-only endpoints
- Crew users automatically see only their assigned data (enforced server-side)

---

## Project Structure

```
maritime/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Demo data seeder
│   ├── src/
│   │   ├── index.ts            # Express app entry
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT auth + RBAC
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── ships.ts
│   │   │   ├── users.ts
│   │   │   ├── maintenance.ts
│   │   │   ├── drills.ts
│   │   │   └── compliance.ts
│   │   └── services/
│   │       └── prisma.ts       # Prisma client singleton
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Global auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── MaintenancePage.tsx
│   │   │   ├── DrillsPage.tsx
│   │   │   ├── ShipsPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── CompliancePage.tsx
│   │   │   └── CrewDashboardPage.tsx
│   │   ├── services/
│   │   │   └── api.ts          # Axios API client
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript interfaces
│   │   └── components/
│   │       └── Layout.tsx      # Sidebar + header
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
