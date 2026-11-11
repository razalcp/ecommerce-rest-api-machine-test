import { Router } from 'express';
import { getHealth } from './health.controller';

const healthRoutes = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check service health
 *     description: Returns a simple health response when the API is running.
 *     responses:
 *       '200':
 *         description: Service is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               success: true
 *               message: E-commerce API is running
 *               data:
 *                 service: ecommerce-rest-api
 *       '500':
 *         description: Unexpected server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Internal server error
 *               error:
 *                 code: INTERNAL_SERVER_ERROR
 */
healthRoutes.get('/', getHealth);

export default healthRoutes;
