import {
  claimDueJobs,
  markJobSucceeded,
  markJobFailed,
  type JobRow,
} from './service';

/**
 * Registry of job-type handlers.
 *
 * Domain modules register their handlers here so the cron runner
 * can dispatch to the correct logic per job_type.
 *
 * Each handler receives the job row and should throw on failure.
 */
type JobHandler = (job: JobRow) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(jobType: string, handler: JobHandler): void {
  handlers.set(jobType, handler);
}

/**
 * Process due jobs — called by the Vercel Cron route.
 *
 * Claims pending and retryable jobs, dispatches each to its registered
 * handler, and marks them as succeeded or failed accordingly.
 *
 * Returns the number of jobs processed.
 */
export async function processDueJobs(batchSize = 10): Promise<number> {
  const jobs = await claimDueJobs(batchSize);

  for (const job of jobs) {
    const handler = handlers.get(job.job_type);

    if (!handler) {
      await markJobFailed(
        job.id,
        { code: 'NO_HANDLER', message: `No handler registered for job type: ${job.job_type}` },
        job.attempt_number + 1,
        job.max_attempts,
      );
      continue;
    }

    try {
      await handler(job);
      await markJobSucceeded(job.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      const code =
        err instanceof Error && 'code' in err
          ? String((err as Error & { code?: string }).code)
          : 'HANDLER_ERROR';

      await markJobFailed(
        job.id,
        { code, message },
        job.attempt_number + 1,
        job.max_attempts,
      );
    }
  }

  return jobs.length;
}
