# E-commerce REST API

A modular, layered REST API for an e-commerce platform built with Node.js, TypeScript, Express.js, MongoDB, Mongoose, and Zod. It provides JWT authentication with rotating refresh tokens, user management, nested categories, product search and filtering, customer checkout, order history, admin order management, and safe inventory compensation on standalone MongoDB.

This repository does not include Docker, deployment, or hosting configuration.

## Technology Stack

- Node.js with npm
- TypeScript 5.9 (strict mode)
- Express.js 5
- MongoDB with Mongoose 9
- Zod 4 for environment and request validation
- JSON Web Tokens via `jsonwebtoken`
- bcryptjs for password hashing
- dotenv
- Helmet
- CORS
- Swagger UI and swagger-jsdoc
- tsx for development and tests
- Node.js built-in test runner (`node:test`)

## Architecture

The application uses a modular layered architecture:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
Mongoose Models
```

- Routes define HTTP paths, middleware, and OpenAPI documentation.
- Controllers parse validated input and build HTTP responses.
- Services own business rules and orchestration.
- Repositories own MongoDB persistence queries and atomic updates.
- Models define schemas, validation, indexes, and safe serialization.
- Shared middleware provides authentication, role authorization, validation, and centralized errors.

`src/app.ts` builds the Express application. `src/server.ts` connects to MongoDB and starts the HTTP server.

## Project Structure

```text
src/
  app.ts
  server.ts
  config/
    database.ts
    env.ts
    swagger.ts
  shared/
    errors/
      app-error.ts
      http-status.ts
      not-found.error.ts
    middleware/
      auth.middleware.ts
      error-handler.middleware.ts
      not-found.middleware.ts
      role.middleware.ts
      validate.middleware.ts
    types/
      api-response.type.ts
      auth-user.type.ts
      express.d.ts
    utils/
      money.util.ts
      password.util.ts
      validation.util.ts
  scripts/
    seed-admin.ts
  modules/
    auth/
    categories/
    health/
    orders/
    products/
    users/
tests/
  orders/
    order.management.test.ts
    order.service.test.ts
docs/
  order-inventory-design.md
```

## Prerequisites

- Node.js v20 or later
- npm
- A running MongoDB instance

The project is intended for an existing standalone local MongoDB deployment. It does not configure or require a replica set, and it does not use multi-document transactions.

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS/Linux:

   ```bash
   cp .env.example .env
   ```

3. Review and update the values in `.env`.

Never commit your real `.env` file. It is excluded by `.gitignore`.

## Local MongoDB Setup

Start MongoDB locally. The default local port is `27017`.

Set `MONGODB_URI` in `.env`, for example:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce-rest-api
```

The server connects to MongoDB before accepting HTTP requests. If the connection fails, startup fails with a non-zero exit code.

## Environment Configuration

The application validates configuration on startup using Zod and fails fast when a required value is missing or invalid.

| Variable                           | Required | Default       | Description                                             |
| ---------------------------------- | -------- | ------------- | ------------------------------------------------------- |
| `NODE_ENV`                         | No       | `development` | One of `development`, `test`, or `production`           |
| `PORT`                             | No       | `5000`        | Positive integer port used by the HTTP server           |
| `MONGODB_URI`                      | Yes      | -             | MongoDB connection string                               |
| `CORS_ORIGIN`                      | No       | `*`           | Allowed origin(s); comma-separated values are supported |
| `JWT_ACCESS_SECRET`                | Yes      | -             | Access-token signing secret, at least 32 characters     |
| `JWT_ACCESS_EXPIRES_IN_SECONDS`    | No       | `900`         | Access-token lifetime in seconds                        |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | No       | `604800`      | Refresh-token lifetime in seconds                       |

The following variables are optional for the application and are required only when running the Admin seed command:

| Variable              | Required for seed | Description                                                             |
| --------------------- | ----------------- | ----------------------------------------------------------------------- |
| `ADMIN_SEED_NAME`     | Yes               | Admin display name, 2-100 characters                                    |
| `ADMIN_SEED_EMAIL`    | Yes               | Admin email address; normalized to lowercase before lookup and creation |
| `ADMIN_SEED_PASSWORD` | Yes               | Admin password, at least 16 characters and no more than 72 UTF-8 bytes  |

