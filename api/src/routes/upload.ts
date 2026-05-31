import { FastifyPluginAsync } from 'fastify';

const uploadRoutes: FastifyPluginAsync = async (fastify, options) => {
  fastify.post('/upload', async (request, reply) => {
    return reply.status(501).send({ status: 'not_implemented' });
  });
};

export default uploadRoutes;
