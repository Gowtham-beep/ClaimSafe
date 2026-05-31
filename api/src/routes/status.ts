import { FastifyPluginAsync } from 'fastify';

const statusRoutes: FastifyPluginAsync = async (fastify, options) => {
  fastify.get('/status/:job_id', async (request, reply) => {
    return reply.status(501).send({ status: 'not_implemented' });
  });
};

export default statusRoutes;
