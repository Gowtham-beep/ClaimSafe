import { Worker, Job } from 'bullmq';
import { connection } from './client';

// Initialize the BullMQ worker for the 'pipeline' queue
export const worker = new Worker(
  'pipeline',
  async (job: Job) => {
    // Boilerplate process function that logs job.id and returns
    console.log(`[Queue Worker] Processing job ID: ${job.id}`);
    
    // No business logic yet - just return a simple state
    return { status: 'processed_skeleton' };
  },
  {
    connection: connection as any,
  }
);

worker.on('completed', (job) => {
  console.log(`[Queue Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[Queue Worker] Job ${job?.id} failed with error:`, err);
});
