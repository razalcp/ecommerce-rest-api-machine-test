# E-commerce REST API

<<<<<<< Updated upstream
A modular, layered REST API for an e-commerce platform built with Node.js, TypeScript and Express.js. The project follows SOLID principles and separates application initialization from server startup.
=======
A modular, layered REST API for an e-commerce platform built with Node.js, TypeScript and Express.js. The project follows SOLID principles, separates application initialization from server startup, and connects to MongoDB Atlas through Mongoose.
>>>>>>> Stashed changes

## Technology Stack

- Node.js
- TypeScript
- Express.js
<<<<<<< Updated upstream
- MongoDB with Mongoose (planned for a later phase)
- npm

## Getting Started

### Prerequisites

- Node.js (v20 or later recommended)
- npm

### Installation

```bash
npm install
```

=======
- MongoDB Atlas with Mongoose
- Zod (environment validation)
- dotenv
- Helmet
- CORS
- npm

## Prerequisites

- Node.js v20 or later
- npm
- A MongoDB Atlas account and cluster

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file from the example:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill in the values in `.env` as described below.

## Environment Configuration

The application validates all environment variables on startup using Zod and fails fast with a clear message if any value is missing or invalid.

| Variable      | Required | Default       | Description                                            |
| ------------- | -------- | ------------- | ------------------------------------------------------ |
| `NODE_ENV`    | No       | `development` | One of `development`, `test` or `production`           |
| `PORT`        | No       | `5000`        | Positive integer port used by the HTTP server          |
| `MONGODB_URI` | Yes      | -             | MongoDB Atlas connection string                        |
| `CORS_ORIGIN` | No       | `*`           | Allowed origin(s); comma-separated values are supported |

Example `.env`:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
CORS_ORIGIN=*
```

Never commit your real `.env` file. It is excluded by `.gitignore`.

## MongoDB Atlas Connection

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a cluster.
2. Create a database user with read/write access to your application database.
3. Add your current IP address (or an appropriate range) under **Network Access**.
4. Select **Connect** on the cluster and choose **Drivers** to copy the connection string.
5. Replace `<username>`, `<password>`, `<cluster-host>` and `<database-name>` in the string with your own values.
6. Paste the completed connection string into `MONGODB_URI` in your `.env` file.

The server connects to MongoDB before it starts accepting HTTP requests. If the connection fails, the process logs the error and exits with a non-zero status.

>>>>>>> Stashed changes
## Development

Start the development server with hot reload:

```bash
npm run dev
```

<<<<<<< Updated upstream
The API is available at `http://localhost:3000`.

### Health Check

```bash
curl http://localhost:3000/api/v1/health
=======
The API is available at `http://localhost:5000`.

## Build and Run

Compile TypeScript to the `dist` directory:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

## Health Check

```bash
curl http://localhost:5000/api/v1/health
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
## Error Response Format

All errors, including unknown routes and unexpected failures, use a consistent response structure:

```json
{
  "success": false,
  "message": "Readable error message",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

>>>>>>> Stashed changes
## Available Scripts

| Script              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Run the application in watch mode using tsx      |
| `npm run build`     | Compile TypeScript into the `dist` directory     |
| `npm start`         | Run the compiled application                     |
| `npm run typecheck` | Run TypeScript type checking without emitting    |

## Project Structure

```text
src/
  app.ts
  server.ts
  config/
<<<<<<< Updated upstream
=======
    database.ts
    env.ts
>>>>>>> Stashed changes
  shared/
    errors/
    middleware/
    types/
    utils/
  modules/
    health/
      health.controller.ts
      health.routes.ts
```

## License

ISC