Example local configuration:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce-rest-api
CORS_ORIGIN=*
JWT_ACCESS_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_ACCESS_EXPIRES_IN_SECONDS=900
REFRESH_TOKEN_EXPIRES_IN_SECONDS=604800
```

`.env.example` contains placeholders only. It does not contain real credentials or production secrets.

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The API is available at `http://localhost:5000` by default, or at the configured `PORT`.

Health check:

```text
GET http://localhost:5000/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "message": "E-commerce API is running",
  "data": {
    "service": "ecommerce-rest-api"
  }
}
```

## Build and Production Start

Compile TypeScript into `dist`:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

## Admin Seed

Public registration always creates a `CUSTOMER`. Admin accounts are created only through the one-off seed script. There is no public Admin registration endpoint, and the application does not seed the database automatically at startup.

1. Set `ADMIN_SEED_NAME`, `ADMIN_SEED_EMAIL`, and `ADMIN_SEED_PASSWORD` in `.env`.
2. Run:

   ```bash
   npm run seed:admin
   ```

The script:

- Reads credentials from environment variables.
- Validates the name, email, password length, and bcrypt UTF-8 byte limit.
- Hashes the password with bcrypt before storage.
- Normalizes the email to lowercase.
- Creates an active `ADMIN` account only when the email does not already exist.
- Makes no changes when the email already belongs to an `ADMIN`, including no password reset.
- Refuses to promote or modify an existing `CUSTOMER`.
- Is idempotent and does not create duplicate accounts.

Do not commit real Admin credentials.

## Authentication Workflow

Registration and login return a short-lived JWT access token and an opaque refresh token.

- Send the access token as `Authorization: Bearer <accessToken>`.
- Access tokens are signed with `JWT_ACCESS_SECRET` and expire after `JWT_ACCESS_EXPIRES_IN_SECONDS`.
- Refresh tokens are 256-bit random values. Only SHA-256 hashes are stored in MongoDB.
- Refresh tokens expire after `REFRESH_TOKEN_EXPIRES_IN_SECONDS`.
- Refresh-token rotation invalidates the old token and returns a new pair.
- Reusing a rotated refresh token revokes that session.
- Logout revokes the supplied refresh-token session.
- Access tokens are checked against the current user record, account status, and `tokenVersion`.
- Deactivating or activating a user increments `tokenVersion` and revokes all of that user's refresh-token sessions.

### Authentication Endpoints

| Method | Endpoint                     | Access   | Description                                |
| ------ | ---------------------------- | -------- | ------------------------------------------ |
| `POST` | `/api/v1/auth/register`      | Public   | Register a customer and issue a token pair |
| `POST` | `/api/v1/auth/login`         | Public   | Authenticate and issue a token pair        |
| `POST` | `/api/v1/auth/refresh`       | Public   | Rotate a refresh token                     |
| `POST` | `/api/v1/auth/logout`        | Public   | Revoke a refresh-token session             |

Registration request:

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPass123"
}
```

Authentication responses use this shape:

```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "<user-id>",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "role": "CUSTOMER"
    },
    "tokens": {
      "accessToken": "<access-token>",
      "refreshToken": "<refresh-token>",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "refreshExpiresIn": 604800
    }
  }
}
```

## API Documentation

Swagger UI and the generated OpenAPI JSON are served by the application:

- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`

The OpenAPI server base URL is `http://localhost:5000/api/v1`. If `PORT` is changed, use the configured port. The specification includes Bearer JWT security, reusable schemas, request parameters, success responses, and error responses.

The specification is generated from the route-level `@openapi` comments and the shared definitions in `src/config/swagger.ts`. There is no separately maintained OpenAPI document.

## User Management Endpoints

