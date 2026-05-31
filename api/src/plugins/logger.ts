import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// Declaration merging to add requestId to FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

const loggerPlugin: FastifyPluginAsync = async (fastify, options) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Fetch request ID from headers (for propagation) or generate a new one
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    request.requestId = requestId;

    // Attach request_id to child logger so pino includes it in all request-related log lines
    request.log = request.log.child({ request_id: requestId });

    // Propagate correlation ID to client response header
    reply.header('X-Request-ID', requestId);
  });
};

export default loggerPlugin;
