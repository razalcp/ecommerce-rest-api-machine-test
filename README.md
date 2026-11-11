# E-commerce REST API

A modular, layered REST API for an e-commerce platform built with Node.js, TypeScript and Express.js. The project follows SOLID principles and separates application initialization from server startup.

## Technology Stack

- Node.js
- TypeScript
- Express.js
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

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The API is available at `http://localhost:3000`.

### Health Check

```bash
curl http://localhost:3000/api/v1/health
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
