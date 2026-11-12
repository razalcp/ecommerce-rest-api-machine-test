import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorizeRoles } from '../../shared/middleware/role.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { USER_ROLES } from '../users/user.types';
import {
  getAdminOrder,
  listAdminOrders,
  updateAdminOrderStatus,
} from './order.admin.controller';
import { updateOrderStatusSchema } from './order.validation';

const orderAdminRoutes = Router();

orderAdminRoutes.use(authenticate);
orderAdminRoutes.use(authorizeRoles(USER_ROLES.ADMIN));

/**
 * @openapi
 * /admin/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List all orders
 *     description: >-
 *       Returns a paginated list of all orders for ADMIN users. Results can be filtered by
 *       order status and customerId and are sorted by creation date, newest first. Admin
 *       responses include the customer ID and internal inventory status. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Page number, starting at 1.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: Number of orders per page.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: status
 *         description: Filter by order status.
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
 *       - in: query
 *         name: customerId
 *         description: Filter by customer MongoDB ObjectId.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       '200':
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminOrderListResponse'
 *             example:
 *               success: true
 *               message: Orders retrieved successfully
 *               data:
 *                 orders:
 *                   - id: 665f1b2c9a1b2c3d4e5f6800
 *                     customerId: 665f1b2c9a1b2c3d4e5f6789
 *                     items:
 *                       - productId: 665f1b2c9a1b2c3d4e5f6795
 *                         name: Samsung Galaxy S24
 *                         sku: SAMSUNG-S24
 *                         quantity: 2
 *                         unitPrice: 74999.99
 *                         lineTotal: 149999.98
 *                     subtotal: 149999.98
 *                     total: 149999.98
 *                     currency: INR
 *                     status: PENDING
 *                     inventoryStatus: RESERVED
 *                     createdAt: '2026-11-12T10:00:00.000Z'
 *                     updatedAt: '2026-11-12T10:00:00.000Z'
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 1
 *                   totalPages: 1
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
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: You do not have permission to perform this action
 *               error:
 *                 code: FORBIDDEN
 *       '422':
 *         description: Query validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'status: Status is not a supported order status'
 *               error:
 *                 code: VALIDATION_ERROR
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
orderAdminRoutes.get('/', listAdminOrders);

/**
 * @openapi
 * /admin/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get an order by ID
 *     description: >-
 *       Returns a single order by its MongoDB ObjectId. Admin responses include the customer
 *       ID and internal inventory status. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB order ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       '200':
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminOrderResponse'
 *             example:
 *               success: true
 *               message: Order retrieved successfully
 *               data:
 *                 order:
 *                   id: 665f1b2c9a1b2c3d4e5f6800
 *                   customerId: 665f1b2c9a1b2c3d4e5f6789
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
 *                   status: CONFIRMED
 *                   inventoryStatus: RESERVED
 *                   createdAt: '2026-11-12T10:00:00.000Z'
 *                   updatedAt: '2026-11-12T11:00:00.000Z'
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
 *         description: Admin access required
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
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Order not found
 *               error:
 *                 code: ORDER_NOT_FOUND
 *       '422':
 *         description: Order ID validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'id: Order ID must be a valid MongoDB ObjectId'
 *               error:
 *                 code: VALIDATION_ERROR
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
orderAdminRoutes.get('/:id', getAdminOrder);

/**
 * @openapi
 * /admin/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Transition an order status or cancel an order
 *     description: >-
 *       Applies an allowed order status transition. Allowed transitions are
 *       PENDING to CONFIRMED or CANCELLED, CONFIRMED to PROCESSING or CANCELLED,
 *       PROCESSING to SHIPPED or CANCELLED, and SHIPPED to DELIVERED. DELIVERED and
 *       CANCELLED are terminal. Invalid transitions return HTTP 409 with code
 *       INVALID_ORDER_STATUS_TRANSITION. Status changes are persisted with an atomic
 *       conditional update, so conflicting concurrent transitions cannot both succeed.
 *       Cancellation is allowed only from PENDING, CONFIRMED, or PROCESSING and restores
 *       reserved stock idempotently. If restoration is incomplete, the order remains
 *       CANCELLED with inventoryStatus RESTORING, HTTP 500 is returned, and the same
 *       cancellation request can be retried safely. Non-cancelled transitions never change
 *       inventory. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB order ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatusRequest'
 *           examples:
 *             confirm:
 *               summary: Confirm a pending order
 *               value:
 *                 status: CONFIRMED
 *             ship:
 *               summary: Ship a processing order
 *               value:
 *                 status: SHIPPED
 *             deliver:
 *               summary: Mark a shipped order as delivered
 *               value:
 *                 status: DELIVERED
 *             cancel:
 *               summary: Cancel an eligible order
 *               value:
 *                 status: CANCELLED
 *     responses:
 *       '200':
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminOrderResponse'
 *             examples:
 *               updated:
 *                 summary: Non-cancellation transition
 *                 value:
 *                   success: true
 *                   message: Order status updated successfully
 *                   data:
 *                     order:
 *                       id: 665f1b2c9a1b2c3d4e5f6800
 *                       customerId: 665f1b2c9a1b2c3d4e5f6789
 *                       items:
 *                         - productId: 665f1b2c9a1b2c3d4e5f6795
 *                           name: Samsung Galaxy S24
 *                           sku: SAMSUNG-S24
 *                           quantity: 2
 *                           unitPrice: 74999.99
 *                           lineTotal: 149999.98
 *                       subtotal: 149999.98
 *                       total: 149999.98
 *                       currency: INR
 *                       status: CONFIRMED
 *                       inventoryStatus: RESERVED
 *                       createdAt: '2026-11-12T10:00:00.000Z'
 *                       updatedAt: '2026-11-12T11:00:00.000Z'
 *               cancelled:
 *                 summary: Cancellation with inventory released
 *                 value:
 *                   success: true
 *                   message: Order cancelled successfully
 *                   data:
 *                     order:
 *                       id: 665f1b2c9a1b2c3d4e5f6800
 *                       customerId: 665f1b2c9a1b2c3d4e5f6789
 *                       items:
 *                         - productId: 665f1b2c9a1b2c3d4e5f6795
 *                           name: Samsung Galaxy S24
 *                           sku: SAMSUNG-S24
 *                           quantity: 2
 *                           unitPrice: 74999.99
 *                           lineTotal: 149999.98
 *                       subtotal: 149999.98
 *                       total: 149999.98
 *                       currency: INR
 *                       status: CANCELLED
 *                       inventoryStatus: RELEASED
 *                       createdAt: '2026-11-12T10:00:00.000Z'
 *                       updatedAt: '2026-11-12T11:00:00.000Z'
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
 *         description: Admin access required
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
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Order not found
 *               error:
 *                 code: ORDER_NOT_FOUND
 *       '409':
 *         description: Invalid order status transition or a conflicting concurrent status change
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidTransition:
 *                 summary: Delivered orders cannot be cancelled
 *                 value:
 *                   success: false
 *                   message: Cannot change order status from DELIVERED to CANCELLED
 *                   error:
 *                     code: INVALID_ORDER_STATUS_TRANSITION
 *               conflict:
 *                 summary: Another request changed the order status first
 *                 value:
 *                   success: false
 *                   message: Order status changed concurrently. Please retry.
 *                   error:
 *                     code: ORDER_STATUS_CONFLICT
 *       '422':
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'status: Status must be a supported order status other than PENDING'
 *               error:
 *                 code: VALIDATION_ERROR
 *       '500':
 *         description: Unexpected persistence failure or incomplete inventory restoration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               persistenceFailure:
 *                 summary: Unexpected server failure
 *                 value:
 *                   success: false
 *                   message: Internal server error
 *                   error:
 *                     code: INTERNAL_SERVER_ERROR
 *               restorationFailure:
 *                 summary: Cancellation saved, inventory restoration must be retried
 *                 value:
 *                   success: false
 *                   message: Order was cancelled, but inventory restoration is incomplete. Please retry.
 *                   error:
 *                     code: INVENTORY_RESTORATION_FAILED
 */
orderAdminRoutes.patch(
  '/:id/status',
  validateBody(updateOrderStatusSchema),
  updateAdminOrderStatus
);

export default orderAdminRoutes;
