import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, shipId: true, ship: { select: { id: true, name: true } }, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

usersRouter.get('/crew', async (req: Request, res: Response): Promise<void> => {
  const { shipId } = req.query;
  const where: { role: 'CREW'; shipId?: string } = { role: 'CREW' };
  if (shipId) where.shipId = shipId as string;
  const crew = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, shipId: true, ship: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(crew);
});

usersRouter.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, email, role, shipId, password } = req.body;
  const data: Record<string, unknown> = { name, email, role, shipId: shipId || null };
  if (password) data.passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, shipId: true },
  });
  res.json(user);
});

usersRouter.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
