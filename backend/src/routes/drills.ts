import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

export const drillsRouter = Router();
drillsRouter.use(authenticate);

drillsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { shipId, type, upcoming } = req.query;
  const where: Record<string, unknown> = {};

  if (req.user!.role === 'CREW' && req.user!.shipId) {
    where.shipId = req.user!.shipId;
  } else if (shipId) {
    where.shipId = shipId;
  }

  if (type) where.type = type;
  if (upcoming === 'true') where.scheduledDate = { gte: new Date() };

  const drills = await prisma.safetyDrill.findMany({
    where,
    include: {
      ship: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      attendances: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { scheduledDate: 'asc' },
  });

  const now = new Date();
  const enriched = drills.map(d => ({
    ...d,
    isMissed: new Date(d.scheduledDate) < now && d.attendances.length === 0,
    totalAttended: d.attendances.filter(a => a.attended).length,
    totalCrew: d.attendances.length,
  }));

  res.json(enriched);
});

drillsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const drill = await prisma.safetyDrill.findUnique({
    where: { id: req.params.id },
    include: {
      ship: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      attendances: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!drill) { res.status(404).json({ error: 'Drill not found' }); return; }
  res.json(drill);
});

drillsRouter.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { title, type, shipId, scheduledDate, description } = req.body;
  if (!title || !type || !shipId || !scheduledDate) {
    res.status(400).json({ error: 'title, type, shipId and scheduledDate are required' });
    return;
  }
  const drill = await prisma.safetyDrill.create({
    data: {
      title, type, shipId,
      scheduledDate: new Date(scheduledDate),
      createdById: req.user!.userId,
      description: description || '',
    },
    include: {
      ship: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(drill);
});

drillsRouter.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { title, type, scheduledDate, description } = req.body;
  const drill = await prisma.safetyDrill.update({
    where: { id: req.params.id },
    data: {
      title, type,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      description,
    },
    include: { ship: { select: { id: true, name: true } } },
  });
  res.json(drill);
});

drillsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  await prisma.safetyDrill.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

drillsRouter.post('/:id/attendance', async (req: Request, res: Response): Promise<void> => {
  const { attended, notes } = req.body;
  const drill = await prisma.safetyDrill.findUnique({ where: { id: req.params.id } });
  if (!drill) { res.status(404).json({ error: 'Drill not found' }); return; }

  const attendance = await prisma.drillAttendance.upsert({
    where: { drillId_userId: { drillId: req.params.id, userId: req.user!.userId } },
    update: {
      attended: attended ?? true,
      notes: notes || '',
      completedAt: attended ? new Date() : null,
    },
    create: {
      drillId: req.params.id,
      userId: req.user!.userId,
      attended: attended ?? true,
      notes: notes || '',
      completedAt: attended ? new Date() : null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  res.json(attendance);
});

drillsRouter.get('/:id/attendance', async (req: Request, res: Response): Promise<void> => {
  const attendances = await prisma.drillAttendance.findMany({
    where: { drillId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json(attendances);
});
