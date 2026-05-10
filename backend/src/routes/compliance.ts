import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate } from '../middleware/auth';

export const complianceRouter = Router();
complianceRouter.use(authenticate);

complianceRouter.get('/summary', async (req: Request, res: Response): Promise<void> => {
  const { shipId } = req.query;
  const now = new Date();

  const taskWhere: Record<string, unknown> = {};
  const drillWhere: Record<string, unknown> = {};

  if (shipId) {
    taskWhere.shipId = shipId;
    drillWhere.shipId = shipId;
  }
  if (req.user!.role === 'CREW') {
    taskWhere.assignedToId = req.user!.userId;
    if (req.user!.shipId) drillWhere.shipId = req.user!.shipId;
  }

  const [allTasks, allDrills] = await Promise.all([
    prisma.maintenanceTask.findMany({ where: taskWhere }),
    prisma.safetyDrill.findMany({
      where: drillWhere,
      include: { attendances: true },
    }),
  ]);

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
  const pendingTasks = allTasks.filter(t => t.status === 'PENDING').length;
  const inProgressTasks = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const overdueTasks = allTasks.filter(
    t => t.status !== 'COMPLETED' && new Date(t.dueDate) < now
  ).length;

  const pastDrills = allDrills.filter(d => new Date(d.scheduledDate) <= now);
  const upcomingDrills = allDrills.filter(d => new Date(d.scheduledDate) > now);
  const totalPastDrills = pastDrills.length;
  const missedDrills = pastDrills.filter(d => d.attendances.length === 0).length;
  const completedDrills = pastDrills.filter(d => d.attendances.some(a => a.attended)).length;

  const maintenanceCompliance = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 100;

  const drillCompliance = totalPastDrills > 0
    ? Math.round(((totalPastDrills - missedDrills) / totalPastDrills) * 100)
    : 100;

  const overallCompliance = Math.round((maintenanceCompliance + drillCompliance) / 2);

  res.json({
    maintenance: {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      overdue: overdueTasks,
      complianceRate: maintenanceCompliance,
    },
    drills: {
      total: allDrills.length,
      past: totalPastDrills,
      upcoming: upcomingDrills.length,
      completed: completedDrills,
      missed: missedDrills,
      complianceRate: drillCompliance,
    },
    overall: {
      complianceRate: overallCompliance,
      isCompliant: overallCompliance >= 80,
      riskLevel: overallCompliance >= 80 ? 'LOW' : overallCompliance >= 60 ? 'MEDIUM' : 'HIGH',
    },
  });
});

complianceRouter.get('/ships', async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const ships = await prisma.ship.findMany({
    include: {
      maintenanceTasks: true,
      safetyDrills: { include: { attendances: true } },
    },
  });

  const result = ships.map(ship => {
    const totalTasks = ship.maintenanceTasks.length;
    const completedTasks = ship.maintenanceTasks.filter(t => t.status === 'COMPLETED').length;
    const overdueTasks = ship.maintenanceTasks.filter(
      t => t.status !== 'COMPLETED' && new Date(t.dueDate) < now
    ).length;

    const pastDrills = ship.safetyDrills.filter(d => new Date(d.scheduledDate) <= now);
    const missedDrills = pastDrills.filter(d => d.attendances.length === 0).length;

    const maintenanceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
    const drillRate = pastDrills.length > 0
      ? Math.round(((pastDrills.length - missedDrills) / pastDrills.length) * 100)
      : 100;
    const overallRate = Math.round((maintenanceRate + drillRate) / 2);

    return {
      shipId: ship.id,
      shipName: ship.name,
      imoNumber: ship.imoNumber,
      maintenanceCompliance: maintenanceRate,
      drillCompliance: drillRate,
      overallCompliance: overallRate,
      overdueTasks,
      missedDrills,
      riskLevel: overallRate >= 80 ? 'LOW' : overallRate >= 60 ? 'MEDIUM' : 'HIGH',
    };
  });

  res.json(result);
});

complianceRouter.get('/trend', async (req: Request, res: Response): Promise<void> => {
  const { shipId } = req.query;
  const now = new Date();
  const months: { label: string; maintenanceRate: number; drillRate: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = start.toLocaleString('default', { month: 'short', year: '2-digit' });

    const taskWhere: Record<string, unknown> = { createdAt: { lte: end } };
    const drillWhere: Record<string, unknown> = { scheduledDate: { gte: start, lte: end } };
    if (shipId) { taskWhere.shipId = shipId; drillWhere.shipId = shipId; }

    const [tasks, drills] = await Promise.all([
      prisma.maintenanceTask.findMany({ where: taskWhere }),
      prisma.safetyDrill.findMany({ where: drillWhere, include: { attendances: true } }),
    ]);

    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const maintenanceRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 100;
    const missedDrills = drills.filter(d => d.attendances.length === 0).length;
    const drillRate = drills.length > 0
      ? Math.round(((drills.length - missedDrills) / drills.length) * 100)
      : 100;

    months.push({ label, maintenanceRate, drillRate });
  }

  res.json(months);
});

complianceRouter.get('/notifications', async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const taskWhere: Record<string, unknown> = {
    status: { not: 'COMPLETED' },
    dueDate: { lte: in7Days },
  };
  if (req.user!.role === 'CREW') taskWhere.assignedToId = req.user!.userId;

  const drillWhere: Record<string, unknown> = {
    scheduledDate: { lte: in7Days, gte: now },
  };
  if (req.user!.role === 'CREW' && req.user!.shipId) drillWhere.shipId = req.user!.shipId;

  const [urgentTasks, upcomingDrills] = await Promise.all([
    prisma.maintenanceTask.findMany({
      where: taskWhere,
      include: { ship: { select: { name: true } }, assignedTo: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    prisma.safetyDrill.findMany({
      where: drillWhere,
      include: { ship: { select: { name: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    }),
  ]);

  const notifications = [
    ...urgentTasks.map(t => ({
      id: t.id,
      type: 'MAINTENANCE' as const,
      severity: new Date(t.dueDate) < now ? 'CRITICAL' : 'WARNING',
      title: `${new Date(t.dueDate) < now ? 'OVERDUE' : 'Due Soon'}: ${t.title}`,
      message: `Task on ${t.ship.name} ${new Date(t.dueDate) < now ? 'was due' : 'is due'} ${new Date(t.dueDate).toLocaleDateString()}`,
      dueDate: t.dueDate,
    })),
    ...upcomingDrills.map(d => ({
      id: d.id,
      type: 'DRILL' as const,
      severity: 'INFO',
      title: `Upcoming Drill: ${d.title}`,
      message: `Scheduled on ${new Date(d.scheduledDate).toLocaleDateString()} for ${d.ship.name}`,
      dueDate: d.scheduledDate,
    })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  res.json(notifications);
});
