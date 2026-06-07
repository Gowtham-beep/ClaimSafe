import { Worker, Job } from 'bullmq';
import pino from 'pino';
import { connection } from './client';
import { query } from '../db/client';
import { runPass0 } from '../pipeline/pass0';
import { runPass1 } from '../pipeline/pass1';
import { config } from '../config';

const logger = pino({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
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
});

export const worker = new Worker(
  'pipeline',
  async (job: Job) => {
    const { jobId, policyId } = job.data as { jobId: string; policyId: string };
    
    // Generate requestId = jobId (use as correlation ID throughout)
    const requestId = jobId;
    const log = logger.child({ request_id: requestId, job_id: jobId, policy_id: policyId });
    
    log.info(`[Queue Worker] Processing job ID: ${jobId}`);

    try {
      // 1. Update status to "extracting"
      await query(
        'UPDATE pipeline_jobs SET status = $1, updated_at = NOW() WHERE job_id = $2',
        ['extracting', jobId]
      );
      log.info('Job status updated to extracting');

      // 2. Call runPass0
      const { result: pass0Result, chunks, chunking_strategy } = await runPass0(jobId, policyId, requestId);

      // 3. Update pipeline_jobs and policies on Pass 0 success
      await query(
        `UPDATE pipeline_jobs 
         SET status = $1, pass0_at = NOW(), chunking_strategy = $2, updated_at = NOW() 
         WHERE job_id = $3`,
        ['pass0_complete', chunking_strategy, jobId]
      );

      await query(
        'UPDATE policies SET policy_type = $1, insurer = $2 WHERE policy_id = $3',
        [pass0Result.policy_type, pass0Result.insurer, policyId]
      );

      log.info({ pass0Result }, 'Pass 0 successfully complete and DB updated');

      // 4. Run Pass 1 (sequential structured extraction via Gemini)
      await runPass1(jobId, policyId, requestId, pass0Result, chunks);

      // 5. Update status to "pass1_complete" on success
      await query(
        `UPDATE pipeline_jobs 
         SET status = $1, pass1_at = NOW(), updated_at = NOW() 
         WHERE job_id = $2`,
        ['pass1_complete', jobId]
      );

      log.info('Pass 1 successfully complete and DB updated');
      return { status: 'pass1_complete' };
    } catch (err: any) {
      log.error({ err }, `Error processing job ${jobId}: ${err.message}`);
      
      // Update status to "failed" and record error
      await query(
        `UPDATE pipeline_jobs 
         SET status = $1, failed_at = NOW(), error = $2, retry_count = retry_count + 1, updated_at = NOW() 
         WHERE job_id = $3`,
        ['failed', err.message || 'Unknown error', jobId]
      );
      
      // Re-throw to trigger BullMQ retries
      throw err;
    }
  },
  {
    connection: connection as any,
  }
);

worker.on('completed', (job) => {
  logger.info(`[Queue Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Queue Worker] Job ${job?.id} failed with error:`, err);
});
