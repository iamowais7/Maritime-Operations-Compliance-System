import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { shipsRouter } from './routes/ships';
import { usersRouter } from './routes/users';
import { maintenanceRouter } from './routes/maintenance';
import { drillsRouter } from './routes/drills';
import { complianceRouter } from './routes/compliance';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/ships', shipsRouter);
app.use('/api/users', usersRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/drills', drillsRouter);
app.use('/api/compliance', complianceRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Maritime API running on port ${PORT}`);
});

export default app;
