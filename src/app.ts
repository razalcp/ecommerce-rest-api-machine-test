import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import authRoutes from './modules/auth/auth.routes';
import healthRoutes from './modules/health/health.routes';
import { errorHandler } from './shared/middleware/error-handler.middleware';
import { notFoundHandler } from './shared/middleware/not-found.middleware';

const app: Application = express();

app.use(helmet());

const corsOrigin =
  env.CORS_ORIGIN === '*'
    ? '*'
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

app.use(cors({ origin: corsOrigin }));

app.use(express.json({ limit: '1mb' }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
