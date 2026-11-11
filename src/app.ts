import express, { Application } from 'express';
import healthRoutes from './modules/health/health.routes';

const app: Application = express();

app.use(express.json());

app.use('/api/v1/health', healthRoutes);

export default app;
