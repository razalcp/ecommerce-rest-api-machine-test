# E-commerce REST API

A modular, layered REST API for an e-commerce platform built with Node.js, TypeScript, and Express.js. It uses MongoDB with Mongoose, validates configuration and requests with Zod, and follows SOLID principles with application initialization separated from server startup.

## Technology Stack

- Node.js
- TypeScript
- Express.js
- MongoDB with Mongoose
- Zod (environment and request validation)
- JSON Web Tokens (jsonwebtoken)
- bcryptjs (password hashing)
- dotenv
- Helmet
- CORS
- Swagger UI with swagger-jsdoc
- npm

## Prerequisites

- Node.js v20 or later
- npm
- MongoDB running locally, or a MongoDB Atlas cluster

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file from the example:

   ```bash
  .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill in the values in `.env` as described below.

## Environment Configuration

The application validates all environment variables on startup using Zod and fails fast with a clear message if any value is missing or invalid.

| Variable                           | Required | Default       | Description                                             |
| ---------------------------------- | -------- | ------------- | ------------------------------------------------------- |
| `NODE_ENV`                         | No       | `development` | One of `development`, `test`, or `production`           |
| `PORT`                             | No       | `5000`        | Positive integer port used by the HTTP server           |
| `MONGODB_URI`                      | Yes      | -             | MongoDB connection string                               |
| `CORS_ORIGIN`                      | No       | `*`           | Allowed origin(s); comma-separated values are supported |
| `JWT_ACCESS_SECRET`                | Yes      | -             | Access-token signing secret, at least 32 characters     |
| `JWT_ACCESS_EXPIRES_IN_SECONDS`    | No       | `900`         | Access-token lifetime in seconds                        |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | No       | `604800`      | Refresh-token lifetime in seconds                       |

Example `.env` for local MongoDB:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce-rest-api
CORS_ORIGIN=*
JWT_ACCESS_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_ACCESS_EXPIRES_IN_SECONDS=900
REFRESH_TOKEN_EXPIRES_IN_SECONDS=604800
```

The `.env.example` file contains an Atlas-style `MONGODB_URI` placeholder. Replace it with the local URI above for local development, or use your Atlas connection string.

Never commit your real `.env` file. It is excluded by `.gitignore`.

## Local MongoDB Development

1. Start MongoDB locally. The default local port is `27017`.
2. Set `MONGODB_URI` to a local database URI, for example:

   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce-rest-api
   ```

3. Start the application. The server connects to MongoDB before accepting HTTP requests. If the connection fails, the process logs the error and exits with a non-zero status.

### Optional: MongoDB Atlas

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a cluster.
2. Create a database user with read/write access to your application database.
3. Add your current IP address, or an appropriate range, under **Network Access**.
4. Select **Connect** on the cluster, choose **Drivers**, and copy the connection string.
5. Replace the placeholders in the connection string and set it as `MONGODB_URI` in `.env`.

## Admin Seed

The Admin account is created through a one-off seed script. There is no Admin registration API endpoint.

The seed script uses the same environment configuration as the application, so `MONGODB_URI` and the other required application variables must be configured.

### Admin Seed Configuration

Set the following optional variables in `.env` only when you need to run the seed command:

| Variable              | Required for seed | Description                                                             |
| --------------------- | ----------------- | ----------------------------------------------------------------------- |
| `ADMIN_SEED_NAME`     | Yes               | Admin display name, 2-100 characters                                    |
| `ADMIN_SEED_EMAIL`    | Yes               | Admin email address; normalized to lowercase before lookup and creation |
| `ADMIN_SEED_PASSWORD` | Yes               | Admin password, at least 16 characters and no more than 72 UTF-8 bytes  |

Example:

```dotenv
ADMIN_SEED_NAME=System Administrator
ADMIN_SEED_EMAIL=admin@gmail.com
ADMIN_SEED_PASSWORD=replace-with-a-strong-password
```

The password in `.env.example` is only a placeholder. Replace it with a strong password before running the seed command. Never commit real Admin credentials.

### Run the Admin Seed

```bash
npm run seed:admin
```

The script validates the Admin seed variables, connects to MongoDB using the existing database configuration, normalizes the email address, and checks for an existing user through the user repository.

### Seed Idempotency

- If the email does not exist, the script creates an active `ADMIN` user.
- If the email already belongs to an `ADMIN`, the script reports that the account exists and makes no changes, including no password reset.
- If the email belongs to a `CUSTOMER`, the script refuses to promote or modify that account and exits with a non-zero status.
- Running the command repeatedly will not create duplicate Admin accounts.

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The API is available at `http://localhost:5000` by default, or at the configured `PORT`.

