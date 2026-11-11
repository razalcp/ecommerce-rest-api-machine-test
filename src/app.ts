import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import authRoutes from './modules/auth/auth.routes';
import categoryRoutes from './modules/categories/category.routes';
import healthRoutes from './modules/health/health.routes';
import publicProductRoutes from './modules/products/product.public.routes';
import productRoutes from './modules/products/product.routes';
import userRoutes from './modules/users/user.routes';
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
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', publicProductRoutes);
app.use('/api/v1/admin/products', productRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
