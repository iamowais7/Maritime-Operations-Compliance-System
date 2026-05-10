# Business Flow — Maritime Operations & Compliance System

## Overview

The system serves two actor types: **Admin** (fleet managers, officers) and **Crew** (sailors, engineers). Both interact through role-gated views of the same data platform.

---

## Actor Flows

### Admin Flow

```
Login → Admin Dashboard
    │
    ├── Fleet Management
    │     └── Add/edit ships (name, IMO, type, flag)
    │
    ├── Crew Management
    │     └── Add users, assign roles, assign to ships
    │
    ├── Maintenance Tasks
    │     ├── Create task → set ship, assignee, due date, priority
    │     ├── Monitor task status (Pending → In Progress → Completed)
    │     └── View overdue tasks highlighted in red
    │
    ├── Safety Drills
    │     ├── Schedule drill → select type, ship, date/time
    │     └── Monitor attendance per drill
    │
    └── Compliance Dashboard
          ├── Fleet-wide compliance score (Maintenance % + Drill %)
          ├── Per-ship risk assessment (LOW / MEDIUM / HIGH)
          ├── 6-month trend charts
          └── Alerts for overdue tasks & missed drills
```

### Crew Flow

```
Login → Crew Dashboard
    │
    ├── My Tasks
    │     ├── View tasks assigned to me
    │     ├── Update status (Pending → In Progress → Completed)
    │     └── Add notes/comments on a task
    │
    ├── Safety Drills
    │     ├── View drills scheduled for my ship
    │     ├── Mark attendance (attended / absent)
    │     └── Submit drill completion notes
    │
    └── My Compliance Score
          └── Personal maintenance and drill participation %
```

---

## State Machines

### Maintenance Task Lifecycle

```
[PENDING] ──────────────────────────────────────────────┐
    │                                                   │
    ▼ crew/admin updates                                │
[IN_PROGRESS] ──────────────────────────────────────────┤
    │                                                   │ (due date passes)
    ▼ crew/admin marks complete                         ▼
[COMPLETED] ◄───────────────────────────── [OVERDUE*]
                                            (non-compliant)
```
*OVERDUE is a computed state — the underlying status stays PENDING or IN_PROGRESS until manually updated, but the system flags it visually and in compliance calculations.

### Safety Drill Lifecycle

```
[SCHEDULED] ──(date arrives)──► [PAST]
                                   │
                    ┌──────────────┴───────────────┐
                    │                              │
              attendance exists?          no attendance records
                    │                              │
              [CONDUCTED]                      [MISSED*]
                                              (non-compliant)
```
*MISSED is computed at query time: `scheduledDate < now AND attendances.length == 0`

---

## Compliance Calculation

```
maintenanceRate   = (completedTasks / totalTasks) * 100
drillRate         = ((pastDrills - missedDrills) / pastDrills) * 100
overallCompliance = (maintenanceRate + drillRate) / 2

riskLevel:
  overallCompliance >= 80  →  LOW    (compliant)
  overallCompliance >= 60  →  MEDIUM (at risk)
  overallCompliance <  60  →  HIGH   (non-compliant)
```

Ships with HIGH risk are highlighted in the compliance dashboard for immediate attention.

---

## Notification Logic

The system generates alerts for:
| Condition | Severity |
|---|---|
| Task past due date, not completed | CRITICAL |
| Task due within 7 days, not completed | WARNING |
| Drill scheduled within 7 days | INFO |

Notifications are computed on demand (GET `/api/compliance/notifications`) and displayed in the header bell icon.

---

## Data Relationships

```
Ship  1──n  User (crew assignment)
Ship  1──n  MaintenanceTask
Ship  1──n  SafetyDrill

MaintenanceTask  1──n  TaskNote
MaintenanceTask  n──1  User (assignedTo)
MaintenanceTask  n──1  User (createdBy)

SafetyDrill  1──n  DrillAttendance
DrillAttendance  n──1  User
```

---

## Security Model

- All API routes require a valid JWT (except `/api/auth/login` and `/api/auth/register`)
- JWT payload: `{ userId, role, shipId }`
- Crew users: server enforces data scoping — tasks filtered by `assignedToId`, drills by `shipId`
- Admin-only endpoints: protected by `requireAdmin` middleware (returns 403 otherwise)
- Passwords hashed with bcrypt (12 salt rounds)
- Tokens expire in 24 hours