### Health Check

```bash
curl http://localhost:5000/api/v1/health
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

## Build and Run

Compile TypeScript to the `dist` directory:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

## API Documentation

Interactive API documentation is served by Swagger UI:

- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`

Start the backend locally with `npm run dev`, or build and run it with `npm run build` followed by `npm start`, then open the Swagger UI URL. If you changed `PORT`, replace `5000` with the configured port.

Swagger UI supports **Try it out** and **Execute**, displays request and response schemas and example payloads, and includes a Bearer JWT authorization scheme.

The Swagger server URL is configured as `http://localhost:5000/api/v1`, so operations are executed against the existing API base path.

### Testing Registration and Login in Swagger

1. Expand `POST /auth/register`, click **Try it out**, and execute with a unique email.
2. Copy `data.tokens.accessToken` from the `201` response.
3. Click **Authorize**, paste the access token, and authorize.
4. Expand `POST /auth/login` and execute with the same credentials.
5. Use `POST /auth/refresh` with `data.tokens.refreshToken` to rotate the token pair.
6. Use `POST /auth/logout` with the refresh token to revoke the session.

Public authentication endpoints do not require an existing access token. The Bearer security scheme is available for protected endpoints added in future modules.

## Authentication

Registration and login issue both an access token and a refresh token.

- Access tokens are JWTs signed with `JWT_ACCESS_SECRET`. They are sent as `Authorization: Bearer <accessToken>` and expire after `JWT_ACCESS_EXPIRES_IN_SECONDS`.
- Refresh tokens are opaque 256-bit random values. Only their SHA-256 hashes are stored in MongoDB. They expire after `REFRESH_TOKEN_EXPIRES_IN_SECONDS`.

### Register

`POST /api/v1/auth/register`

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPass123"
}
```

Returns `201 Created` with the user and a token pair:

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

### Login

`POST /api/v1/auth/login`

```json
{
  "email": "jane@example.com",
  "password": "StrongPass123"
}
```

Returns `200 OK` with the same user and token-pair structure as registration.

### Refresh Token Rotation

`POST /api/v1/auth/refresh`

```json
{
  "refreshToken": "<refresh-token>"
}
```

The refresh token is rotated atomically. The old token is invalidated and a new token pair is returned:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "<new-access-token>",
      "refreshToken": "<new-refresh-token>",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "refreshExpiresIn": 604800
    }
  }
}
```

Reusing a previously rotated token revokes the session and returns `401 Unauthorized` with error code `REFRESH_TOKEN_REUSE_DETECTED`.

### Logout

`POST /api/v1/auth/logout`

```json
{
  "refreshToken": "<refresh-token>"
}
```

Revokes the refresh-token session. Logout is idempotent. Existing access tokens remain valid until they expire, but the revoked refresh token can no longer be used.

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

### Error Response Format

All errors, including validation failures, unknown routes, and unexpected failures, use a consistent response structure:

```json
{
  "success": false,
  "message": "Readable error message",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

## Available API Endpoints

| Method | Endpoint                    | Description                                      |
| ------ | --------------------------- | ------------------------------------------------ |
| `GET`  | `/api/v1/health`            | Service health check                             |
| `POST` | `/api/v1/auth/register`     | Register a customer and issue a token pair       |
| `POST` | `/api/v1/auth/login`        | Authenticate and issue a token pair              |
| `POST` | `/api/v1/auth/refresh`      | Rotate a refresh token and issue a new token pair |
| `POST` | `/api/v1/auth/logout`       | Revoke a refresh-token session                   |

## Available Scripts

| Script              | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`        | Run the application in watch mode using tsx   |
| `npm run build`      | Compile TypeScript into the `dist` directory  |
| `npm start`          | Run the compiled application                  |
| `npm run typecheck`  | Run TypeScript type checking without emitting |
| `npm run seed:admin` | Create the initial Admin account from the seed env vars |

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
    middleware/
    types/
    utils/
  scripts/
    seed-admin.ts
  modules/
    auth/
      auth.controller.ts
      auth.routes.ts
      auth.service.ts
      auth.types.ts
      auth.validation.ts
      refresh-token.model.ts
      refresh-token.repository.ts
      refresh-token.service.ts
      token.service.ts
    health/
      health.controller.ts
      health.routes.ts
    users/
      user.model.ts
      user.repository.ts
      user.types.ts
```

## License

ISC
