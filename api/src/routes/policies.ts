import { FastifyPluginAsync } from 'fastify';
import cookie from '@fastify/cookie';
import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../db/client';
import { getStorage } from '../storage';

const policiesRoutes: FastifyPluginAsync = async (fastify, options) => {
  // Register cookie plugin locally
  await fastify.register(cookie);

  // GET /policies
  fastify.get('/policies', async (request, reply) => {
    // Get request ID from header or generate a new one
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : (requestIdHeader as string) || uuidv4();

    request.log.info({ request_id: requestId }, 'GET /policies request received');

    try {
      const sessionId = request.cookies?.session_id;

      if (!sessionId) {
        request.log.info({ request_id: requestId }, 'No session_id cookie present, returning empty policies list');
        return reply.status(200).send({ policies: [] });
      }

      const res = await query(
        `SELECT p.policy_id, p.insurer, p.policy_type, p.created_at, j.status
         FROM policies p
         LEFT JOIN pipeline_jobs j ON p.policy_id = j.policy_id
         WHERE p.session_id = $1
         ORDER BY p.created_at DESC`,
        [sessionId]
      );

      request.log.info({ request_id: requestId, row_count: res.rows.length }, 'DB query policies list complete');

      const policies = res.rows.map((row) => ({
        policy_id: row.policy_id,
        insurer: row.insurer,
        policy_type: row.policy_type,
        status: row.status || 'unknown',
        created_at: new Date(row.created_at).toISOString(),
      }));

      return reply.status(200).send({ policies });
    } catch (err: any) {
      request.log.error({ request_id: requestId, err: err.message || err }, 'Error fetching policies');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /policies/:policy_id
  fastify.delete('/policies/:policy_id', async (request, reply) => {
    const { policy_id } = request.params as { policy_id: string };

    // Get request ID from header or generate a new one
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : (requestIdHeader as string) || uuidv4();

    request.log.info({ request_id: requestId, policy_id }, 'DELETE /policies/:policy_id request received');

    try {
      // 1. Fetch raw_pdf_path and session_id
      const res = await query(
        'SELECT raw_pdf_path, session_id FROM policies WHERE policy_id = $1',
        [policy_id]
      );

      request.log.info({ request_id: requestId, row_count: res.rows.length }, 'DB query policy raw info complete');

      if (res.rows.length === 0) {
        request.log.warn({ request_id: requestId, policy_id }, 'Policy not found');
        return reply.status(404).send({ error: 'Policy not found' });
      }

      const policy = res.rows[0];
      const sessionId = request.cookies?.session_id;

      // 2. Verify session cookie matches policy session_id
      if (!sessionId || sessionId !== policy.session_id) {
        request.log.warn({ request_id: requestId, policy_id, session_id_cookie: sessionId, policy_session_id: policy.session_id }, 'Forbidden: session mismatch');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // 3. Delete in correct FK order
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        await client.query('DELETE FROM analysis_results WHERE policy_id = $1', [policy_id]);
        await client.query('DELETE FROM extractions WHERE policy_id = $1', [policy_id]);
        await client.query('DELETE FROM pipeline_jobs WHERE policy_id = $1', [policy_id]);
        await client.query('DELETE FROM policies WHERE policy_id = $1', [policy_id]);

        await client.query('COMMIT');
        request.log.info({ request_id: requestId, policy_id }, 'DB transaction commit: Policy tables deletion complete');
      } catch (transactionError: any) {
        await client.query('ROLLBACK');
        request.log.error({ request_id: requestId, policy_id, err: transactionError.message || transactionError }, 'Database delete transaction failed, rolled back');
        throw transactionError;
      } finally {
        client.release();
      }

      // 4. Delete PDF from storage
      if (policy.raw_pdf_path) {
        try {
          const storage = getStorage();
          await storage.delete(policy.raw_pdf_path);
          request.log.info({ request_id: requestId, path: policy.raw_pdf_path }, 'Storage delete complete');
        } catch (storageErr: any) {
          request.log.error({ request_id: requestId, path: policy.raw_pdf_path, err: storageErr.message || storageErr }, 'Storage delete failed but ignored to prevent blocking');
        }
      }

      return reply.status(200).send({ message: 'Policy deleted' });
    } catch (err: any) {
      request.log.error({ request_id: requestId, err: err.message || err }, 'Error deleting policy');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default policiesRoutes;
