import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorizeRoles } from '../../shared/middleware/role.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { USER_ROLES } from '../users/user.types';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from './category.controller';
import { createCategorySchema, updateCategorySchema } from './category.validation';

const categoryRoutes = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories
 *     description: Returns all categories in deterministic name order. Public access.
 *     responses:
 *       '200':
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryListResponse'
 *             example:
 *               success: true
 *               message: Categories retrieved successfully
 *               data:
 *                 - id: 665f1b2c9a1b2c3d4e5f6789
 *                   name: Electronics
 *                   parentId: null
 *                   ancestors: []
 *                   createdAt: '2026-01-01T10:00:00.000Z'
 *                   updatedAt: '2026-01-01T10:00:00.000Z'
 *                 - id: 665f1b2c9a1b2c3d4e5f6790
 *                   name: Mobiles
 *                   parentId: 665f1b2c9a1b2c3d4e5f6789
 *                   ancestors:
 *                     - 665f1b2c9a1b2c3d4e5f6789
 *                   createdAt: '2026-01-02T10:00:00.000Z'
 *                   updatedAt: '2026-01-02T10:00:00.000Z'
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
categoryRoutes.get('/', listCategories);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category by ID
 *     description: Returns a single category by its MongoDB ObjectId. Public access.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB category ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       '200':
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *             example:
 *               success: true
 *               message: Category retrieved successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6789
 *                 name: Electronics
 *                 parentId: null
 *                 ancestors: []
 *                 createdAt: '2026-01-01T10:00:00.000Z'
 *                 updatedAt: '2026-01-01T10:00:00.000Z'
 *       '404':
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 *               error:
 *                 code: CATEGORY_NOT_FOUND
 *       '422':
 *         description: Category ID validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'id: Category ID must be a valid MongoDB ObjectId'
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
categoryRoutes.get('/:id', getCategory);

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     description: >-
 *       Creates a root category when parentId is omitted or null. When parentId
 *       is provided, the parent must exist and the server calculates the
 *       ancestors array from the parent hierarchy. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *           examples:
 *             root:
 *               summary: Root category
 *               value:
 *                 name: Electronics
 *                 parentId: null
 *             child:
 *               summary: Child category
 *               value:
 *                 name: Mobiles
 *                 parentId: 665f1b2c9a1b2c3d4e5f6789
 *     responses:
 *       '201':
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *             example:
 *               success: true
 *               message: Category created successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6790
 *                 name: Mobiles
 *                 parentId: 665f1b2c9a1b2c3d4e5f6789
 *                 ancestors:
 *                   - 665f1b2c9a1b2c3d4e5f6789
 *                 createdAt: '2026-01-02T10:00:00.000Z'
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
 *         description: Parent category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Parent category not found
 *               error:
 *                 code: CATEGORY_NOT_FOUND
 *       '422':
 *         description: Request validation failed, including client-supplied ancestors or other unexpected properties
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'Unrecognized key: "ancestors"'
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
categoryRoutes.post(
  '/',
  authenticate,
  authorizeRoles(USER_ROLES.ADMIN),
  validateBody(createCategorySchema),
  createCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category name
 *     description: >-
 *       Updates only the category name. Parent reassignment is not supported in
 *       this phase. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB category ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCategoryRequest'
 *           example:
 *             name: Consumer Electronics
 *     responses:
 *       '200':
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *             example:
 *               success: true
 *               message: Category updated successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6789
 *                 name: Consumer Electronics
 *                 parentId: null
 *                 ancestors: []
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
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 *               error:
 *                 code: CATEGORY_NOT_FOUND
 *       '422':
 *         description: Category ID or request body validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'name: Category name must be at least 2 characters long'
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
categoryRoutes.patch(
  '/:id',
  authenticate,
  authorizeRoles(USER_ROLES.ADMIN),
  validateBody(updateCategorySchema),
  updateCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     description: >-
 *       Deletes a category only when it has no child categories. Child categories
 *       are never cascade-deleted. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB category ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       '200':
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *             example:
 *               success: true
 *               message: Category deleted successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6789
 *                 name: Electronics
 *                 parentId: null
 *                 ancestors: []
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
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 *               error:
 *                 code: CATEGORY_NOT_FOUND
 *       '409':
 *         description: Category has child categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category has child categories and cannot be deleted
 *               error:
 *                 code: CATEGORY_HAS_CHILDREN
 *       '422':
 *         description: Category ID validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'id: Category ID must be a valid MongoDB ObjectId'
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
categoryRoutes.delete(
  '/:id',
  authenticate,
  authorizeRoles(USER_ROLES.ADMIN),
  deleteCategory
);

export default categoryRoutes;
