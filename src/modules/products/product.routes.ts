import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorizeRoles } from '../../shared/middleware/role.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { USER_ROLES } from '../users/user.types';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listAdminProducts,
  updateProduct,
} from './product.controller';
import { createProductSchema, updateProductSchema } from './product.validation';

const productRoutes = Router();

productRoutes.use(authenticate);
productRoutes.use(authorizeRoles(USER_ROLES.ADMIN));

/**
 * @openapi
 * /admin/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product
 *     description: >-
 *       Creates a product with an ACTIVE status by default. The SKU is normalized
 *       to uppercase, the category must exist, and salePrice must not exceed price.
 *       Admin access only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *           examples:
 *             smartphone:
 *               summary: Smartphone product
 *               value:
 *                 name: Samsung Galaxy S24
 *                 sku: SAMSUNG-S24
 *                 description: Samsung smartphone
 *                 price: 79999.99
 *                 salePrice: 74999.99
 *                 stock: 25
 *                 category: 665f1b2c9a1b2c3d4e5f6789
 *                 status: ACTIVE
 *     responses:
 *       '201':
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *             example:
 *               success: true
 *               message: Product created successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6795
 *                 name: Samsung Galaxy S24
 *                 sku: SAMSUNG-S24
 *                 description: Samsung smartphone
 *                 price: 79999.99
 *                 salePrice: 74999.99
 *                 stock: 25
 *                 category: 665f1b2c9a1b2c3d4e5f6789
 *                 status: ACTIVE
 *                 createdAt: '2026-11-11T10:00:00.000Z'
 *                 updatedAt: '2026-11-11T10:00:00.000Z'
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
 *         description: A product with the same SKU already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: A product with this SKU already exists
 *               error:
 *                 code: SKU_ALREADY_EXISTS
 *       '422':
 *         description: Request validation failed, including invalid price, sale price, stock, status, category ID, or unexpected properties
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation:
 *                 summary: Invalid request field
 *                 value:
 *                   success: false
 *                   message: 'price: Price must have at most two decimal places'
 *                   error:
 *                     code: VALIDATION_ERROR
 *               salePrice:
 *                 summary: Sale price exceeds price
 *                 value:
 *                   success: false
 *                   message: Sale price cannot be greater than price
 *                   error:
 *                     code: VALIDATION_ERROR
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
productRoutes.post('/', validateBody(createProductSchema), createProduct);

/**
 * @openapi
 * /admin/products:
 *   get:
 *     tags: [Products]
 *     summary: List all products
 *     description: >-
 *       Returns a paginated admin product list including both ACTIVE and INACTIVE
 *       products. Results are sorted by creation date, newest first. Admin access only.
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
 *         description: Number of products per page.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: status
 *         description: Filter by product status.
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *       - in: query
 *         name: category
 *         description: Filter by category MongoDB ObjectId.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       '200':
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListResponse'
 *             example:
 *               success: true
 *               message: Products retrieved successfully
 *               data:
 *                 products:
 *                   - id: 665f1b2c9a1b2c3d4e5f6795
 *                     name: Samsung Galaxy S24
 *                     sku: SAMSUNG-S24
 *                     description: Samsung smartphone
 *                     price: 79999.99
 *                     salePrice: 74999.99
 *                     stock: 25
 *                     category: 665f1b2c9a1b2c3d4e5f6789
 *                     status: ACTIVE
 *                     createdAt: '2026-11-11T10:00:00.000Z'
 *                     updatedAt: '2026-11-11T10:00:00.000Z'
 *                 total: 1
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
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
productRoutes.get('/', listAdminProducts);

/**
 * @openapi
 * /admin/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by ID
 *     description: Returns a single product by its MongoDB ObjectId. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB product ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       '200':
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *             example:
 *               success: true
 *               message: Product retrieved successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6795
 *                 name: Samsung Galaxy S24
 *                 sku: SAMSUNG-S24
 *                 description: Samsung smartphone
 *                 price: 79999.99
 *                 salePrice: 74999.99
 *                 stock: 25
 *                 category: 665f1b2c9a1b2c3d4e5f6789
 *                 status: ACTIVE
 *                 createdAt: '2026-11-11T10:00:00.000Z'
 *                 updatedAt: '2026-11-11T10:00:00.000Z'
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
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Product not found
 *               error:
 *                 code: PRODUCT_NOT_FOUND
 *       '422':
 *         description: Product ID validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'id: Product ID must be a valid MongoDB ObjectId'
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
productRoutes.get('/:id', getProduct);

/**
 * @openapi
 * /admin/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product
 *     description: >-
 *       Updates one or more product fields. The complete effective product state is
 *       validated, so changing price alone is rejected when the existing salePrice
 *       would exceed the new price. Set salePrice to null to clear it. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB product ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductRequest'
 *           examples:
 *             nameOnly:
 *               summary: Rename a product
 *               value:
 *                 name: Samsung Galaxy S24 Ultra
 *             priceOnly:
 *               summary: Change price only
 *               value:
 *                 price: 78999.99
 *             clearSalePrice:
 *               summary: Clear the sale price
 *               value:
 *                 salePrice: null
 *             changeCategory:
 *               summary: Move the product to another category
 *               value:
 *                 category: 665f1b2c9a1b2c3d4e5f6790
 *             changeStatus:
 *               summary: Mark the product inactive
 *               value:
 *                 status: INACTIVE
 *     responses:
 *       '200':
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *             example:
 *               success: true
 *               message: Product updated successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6795
 *                 name: Samsung Galaxy S24 Ultra
 *                 sku: SAMSUNG-S24
 *                 description: Samsung smartphone
 *                 price: 78999.99
 *                 salePrice: 74999.99
 *                 stock: 25
 *                 category: 665f1b2c9a1b2c3d4e5f6790
 *                 status: ACTIVE
 *                 createdAt: '2026-11-11T10:00:00.000Z'
 *                 updatedAt: '2026-11-11T11:00:00.000Z'
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
 *         description: Product or requested category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               productNotFound:
 *                 summary: Product not found
 *                 value:
 *                   success: false
 *                   message: Product not found
 *                   error:
 *                     code: PRODUCT_NOT_FOUND
 *               categoryNotFound:
 *                 summary: Requested category not found
 *                 value:
 *                   success: false
 *                   message: Category not found
 *                   error:
 *                     code: CATEGORY_NOT_FOUND
 *       '409':
 *         description: A product with the same SKU already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: A product with this SKU already exists
 *               error:
 *                 code: SKU_ALREADY_EXISTS
 *       '422':
 *         description: Request validation failed or the effective sale price exceeds the effective price
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation:
 *                 summary: Invalid request field
 *                 value:
 *                   success: false
 *                   message: 'stock: Stock must be an integer'
 *                   error:
 *                     code: VALIDATION_ERROR
 *               salePrice:
 *                 summary: Existing sale price exceeds the new price
 *                 value:
 *                   success: false
 *                   message: Sale price cannot be greater than price
 *                   error:
 *                     code: VALIDATION_ERROR
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
productRoutes.patch('/:id', validateBody(updateProductSchema), updateProduct);

/**
 * @openapi
 * /admin/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Soft-delete a product
 *     description: >-
 *       Soft-deletes a product by setting status to INACTIVE. The MongoDB document
 *       and its historical references are preserved. Admin access only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB product ID.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       '200':
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *             example:
 *               success: true
 *               message: Product deleted successfully
 *               data:
 *                 id: 665f1b2c9a1b2c3d4e5f6795
 *                 name: Samsung Galaxy S24
 *                 sku: SAMSUNG-S24
 *                 description: Samsung smartphone
 *                 price: 79999.99
 *                 salePrice: 74999.99
 *                 stock: 25
 *                 category: 665f1b2c9a1b2c3d4e5f6789
 *                 status: INACTIVE
 *                 createdAt: '2026-11-11T10:00:00.000Z'
 *                 updatedAt: '2026-11-11T11:00:00.000Z'
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
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Product not found
 *               error:
 *                 code: PRODUCT_NOT_FOUND
 *       '422':
 *         description: Product ID validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'id: Product ID must be a valid MongoDB ObjectId'
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
productRoutes.delete('/:id', deleteProduct);

export default productRoutes;