| Method  | Endpoint                        | Access   | Description                                          |
| ------- | ------------------------------- | -------- | ---------------------------------------------------- |
| `GET`   | `/api/v1/users/profile`         | Customer/Admin | Get the authenticated user's profile           |
| `PATCH` | `/api/v1/users/profile`         | Customer/Admin | Update the authenticated user's full name      |
| `GET`   | `/api/v1/users`                 | Admin    | Paginated user listing with search and filters       |
| `PATCH` | `/api/v1/users/{id}/status`     | Admin    | Activate or deactivate a user                        |

`GET /api/v1/users` supports `search`, `role`, `isActive`, `page`, and `limit`. User responses never include `passwordHash`.

## Category Endpoints

| Method   | Endpoint                         | Access | Description                                      |
| -------- | -------------------------------- | ------ | ------------------------------------------------ |
| `GET`    | `/api/v1/categories`             | Public | List categories                                  |
| `GET`    | `/api/v1/categories/tree`        | Public | Get the complete nested category tree            |
| `GET`    | `/api/v1/categories/{id}`        | Public | Get a category by ID                             |
| `POST`   | `/api/v1/categories`             | Admin  | Create a root or child category                  |
| `PATCH`  | `/api/v1/categories/{id}`        | Admin  | Rename, move, or move to root                    |
| `DELETE` | `/api/v1/categories/{id}`        | Admin  | Delete a category when it is safe to do so        |

Categories support unlimited nesting through `parentId` and an `ancestors` array. The server owns hierarchy calculations. Moving a category updates descendant ancestors. Self-parenting, missing parents, and moves under descendants are rejected.

A category cannot be deleted while it has child categories or while any product references it, including inactive products.

## Product Endpoints

| Method   | Endpoint                          | Access | Description                                      |
| -------- | --------------------------------- | ------ | ------------------------------------------------ |
| `GET`    | `/api/v1/products`                | Public | List active products with search and filters     |
| `GET`    | `/api/v1/products/{id}`           | Public | Get an active product by ID                      |
| `POST`   | `/api/v1/admin/products`          | Admin  | Create a product                                 |
| `GET`    | `/api/v1/admin/products`          | Admin  | List all products, including inactive products   |
| `GET`    | `/api/v1/admin/products/{id}`     | Admin  | Get any product by ID                            |
| `PATCH`  | `/api/v1/admin/products/{id}`     | Admin  | Update a product                                 |
| `DELETE` | `/api/v1/admin/products/{id}`     | Admin  | Soft-delete a product by marking it `INACTIVE`   |

Product fields are `name`, `sku`, `description`, `price`, `salePrice`, `stock`, `category`, and `status`. SKUs are unique and normalized to uppercase. Prices are in INR and are stored with at most two decimal places. The effective selling price is `salePrice` when present, otherwise `price`.

Public product listing supports:

- `search`: case-insensitive match on name, description, or SKU
- `categoryId`: includes the selected category and all descendant categories
- `minPrice` and `maxPrice`: filters by effective selling price
- `sortBy`: `createdAt`, `name`, or `price`
- `sortOrder`: `asc` or `desc`
- `page` and `limit`

Only `ACTIVE` products are exposed through public endpoints. Soft deletion keeps the MongoDB document and historical order references.

## Order Endpoints

| Method  | Endpoint                               | Access   | Description                                      |
| ------- | -------------------------------------- | -------- | ------------------------------------------------ |
| `POST`  | `/api/v1/orders`                       | Customer | Create an order from product IDs and quantities  |
| `GET`   | `/api/v1/orders`                       | Customer | Paginated order history for the authenticated user |
| `GET`   | `/api/v1/orders/{id}`                  | Customer | Get an authenticated customer's own order        |
| `GET`   | `/api/v1/admin/orders`                 | Admin    | List all orders with filters                     |
| `GET`   | `/api/v1/admin/orders/{id}`            | Admin    | Get any order by ID                              |
| `PATCH` | `/api/v1/admin/orders/{id}/status`     | Admin    | Transition an order status or cancel an order    |

Customer checkout request:

```json
{
  "items": [
    {
      "productId": "665f1b2c9a1b2c3d4e5f6795",
      "quantity": 2
    }
  ]
}
```

