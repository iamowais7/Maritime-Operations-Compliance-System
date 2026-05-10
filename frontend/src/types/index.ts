export type Role = 'ADMIN' | 'CREW';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type DrillType = 'FIRE_DRILL' | 'EVACUATION' | 'MAN_OVERBOARD' | 'LIFEBOAT' | 'OIL_SPILL' | 'EMERGENCY_STEERING' | 'ABANDON_SHIP';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  shipId?: string | null;
  ship?: { id: string; name: string } | null;
  createdAt?: string;
}

export interface Ship {
  id: string;
  name: string;
  imoNumber: string;
  type: string;
  flag: string;
  createdAt: string;
  _count?: { crew: number; maintenanceTasks: number; safetyDrills: number };
}

export interface TaskNote {
  id: string;
  note: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  shipId: string;
  assignedToId?: string | null;
  createdById: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  completedAt?: string | null;
  createdAt: string;
  isOverdue?: boolean;
  ship: { id: string; name: string };
  assignedTo?: { id: string; name: string; email: string } | null;
  createdBy?: { id: string; name: string };
  notes?: TaskNote[];
}

export interface SafetyDrill {
  id: string;
  title: string;
  type: DrillType;
  shipId: string;
  scheduledDate: string;
  description: string;
  createdAt: string;
  isMissed?: boolean;
  totalAttended?: number;
  totalCrew?: number;
  ship: { id: string; name: string };
  createdBy?: { id: string; name: string };
  attendances?: DrillAttendance[];
}

export interface DrillAttendance {
  id: string;
  drillId: string;
  userId: string;
  attended: boolean;
  completedAt?: string | null;
  notes?: string;
  user: { id: string; name: string; email?: string };
}

export interface ComplianceSummary {
  maintenance: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    overdue: number;
    complianceRate: number;
  };
  drills: {
    total: number;
    past: number;
    upcoming: number;
    completed: number;
    missed: number;
    complianceRate: number;
  };
  overall: {
    complianceRate: number;
    isCompliant: boolean;
    riskLevel: RiskLevel;
  };
}

export interface ShipCompliance {
  shipId: string;
  shipName: string;
  imoNumber: string;
  maintenanceCompliance: number;
  drillCompliance: number;
  overallCompliance: number;
  overdueTasks: number;
  missedDrills: number;
  riskLevel: RiskLevel;
}

export interface Notification {
  id: string;
  type: 'MAINTENANCE' | 'DRILL';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  dueDate: string;
}

export interface TrendPoint {
  label: string;
  maintenanceRate: number;
  drillRate: number;
}
