import { Router } from 'express';
import { getPublicProduct, listPublicProducts } from './product.controller';

const publicProductRoutes = Router();

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List active products
 *     description: >-
 *       Returns a paginated list of ACTIVE products only. Public access; no JWT is
 *       required. Search is case-insensitive and matches name, description, or SKU.
 *       Filtering by categoryId includes products in the selected category and every
 *       descendant category at unlimited depth. Price filters use the effective
 *       selling price: salePrice when present, otherwise price. All prices are in INR.
 *       Example: GET /products?search=samsung&categoryId=665f1b2c9a1b2c3d4e5f6789&minPrice=1000&maxPrice=5000&sortBy=price&sortOrder=asc&page=1&limit=10
 *     parameters:
 *       - in: query
 *         name: search
 *         description: Case-insensitive partial match against name, description, or SKU. Maximum 100 characters.
 *         schema:
 *           type: string
 *           maxLength: 100
 *         example: samsung
 *       - in: query
 *         name: categoryId
 *         description: >-
 *           Category MongoDB ObjectId. Results include products assigned to this
 *           category and to every direct, nested, or deeper descendant category.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         example: 665f1b2c9a1b2c3d4e5f6789
 *       - in: query
 *         name: minPrice
 *         description: Minimum effective selling price in INR, inclusive, with at most two decimal places.
 *         schema:
 *           type: number
 *           format: double
 *           minimum: 0
 *         example: 1000
 *       - in: query
 *         name: maxPrice
 *         description: >-
 *           Maximum effective selling price in INR, inclusive, with at most two
 *           decimal places. Must be greater than or equal to minPrice.
 *         schema:
 *           type: number
 *           format: double
 *           minimum: 0
 *         example: 5000
 *       - in: query
 *         name: sortBy
 *         description: Sort field. Price sorting uses the effective selling price.
 *         schema:
 *           type: string
 *           enum: [createdAt, name, price]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         description: >-
 *           Sort direction. A deterministic _id secondary sort keeps pagination stable.
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
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
 *     responses:
 *       '200':
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicProductListResponse'
 *             examples:
 *               withResults:
 *                 summary: Matching active products
 *                 value:
 *                   success: true
 *                   message: Products retrieved successfully
 *                   data:
 *                     products:
 *                       - id: 665f1b2c9a1b2c3d4e5f6795
 *                         name: Samsung Galaxy S24
 *                         sku: SAMSUNG-S24
 *                         description: Samsung smartphone
 *                         price: 79999.99
 *                         salePrice: 74999.99
 *                         stock: 25
 *                         category: 665f1b2c9a1b2c3d4e5f6789
 *                         status: ACTIVE
 *                         createdAt: '2026-11-11T10:00:00.000Z'
 *                         updatedAt: '2026-11-11T10:00:00.000Z'
 *                     pagination:
 *                       page: 1
 *                       limit: 10
 *                       total: 1
 *                       totalPages: 1
 *               emptyResult:
 *                 summary: No matching active products
 *                 value:
 *                   success: true
 *                   message: Products retrieved successfully
 *                   data:
 *                     products: []
 *                     pagination:
 *                       page: 1
 *                       limit: 10
 *                       total: 0
 *                       totalPages: 0
 *       '404':
 *         description: Selected category not found
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
 *         description: >-
 *           Query validation failed, including invalid category ID, price range,
 *           sort field, sort order, pagination values, or unexpected parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidPriceRange:
 *                 summary: Minimum price exceeds maximum price
 *                 value:
 *                   success: false
 *                   message: 'minPrice: minPrice cannot be greater than maxPrice'
 *                   error:
 *                     code: VALIDATION_ERROR
 *               invalidSort:
 *                 summary: Unsupported sort field
 *                 value:
 *                   success: false
 *                   message: 'sortBy: sortBy must be one of createdAt, name, or price'
 *                   error:
 *                     code: VALIDATION_ERROR
 *               invalidLimit:
 *                 summary: Limit exceeds the maximum
 *                 value:
 *                   success: false
 *                   message: 'limit: Limit must not exceed 50'
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
publicProductRoutes.get('/', listPublicProducts);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get an active product by ID
 *     description: >-
 *       Returns a single ACTIVE product by its MongoDB ObjectId. Public access; no
 *       JWT is required. INACTIVE and nonexistent products both return
 *       PRODUCT_NOT_FOUND. All prices are in INR.
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
 *       '404':
 *         description: Product not found or inactive
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
publicProductRoutes.get('/:id', getPublicProduct);

export default publicProductRoutes;
