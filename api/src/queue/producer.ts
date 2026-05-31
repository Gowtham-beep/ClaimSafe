import { Queue } from 'bullmq';
import { connection } from './client';

// Initialize the BullMQ queue named 'pipeline'
const pipelineQueue = new Queue('pipeline', {
  connection: connection as any,
});

/**
 * Enqueues a job in the BullMQ 'pipeline' queue.
 *
 * @param jobId The database pipeline job ID
 * @param policyId The associated policy ID
 * @param pdfPath The GCP Cloud Storage path of the PDF
 */
export async function enqueuePipelineJob(
  jobId: string,
  policyId: string,
  pdfPath: string
): Promise<void> {
  await pipelineQueue.add(
    'process-policy',
    {
      jobId,
      policyId,
      pdfPath,
    },
    {
      jobId, // Match the BullMQ job ID with our database pipeline job ID
      attempts: 3, // Retries are handled per-pass but configured here as well
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );
}
