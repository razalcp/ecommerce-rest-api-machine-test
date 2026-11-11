import { Router } from 'express';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { login, logout, refresh, register } from './auth.controller';
import { loginSchema, refreshTokenSchema, registerSchema } from './auth.validation';

const authRoutes = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a customer account
 *     description: Creates a customer account and returns a JWT access token and an opaque refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             fullName: Jane Doe
 *             email: jane@example.com
 *             password: StrongPass123
 *     responses:
 *       '201':
 *         description: Account registered and tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: Authentication successful
 *               data:
 *                 user:
 *                   id: 665f1b2c9a1b2c3d4e5f6789
 *                   fullName: Jane Doe
 *                   email: jane@example.com
 *                   role: CUSTOMER
 *                 tokens:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   refreshToken: 9s7fQ2m1Xk4p...
 *                   tokenType: Bearer
 *                   expiresIn: 900
 *                   refreshExpiresIn: 604800
 *       '409':
 *         description: An account with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: An account with this email already exists
 *               error:
 *                 code: EMAIL_ALREADY_EXISTS
 *       '422':
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "email: Email must be a valid email address, password: Password must be at least 8 characters long"
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
authRoutes.post('/register', validateBody(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate with email and password
 *     description: Authenticates a user and returns a JWT access token and an opaque refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: jane@example.com
 *             password: StrongPass123
 *     responses:
 *       '200':
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: Authentication successful
 *               data:
 *                 user:
 *                   id: 665f1b2c9a1b2c3d4e5f6789
 *                   fullName: Jane Doe
 *                   email: jane@example.com
 *                   role: CUSTOMER
 *                 tokens:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   refreshToken: 9s7fQ2m1Xk4p...
 *                   tokenType: Bearer
 *                   expiresIn: 900
 *                   refreshExpiresIn: 604800
 *       '401':
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid email or password
 *               error:
 *                 code: INVALID_CREDENTIALS
 *       '403':
 *         description: Account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Account is inactive
 *               error:
 *                 code: ACCOUNT_INACTIVE
 *       '422':
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "email: Email must be a valid email address, password: Password is required"
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
authRoutes.post('/login', validateBody(loginSchema), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate a refresh token and issue a new token pair
 *     description: >-
 *       The supplied refresh token is atomically rotated. The old token is
 *       invalidated and a new token pair is returned. Reusing a previously
 *       rotated token revokes the session and returns REFRESH_TOKEN_REUSE_DETECTED.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: 9s7fQ2m1Xk4p...
 *     responses:
 *       '200':
 *         description: Token pair refreshed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *             example:
 *               success: true
 *               message: Token refreshed successfully
 *               data:
 *                 tokens:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   refreshToken: 5d8kL0p3Qz7w...
 *                   tokenType: Bearer
 *                   expiresIn: 900
 *                   refreshExpiresIn: 604800
 *       '401':
 *         description: Invalid, expired, or reused refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidOrExpired:
 *                 summary: Invalid or expired refresh token
 *                 value:
 *                   success: false
 *                   message: Invalid refresh token
 *                   error:
 *                     code: INVALID_REFRESH_TOKEN
 *               reused:
 *                 summary: Reused rotated refresh token
 *                 value:
 *                   success: false
 *                   message: Refresh token reuse detected
 *                   error:
 *                     code: REFRESH_TOKEN_REUSE_DETECTED
 *       '403':
 *         description: Account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Account is inactive
 *               error:
 *                 code: ACCOUNT_INACTIVE
 *       '422':
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "refreshToken: Refresh token is required"
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
authRoutes.post('/refresh', validateBody(refreshTokenSchema), refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a refresh-token session
 *     description: >-
 *       Revokes the supplied refresh token. Logout is idempotent. Existing
 *       access tokens remain valid until they expire, but the revoked refresh
 *       token can no longer be used.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: 9s7fQ2m1Xk4p...
 *     responses:
 *       '200':
 *         description: Logout completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *             example:
 *               success: true
 *               message: Logged out successfully
 *               data: {}
 *       '422':
 *         description: Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "refreshToken: Refresh token is required"
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
authRoutes.post('/logout', validateBody(refreshTokenSchema), logout);

export default authRoutes;
