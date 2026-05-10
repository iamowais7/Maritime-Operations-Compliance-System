import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

export const shipsRouter = Router();
shipsRouter.use(authenticate);

shipsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const ships = await prisma.ship.findMany({
    include: {
      _count: { select: { crew: true, maintenanceTasks: true, safetyDrills: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(ships);
});

shipsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const ship = await prisma.ship.findUnique({
    where: { id: req.params.id },
    include: {
      crew: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { maintenanceTasks: true, safetyDrills: true } },
    },
  });
  if (!ship) { res.status(404).json({ error: 'Ship not found' }); return; }
  res.json(ship);
});

shipsRouter.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, imoNumber, type, flag } = req.body;
  if (!name || !imoNumber || !type) {
    res.status(400).json({ error: 'name, imoNumber and type are required' });
    return;
  }
  try {
    const ship = await prisma.ship.create({ data: { name, imoNumber, type, flag: flag || 'Unknown' } });
    res.status(201).json(ship);
  } catch {
    res.status(409).json({ error: 'IMO number already exists' });
  }
});

shipsRouter.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, type, flag } = req.body;
  const ship = await prisma.ship.update({
    where: { id: req.params.id },
    data: { name, type, flag },
  });
  res.json(ship);
});

shipsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  await prisma.ship.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
