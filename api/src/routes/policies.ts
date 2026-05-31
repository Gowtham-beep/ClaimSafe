import { FastifyPluginAsync } from 'fastify';

const policiesRoutes: FastifyPluginAsync = async (fastify, options) => {
  // GET /api/policies
  fastify.get('/policies', async (request, reply) => {
    return reply.status(501).send({ status: 'not_implemented' });
  });

  // DELETE /api/policies/:policy_id
  fastify.delete('/policies/:policy_id', async (request, reply) => {
    return reply.status(501).send({ status: 'not_implemented' });
  });
};

export default policiesRoutes;
