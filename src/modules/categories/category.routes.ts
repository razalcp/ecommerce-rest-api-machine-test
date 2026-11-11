import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorizeRoles } from '../../shared/middleware/role.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { USER_ROLES } from '../users/user.types';
import {
  createCategory,
  deleteCategory,
  getCategory,
  getCategoryTree,
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
 * /categories/tree:
 *   get:
 *     tags: [Categories]
 *     summary: Get the category hierarchy
 *     description: >-
 *       Returns all categories as a nested tree with root categories at the top
 *       level. Siblings are ordered alphabetically by name. Public access.
 *     responses:
 *       '200':
 *         description: Category hierarchy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryTreeResponse'
 *             example:
 *               success: true
 *               message: Category hierarchy retrieved successfully
 *               data:
 *                 categories:
 *                   - id: 665f1b2c9a1b2c3d4e5f6789
 *                     name: Electronics
 *                     parentId: null
 *                     children:
 *                       - id: 665f1b2c9a1b2c3d4e5f6790
 *                         name: Mobiles
 *                         parentId: 665f1b2c9a1b2c3d4e5f6789
 *                         children: []
 *       '500':
 *         description: Unexpected server error or category hierarchy integrity failure
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
categoryRoutes.get('/tree', getCategoryTree);

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
 *     summary: Update a category
 *     description: >-
 *       Updates the category name, parent, or both. Moving a category to a new
 *       parent recalculates the ancestors of the category and all of its
 *       descendants. Set parentId to null to move the category to the root.
 *       Admin access only.
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
 *           examples:
 *             nameOnly:
 *               summary: Rename a category
 *               value:
 *                 name: Consumer Electronics
 *             moveToParent:
 *               summary: Move a category under another category
 *               value:
 *                 parentId: 665f1b2c9a1b2c3d4e5f6791
 *             moveToRoot:
 *               summary: Move a category to the root
 *               value:
 *                 parentId: null
 *             combined:
 *               summary: Rename and move a category
 *               value:
 *                 name: Smartphones
 *                 parentId: 665f1b2c9a1b2c3d4e5f6792
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
 *         description: Category or requested parent category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Parent category not found
 *               error:
 *                 code: CATEGORY_NOT_FOUND
 *       '400':
 *         description: A category cannot be its own parent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: A category cannot be its own parent
 *               error:
 *                 code: INVALID_CATEGORY_PARENT
 *       '409':
 *         description: A category cannot be moved under one of its descendants
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: A category cannot be moved under one of its descendants
 *               error:
 *                 code: CIRCULAR_CATEGORY_REFERENCE
 *       '422':
 *         description: Category ID or request body validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: At least one of name or parentId must be provided
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
