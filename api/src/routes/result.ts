import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/client';

const resultRoutes: FastifyPluginAsync = async (fastify, options) => {
  fastify.get('/result/:policy_id', async (request, reply) => {
    const { policy_id } = request.params as { policy_id: string };
    
    // Get request ID from header or generate a new one
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : (requestIdHeader as string) || uuidv4();

    request.log.info({ request_id: requestId, policy_id }, 'GET /result/:policy_id request received');

    try {
      const res = await query(
        `SELECT 
          p.policy_id, p.insurer, p.policy_type, p.sum_insured, p.premium, p.policy_period,
          j.status,
          a.risk_flags, a.exclusions, a.waiting_periods, a.sublimits, a.copayments, a.coverage_summary, a.claim_tips
         FROM policies p
         LEFT JOIN pipeline_jobs j ON p.policy_id = j.policy_id
         LEFT JOIN analysis_results a ON p.policy_id = a.policy_id
         WHERE p.policy_id = $1`,
        [policy_id]
      );

      request.log.info({ request_id: requestId, row_count: res.rows.length }, 'DB query result outcome');

      if (res.rows.length === 0) {
        request.log.warn({ request_id: requestId, policy_id }, 'Policy not found');
        return reply.status(404).send({ error: 'Policy not found' });
      }

      const row = res.rows[0];

      if (row.status !== 'done') {
        request.log.info({ request_id: requestId, policy_id, status: row.status }, 'Policy analysis not complete yet');
        return reply.status(202).send({
          status: row.status || 'unknown',
          message: 'Analysis not complete yet',
        });
      }

      return reply.status(200).send({
        policy_id: row.policy_id,
        insurer: row.insurer,
        policy_type: row.policy_type,
        sum_insured: row.sum_insured,
        premium: row.premium,
        policy_period: row.policy_period,
        risk_flags: row.risk_flags || [],
        exclusions: row.exclusions || [],
        waiting_periods: row.waiting_periods || [],
        sublimits: row.sublimits || [],
        copayments: row.copayments || [],
        coverage_summary: row.coverage_summary || '',
        claim_tips: row.claim_tips || [],
      });
    } catch (err: any) {
      request.log.error({ request_id: requestId, err: err.message || err }, 'Error fetching policy result');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default resultRoutes;
