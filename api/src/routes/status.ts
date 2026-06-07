import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/client';

const statusRoutes: FastifyPluginAsync = async (fastify, options) => {
  fastify.get('/status/:job_id', async (request, reply) => {
    const { job_id } = request.params as { job_id: string };
    
    // Get request ID from header or generate a new one
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : (requestIdHeader as string) || uuidv4();

    request.log.info({ request_id: requestId, job_id }, 'GET /status/:job_id request received');

    try {
      const res = await query(
        'SELECT * FROM pipeline_jobs WHERE job_id = $1',
        [job_id]
      );

      request.log.info({ request_id: requestId, row_count: res.rows.length }, 'DB query status result');

      if (res.rows.length === 0) {
        request.log.warn({ request_id: requestId, job_id }, 'Job not found');
        return reply.status(404).send({ error: 'Job not found' });
      }

      const row = res.rows[0];
      return reply.status(200).send({
        job_id: row.job_id,
        status: row.status,
        policy_id: row.policy_id,
        chunking_strategy: row.chunking_strategy,
        pass0_at: row.pass0_at ? new Date(row.pass0_at).toISOString() : null,
        pass1_at: row.pass1_at ? new Date(row.pass1_at).toISOString() : null,
        pass2_at: row.pass2_at ? new Date(row.pass2_at).toISOString() : null,
        failed_at: row.failed_at ? new Date(row.failed_at).toISOString() : null,
        error: row.error,
        retry_count: row.retry_count,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
      });
    } catch (err: any) {
      request.log.error({ request_id: requestId, err: err.message || err }, 'Error fetching job status');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default statusRoutes;
