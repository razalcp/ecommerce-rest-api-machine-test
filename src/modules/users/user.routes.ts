import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorizeRoles } from '../../shared/middleware/role.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import {
  getProfile,
  listUsers,
  updateProfile,
  updateUserStatus,
} from './user.controller';
import { USER_ROLES } from './user.types';
import { updateProfileSchema, updateUserStatusSchema } from './user.validation';

const userRoutes = Router();

userRoutes.use(authenticate);

/**
 * @openapi
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get the authenticated user's profile
 *     description: Returns the profile of the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *             example:
 *               success: true
 *               message: Profile retrieved successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6789
 *                 fullName: Jane Doe
 *                 email: jane@example.com
 *                 role: CUSTOMER
 *                 isActive: true
 *                 createdAt: '2026-01-01T10:00:00.000Z'
 *                 updatedAt: '2026-01-01T10:00:00.000Z'
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
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: User not found
 *               error:
 *                 code: USER_NOT_FOUND
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
userRoutes.get('/profile', getProfile);

/**
 * @openapi
 * /users/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Update the authenticated user's profile
 *     description: Updates the current user's full name. Email, role, and account status cannot be changed here.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             fullName: Jane Smith
 *     responses:
 *       '200':
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *             example:
 *               success: true
 *               message: Profile updated successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6789
 *                 fullName: Jane Smith
 *                 email: jane@example.com
 *                 role: CUSTOMER
 *                 isActive: true
 *                 createdAt: '2026-01-01T10:00:00.000Z'
 *                 updatedAt: '2026-01-02T10:00:00.000Z'
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
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: User not found
 *               error:
 *                 code: USER_NOT_FOUND
 *       '422':
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'fullName: Full name must be at least 2 characters long'
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
userRoutes.patch('/profile', validateBody(updateProfileSchema), updateProfile);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     description: Returns a paginated list of users. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         description: Case-insensitive search across full name and email.
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, CUSTOMER]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       '200':
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListResponse'
 *             example:
 *               success: true
 *               message: Users retrieved successfully
 *               data:
 *                 users:
 *                   - id: 665f1b2c9a1b2c3d4e5f6789
 *                     fullName: Jane Doe
 *                     email: jane@example.com
 *                     role: CUSTOMER
 *                     isActive: true
 *                     createdAt: '2026-01-01T10:00:00.000Z'
 *                     updatedAt: '2026-01-01T10:00:00.000Z'
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
 *               message: 'limit: Limit must not exceed 50'
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
userRoutes.get('/', authorizeRoles(USER_ROLES.ADMIN), listUsers);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user
 *     description: Updates a user's account status, increments their token version, and revokes all refresh-token sessions. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB user ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserStatusRequest'
 *           example:
 *             isActive: false
 *     responses:
 *       '200':
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *             example:
 *               success: true
 *               message: User status updated successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6789
 *                 fullName: Jane Doe
 *                 email: jane@example.com
 *                 role: CUSTOMER
 *                 isActive: false
 *                 createdAt: '2026-01-01T10:00:00.000Z'
 *                 updatedAt: '2026-01-02T10:00:00.000Z'
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: User not found
 *               error:
 *                 code: USER_NOT_FOUND
 *       '422':
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'isActive: isActive must be a boolean'
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
userRoutes.patch(
  '/:id/status',
  authorizeRoles(USER_ROLES.ADMIN),
  validateBody(updateUserStatusSchema),
  updateUserStatus
);

export default userRoutes;
