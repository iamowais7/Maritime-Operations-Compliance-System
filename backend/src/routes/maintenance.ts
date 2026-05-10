import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

export const maintenanceRouter = Router();
maintenanceRouter.use(authenticate);

maintenanceRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { shipId, status, assignedToId, priority } = req.query;

  const where: Record<string, unknown> = {};
  if (shipId) where.shipId = shipId;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (req.user!.role === 'CREW') {
    where.assignedToId = req.user!.userId;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  const tasks = await prisma.maintenanceTask.findMany({
    where,
    include: {
      ship: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      notes: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  const now = new Date();
  const enriched = tasks.map(t => ({
    ...t,
    isOverdue: t.status !== 'COMPLETED' && new Date(t.dueDate) < now,
  }));

  res.json(enriched);
});

maintenanceRouter.get('/overdue', authenticate, async (req: Request, res: Response): Promise<void> => {
  const where: Record<string, unknown> = {
    status: { not: 'COMPLETED' },
    dueDate: { lt: new Date() },
  };
  if (req.user!.role === 'CREW') where.assignedToId = req.user!.userId;

  const tasks = await prisma.maintenanceTask.findMany({
    where,
    include: {
      ship: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
  });
  res.json(tasks);
});

maintenanceRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const task = await prisma.maintenanceTask.findUnique({
    where: { id: req.params.id },
    include: {
      ship: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      notes: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json({ ...task, isOverdue: task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date() });
});

maintenanceRouter.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { title, description, shipId, assignedToId, dueDate, priority } = req.body;
  if (!title || !description || !shipId || !dueDate) {
    res.status(400).json({ error: 'title, description, shipId and dueDate are required' });
    return;
  }
  const task = await prisma.maintenanceTask.create({
    data: {
      title, description, shipId,
      assignedToId: assignedToId || null,
      createdById: req.user!.userId,
      dueDate: new Date(dueDate),
      priority: priority || 'MEDIUM',
    },
    include: {
      ship: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(task);
});

maintenanceRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { title, description, status, assignedToId, dueDate, priority } = req.body;
  const task = await prisma.maintenanceTask.findUnique({ where: { id: req.params.id } });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  if (req.user!.role === 'CREW' && task.assignedToId !== req.user!.userId) {
    res.status(403).json({ error: 'Not authorized to update this task' });
    return;
  }

  const crewAllowedFields = ['status'];
  const updateData: Record<string, unknown> = {};

  if (req.user!.role === 'ADMIN') {
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (priority !== undefined) updateData.priority = priority;
  }

  if (status !== undefined) {
    if (req.user!.role === 'CREW' && !crewAllowedFields.includes('status')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    updateData.status = status;
    if (status === 'COMPLETED') updateData.completedAt = new Date();
    else updateData.completedAt = null;
  }

  const updated = await prisma.maintenanceTask.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      ship: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      notes: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  res.json(updated);
});

maintenanceRouter.post('/:id/notes', async (req: Request, res: Response): Promise<void> => {
  const { note } = req.body;
  if (!note) { res.status(400).json({ error: 'note is required' }); return; }

  const task = await prisma.maintenanceTask.findUnique({ where: { id: req.params.id } });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  if (req.user!.role === 'CREW' && task.assignedToId !== req.user!.userId) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  const created = await prisma.taskNote.create({
    data: { taskId: req.params.id, userId: req.user!.userId, note },
    include: { user: { select: { id: true, name: true } } },
  });
  res.status(201).json(created);
});

maintenanceRouter.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  await prisma.maintenanceTask.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
