import { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/client';
import { getStorage } from '../storage';
import { enqueuePipelineJob } from '../queue/producer';
import { config } from '../config';

const uploadRoutes: FastifyPluginAsync = async (fastify, options) => {
  // Register multipart plugin locally to this router plugin context
  await fastify.register(multipart, {
    limits: {
      files: 1,
    },
  });

  fastify.post('/upload', async (request, reply) => {
    // Get request ID from header or generate a new one
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : (requestIdHeader as string) || uuidv4();

    request.log.info({ request_id: requestId }, 'Upload request received');

    let fileData;
    try {
      fileData = await request.file();
    } catch (err: any) {
      request.log.error({ request_id: requestId, err }, 'Failed to parse multipart request');
      return reply.status(400).send({ error: 'Failed to parse multipart request' });
    }

    if (!fileData) {
      request.log.warn({ request_id: requestId }, 'Validation failed: No file uploaded');
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    // 1. Content-type must be application/pdf
    if (fileData.mimetype !== 'application/pdf') {
      request.log.warn({ request_id: requestId }, `Validation failed: Invalid content-type ${fileData.mimetype}`);
      return reply.status(400).send({ error: 'Only PDF files are allowed' });
    }

    // Read stream to buffer
    let buffer: Buffer;
    try {
      buffer = await fileData.toBuffer();
    } catch (err: any) {
      request.log.error({ request_id: requestId, err }, 'Failed to read file stream to buffer');
      return reply.status(500).send({ error: 'Failed to read uploaded file' });
    }

    // 2. Magic bytes check (%PDF)
    if (buffer.toString('utf-8', 0, 4) !== '%PDF') {
      request.log.warn({ request_id: requestId }, 'Validation failed: Missing %PDF magic bytes');
      return reply.status(400).send({ error: 'Invalid file format. Only valid PDFs are allowed.' });
    }

    // 3. File size check
    const maxBytes = config.maxFileSizeMb * 1024 * 1024;
    if (buffer.length > maxBytes) {
      request.log.warn({ request_id: requestId, size: buffer.length, max: maxBytes }, 'Validation failed: File too large');
      return reply.status(413).send({ error: `File size exceeds the limit of ${config.maxFileSizeMb}MB` });
    }

    request.log.info({ request_id: requestId }, 'Validation passed');

    const sessionId = uuidv4();
    const policyId = uuidv4();
    const jobId = uuidv4();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert session
      await client.query(
        'INSERT INTO sessions (session_id) VALUES ($1)',
        [sessionId]
      );

      // 2. Insert policy (temporarily with null path)
      await client.query(
        'INSERT INTO policies (policy_id, session_id, raw_pdf_path) VALUES ($1, $2, $3)',
        [policyId, sessionId, null]
      );

      // 3. Insert pipeline_job
      await client.query(
        'INSERT INTO pipeline_jobs (job_id, policy_id, status) VALUES ($1, $2, $3)',
        [jobId, policyId, 'uploaded']
      );

      // 4. Save PDF
      const storage = getStorage();
      const filename = `${policyId}.pdf`;
      const storagePath = await storage.save(buffer, filename, 'application/pdf');
      
      request.log.info({ request_id: requestId, policy_id: policyId, job_id: jobId }, 'Storage save complete');

      // 5. UPDATE policies
      await client.query(
        'UPDATE policies SET raw_pdf_path = $1 WHERE policy_id = $2',
        [storagePath, policyId]
      );

      await client.query('COMMIT');
      
      request.log.info({ request_id: requestId, policy_id: policyId, job_id: jobId }, 'DB transaction committed and inserts complete');
    } catch (transactionError: any) {
      await client.query('ROLLBACK');
      request.log.error({ request_id: requestId, policy_id: policyId, job_id: jobId, err: transactionError }, 'Database transaction failed, rolling back');
      return reply.status(500).send({ error: 'Internal server error during upload database storage' });
    } finally {
      client.release();
    }

    // 6. Enqueue pipeline job (outside transaction, failure does not roll back)
    try {
      await enqueuePipelineJob(jobId, policyId);
      request.log.info({ request_id: requestId, policy_id: policyId, job_id: jobId }, 'Pipeline job enqueued');
    } catch (enqueueError: any) {
      request.log.error({ request_id: requestId, policy_id: policyId, job_id: jobId, err: enqueueError }, 'Failed to enqueue pipeline job');
    }

    return reply.status(200).send({
      job_id: jobId,
      policy_id: policyId,
      session_id: sessionId,
    });
  });
};

export default uploadRoutes;
