import { FastifyPluginAsync } from 'fastify';

const resultRoutes: FastifyPluginAsync = async (fastify, options) => {
  fastify.get('/result/:policy_id', async (request, reply) => {
    return reply.status(501).send({ status: 'not_implemented' });
  });
};

export default resultRoutes;