Checkout rules:

- Customer identity comes from the authenticated JWT, never from the request body.
- Duplicate product IDs are aggregated before stock reservation.
- Product prices, names, and SKUs are read by the backend.
- All calculations use integer paise and return INR values.
- Orders start as `PENDING` with inventory status `RESERVED`.
- Stock is deducted with one conditional atomic update per product.
- If a later step fails, earlier reservations are compensated.
- Customer responses omit `customerId` and `inventoryStatus`.
- Customer order detail requests never expose another customer's order.
- Admin responses include `customerId` and `inventoryStatus`.

### Order Status Transitions

| Current status | Allowed next statuses          |
| -------------- | ------------------------------ |
| `PENDING`      | `CONFIRMED`, `CANCELLED`       |
| `CONFIRMED`    | `PROCESSING`, `CANCELLED`      |
| `PROCESSING`   | `SHIPPED`, `CANCELLED`         |
| `SHIPPED`      | `DELIVERED`                    |
| `DELIVERED`    | None                           |
| `CANCELLED`    | None                           |

Cancellation is allowed only from `PENDING`, `CONFIRMED`, or `PROCESSING`. Cancellation marks the order `CANCELLED` with inventory status `RESTORING`, restores each product using an idempotent operation key, then marks inventory `RELEASED`. A retry is safe when restoration is incomplete. See [`docs/order-inventory-design.md`](docs/order-inventory-design.md) for the full design.

## Database Indexes

The models define the following query-driven indexes:

- `User`: unique `email`; compound `role`, `isActive`, `createdAt`.
- `RefreshToken`: unique `tokenHash`; `userId` with `revokedAt`; `previousTokenHashes`; TTL index on `expiresAt`.
- `Category`: `parentId`; `ancestors`.
- `Product`: unique `sku`; compound `category`, `status`; `createdAt`.
- `Order`: compound `customerId`, `createdAt`; compound `status`, `createdAt`.

## Automated Testing

The project uses the Node.js built-in test runner through `tsx`. Tests use in-memory fake repositories and do not connect to the development database or perform HTTP requests.

Run the checkout tests:

```bash
npm run test:orders
```

Run the order management, transition, and cancellation tests:

```bash
npm run test:order-management
```

Other available scripts:

| Script               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`         | Run the application in watch mode using tsx      |
| `npm run build`       | Compile TypeScript into `dist`                   |
| `npm start`           | Run the compiled application                     |
| `npm run typecheck`   | Run TypeScript checks without emitting           |
| `npm run seed:admin`  | Create the initial Admin account from seed vars  |

The tests cover duplicate product aggregation, price manipulation protection, atomic stock deduction query shape, compensation, order status transitions, customer ownership, admin authorization rules at the service boundary, idempotent cancellation, partial restoration retry, and money arithmetic. They do not claim live MongoDB integration or server-side transaction testing.

## Standalone MongoDB and Inventory Limitations

The project intentionally uses the existing standalone MongoDB configuration and does not use multi-document transactions.

- Conditional atomic stock deduction prevents overselling for a single product document.
- Multi-product checkout is not an all-or-nothing transaction.
- A process crash after some stock deductions can leave stock reserved without a persisted order.
- Checkout compensation restores earlier reservations when a later step fails.
- Cancellation restoration is idempotent through per-order, per-product operation keys.
- An incomplete cancellation remains `CANCELLED` with inventory status `RESTORING` and can be retried safely.
- `stockRestorationKeys` grows for the lifetime of a product; high-volume deployments should move idempotency records to a dedicated collection.
- Stock restoration and final order release are separate document updates; a crash between them leaves the order retryable in `RESTORING`.
- Products removed from the database cannot be restored automatically and require operational intervention.

The application never claims all-or-nothing multi-document atomicity.

## Error Response Format

All errors use a consistent response structure:

```json
{
  "success": false,
  "message": "Readable error message",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

Validation failures return `422 Unprocessable Entity`. Authentication failures return `401`, authorization failures return `403`, missing resources return `404`, and invalid state or status conflicts return `409`.

## License

ISC
