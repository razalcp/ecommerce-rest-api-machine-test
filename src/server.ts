import { Server } from 'http';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';

let httpServer: Server | null = null;
let isShuttingDown = false;

const logStartupBanner = (): void => {
  const baseUrl = `http://localhost:${env.PORT}`;

  console.log(
    [
      '==================================================',
      '       E-COMMERCE REST API',
      '==================================================',
      '',
      'Server Status : Running',
      `Environment   : ${env.NODE_ENV}`,
      '',
      `API Base URL  : ${baseUrl}`,
      `Health Check  : ${baseUrl}/api/v1/health`,
      '',
      `Swagger UI    : ${baseUrl}/api-docs`,
      `OpenAPI JSON  : ${baseUrl}/api-docs.json`,
      '',
      '==================================================',
    ].join('\n')
  );
};

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  try {
    const server = httpServer;

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      console.log('HTTP server closed.');
    }

    await disconnectDatabase();
    console.log('MongoDB connection closed.');

    process.exit(0);
  } catch (error) {
    console.error(
      'Error during graceful shutdown:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    httpServer = app.listen(env.PORT, () => {
      logStartupBanner();
    });

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    console.error(
      'Failed to start the server:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
};

void startServer();
