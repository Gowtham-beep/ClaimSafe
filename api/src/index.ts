import Fastify from 'fastify';
import { config } from './config';
import corsPlugin from './plugins/cors';
import loggerPlugin from './plugins/logger';
import uploadRoutes from './routes/upload';
import statusRoutes from './routes/status';
import resultRoutes from './routes/result';
import policiesRoutes from './routes/policies';

// Import worker to initialize it and start processing queue tasks in the background
import './queue/worker';

// Configure Fastify with structured pino logger
const server = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    // Format JSON logs beautifully in local development
    transport:
      config.nodeEnv === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

async function main() {
  try {
    // Register global plugins
    await server.register(corsPlugin);
    await server.register(loggerPlugin);

    // Register routes under /api prefix
    await server.register(uploadRoutes, { prefix: '/api' });
    await server.register(statusRoutes, { prefix: '/api' });
    await server.register(resultRoutes, { prefix: '/api' });
    await server.register(policiesRoutes, { prefix: '/api' });

    // Start server
    await server.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal}. Starting graceful shutdown...`);
  try {
    await server.close();
    server.log.info('Fastify server closed.');
    process.exit(0);
  } catch (err) {
    server.log.error(err, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
