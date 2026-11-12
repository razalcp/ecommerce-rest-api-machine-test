import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorizeRoles } from '../../shared/middleware/role.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { USER_ROLES } from '../users/user.types';
import { createOrder } from './order.controller';
import { createOrderSchema } from './order.validation';

const orderRoutes = Router();

orderRoutes.use(authenticate);
orderRoutes.use(authorizeRoles(USER_ROLES.CUSTOMER));

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create an order
 *     description: >-
 *       Creates an order for the authenticated CUSTOMER. The request must contain only
 *       product IDs and quantities; the customer identity is taken exclusively from the
 *       JWT access token. The server reads the current product name, SKU, and effective
 *       selling price (salePrice when present, otherwise price), converts all monetary
 *       values to integer paise, and stores immutable product snapshots on the order.
 *       Prices, totals, currency, status, and inventory status cannot be supplied by the
 *       client. Duplicate product IDs are aggregated before stock is reserved, so a
 *       product is deducted only once per order. A maximum of 50 submitted lines is
 *       accepted, and the aggregated quantity per product must not exceed 1000.
 *       Stock is reserved with atomic conditional updates. If a later reservation or
 *       order persistence fails, earlier reservations are compensated. Compensation is
 *       not equivalent to a database transaction: a process crash between stock deduction
 *       and compensation can leave partial deductions without a persisted order.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *           examples:
 *             multipleProducts:
 *               summary: Checkout with multiple products
 *               value:
 *                 items:
 *                   - productId: 665f1b2c9a1b2c3d4e5f6795
 *                     quantity: 2
 *                   - productId: 665f191e810c19729de860ea
 *                     quantity: 1
 *             duplicateProductLines:
 *               summary: Duplicate product IDs are aggregated into one line
 *               value:
 *                 items:
 *                   - productId: 665f1b2c9a1b2c3d4e5f6795
 *                     quantity: 2
 *                   - productId: 665f1b2c9a1b2c3d4e5f6795
 *                     quantity: 3
 *     responses:
 *       '201':
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *             example:
 *               success: true
 *               message: Order created successfully
 *               data:
 *                 order:
 *                   id: 665f1b2c9a1b2c3d4e5f6800
 *                   items:
 *                     - productId: 665f1b2c9a1b2c3d4e5f6795
 *                       name: Samsung Galaxy S24
 *                       sku: SAMSUNG-S24
 *                       quantity: 2
 *                       unitPrice: 74999.99
 *                       lineTotal: 149999.98
 *                   subtotal: 149999.98
 *                   total: 149999.98
 *                   currency: INR
 *                   status: PENDING
 *                   createdAt: '2026-11-12T10:00:00.000Z'
 *       '401':
 *         description: Authentication required, invalid or expired token, inactive account, or stale token version
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Authentication required
 *               error:
 *                 code: AUTHENTICATION_REQUIRED
 *       '403':
 *         description: Customer access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: You do not have permission to perform this action
 *               error:
 *                 code: FORBIDDEN
 *       '404':
 *         description: A requested product is missing or inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Product is not available
 *               error:
 *                 code: PRODUCT_NOT_AVAILABLE
 *       '409':
 *         description: Stock is insufficient for one or more requested products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Insufficient stock for one or more products
 *               error:
 *                 code: INSUFFICIENT_STOCK
 *       '422':
 *         description: Request validation failed or aggregated quantity exceeds the per-product limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation:
 *                 summary: Unsupported field or invalid quantity
 *                 value:
 *                   success: false
 *                   message: 'items.0.price: Unrecognized key'
 *                   error:
 *                     code: VALIDATION_ERROR
 *               aggregatedQuantity:
 *                 summary: Duplicate product quantities exceed 1000
 *                 value:
 *                   success: false
 *                   message: Aggregated quantity for a product must not exceed 1000
 *                   error:
 *                     code: VALIDATION_ERROR
 *       '500':
 *         description: Unexpected persistence failure or failed stock compensation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               persistenceFailure:
 *                 summary: Order persistence failed
 *                 value:
 *                   success: false
 *                   message: Order checkout failed
 *                   error:
 *                     code: INTERNAL_SERVER_ERROR
 *               compensationFailure:
 *                 summary: Stock compensation failed
 *                 value:
 *                   success: false
 *                   message: Order checkout could not be completed safely
 *                   error:
 *                     code: CHECKOUT_COMPENSATION_FAILED
 */
orderRoutes.post('/', validateBody(createOrderSchema), createOrder);

export default orderRoutes;
