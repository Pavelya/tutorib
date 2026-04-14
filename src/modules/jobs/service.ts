import { eq, and, lte, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { jobRuns } from './schema';
import {
  JOB_STATUS,
  MAX_JOB_ATTEMPTS,
  RETRY_DELAY_MINUTES,
  type JobStatus,
} from './job-status';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispatchJobInput {
  job_type: string;
  idempotency_key?: string;
  trigger_object_type?: string;
  trigger_object_id?: string;
  payload?: Record<string, unknown>;
  max_attempts?: number;
}

export interface JobRow {
  id: string;
  job_type: string;
  job_status: JobStatus;
  idempotency_key: string | null;
  trigger_object_type: string | null;
  trigger_object_id: string | null;
  payload: unknown;
  attempt_number: number;
  max_attempts: number;
}

// ---------------------------------------------------------------------------
// Dispatch — create a new durable job (idempotent when key is provided)
// ---------------------------------------------------------------------------

export async function dispatchJob(input: DispatchJobInput): Promise<string> {
  const db = getDb();

  // If an idempotency key is provided, try to find an existing job first.
  // Uses INSERT ... ON CONFLICT DO NOTHING + a follow-up select to keep it atomic.
  if (input.idempotency_key) {
    const [existing] = await db
      .select({ id: jobRuns.id })
      .from(jobRuns)
      .where(eq(jobRuns.idempotency_key, input.idempotency_key))
      .limit(1);

    if (existing) {
      return existing.id;
    }
  }

  const [row] = await db
    .insert(jobRuns)
    .values({
      job_type: input.job_type,
      idempotency_key: input.idempotency_key ?? null,
      trigger_object_type: input.trigger_object_type ?? null,
      trigger_object_id: input.trigger_object_id ?? null,
      payload: input.payload ?? null,
      max_attempts: input.max_attempts ?? MAX_JOB_ATTEMPTS,
      job_status: JOB_STATUS.PENDING,
    })
    .onConflictDoNothing({ target: jobRuns.idempotency_key })
    .returning({ id: jobRuns.id });

  // If conflict happened (race condition), fetch the existing row.
  if (!row) {
    const [existing] = await db
      .select({ id: jobRuns.id })
      .from(jobRuns)
      .where(eq(jobRuns.idempotency_key, input.idempotency_key!))
      .limit(1);
    return existing.id;
  }

  return row.id;
}

// ---------------------------------------------------------------------------
// Claim — pick up due jobs for execution (pending or retryable)
// ---------------------------------------------------------------------------

export async function claimDueJobs(limit = 10): Promise<JobRow[]> {
  const db = getDb();
  const now = new Date();

  // Find jobs that are either:
  // 1. pending (never started)
  // 2. failed_retryable with next_retry_at <= now
  const dueJobs = await db
    .select()
    .from(jobRuns)
    .where(
      sql`(${jobRuns.job_status} = ${JOB_STATUS.PENDING})
        OR (${jobRuns.job_status} = ${JOB_STATUS.FAILED_RETRYABLE}
            AND ${jobRuns.next_retry_at} <= ${now})`,
    )
    .limit(limit);

  if (dueJobs.length === 0) return [];

  const jobIds = dueJobs.map((j) => j.id);

  // Mark claimed jobs as running
  await db
    .update(jobRuns)
    .set({
      job_status: JOB_STATUS.RUNNING,
      started_at: now,
      attempt_number: sql`${jobRuns.attempt_number} + 1`,
    })
    .where(
      and(
        inArray(jobRuns.id, jobIds),
        inArray(jobRuns.job_status, [
          JOB_STATUS.PENDING,
          JOB_STATUS.FAILED_RETRYABLE,
        ]),
      ),
    );

  return dueJobs as JobRow[];
}

// ---------------------------------------------------------------------------
// Complete — mark a job as succeeded
// ---------------------------------------------------------------------------

export async function markJobSucceeded(jobId: string): Promise<void> {
  const db = getDb();
  await db
    .update(jobRuns)
    .set({
      job_status: JOB_STATUS.SUCCEEDED,
      finished_at: new Date(),
      failure_code: null,
      failure_message: null,
    })
    .where(eq(jobRuns.id, jobId));
}

// ---------------------------------------------------------------------------
// Fail — mark a job as failed (retryable or terminal with dead-letter log)
// ---------------------------------------------------------------------------

export async function markJobFailed(
  jobId: string,
  error: { code?: string; message: string },
  currentAttempt: number,
  maxAttempts: number,
): Promise<void> {
  const db = getDb();
  const isTerminal = currentAttempt >= maxAttempts;

  if (isTerminal) {
    // Dead-letter: mark as terminal with full failure context
    await db
      .update(jobRuns)
      .set({
        job_status: JOB_STATUS.FAILED_TERMINAL,
        finished_at: new Date(),
        failure_code: error.code ?? 'UNKNOWN',
        failure_message: error.message,
      })
      .where(eq(jobRuns.id, jobId));

    console.error(
      `[dead-letter] job=${jobId} type=unknown attempt=${currentAttempt}/${maxAttempts} code=${error.code ?? 'UNKNOWN'} message=${error.message}`,
    );
  } else {
    // Schedule linear retry: attempt_number * RETRY_DELAY_MINUTES
    const nextRetry = new Date();
    nextRetry.setMinutes(
      nextRetry.getMinutes() + currentAttempt * RETRY_DELAY_MINUTES,
    );

    await db
      .update(jobRuns)
      .set({
        job_status: JOB_STATUS.FAILED_RETRYABLE,
        failure_code: error.code ?? 'UNKNOWN',
        failure_message: error.message,
        next_retry_at: nextRetry,
      })
      .where(eq(jobRuns.id, jobId));
  }
}

// ---------------------------------------------------------------------------
// Cancel — mark a job as cancelled
// ---------------------------------------------------------------------------

export async function cancelJob(jobId: string): Promise<void> {
  const db = getDb();
  await db
    .update(jobRuns)
    .set({
      job_status: JOB_STATUS.CANCELLED,
      finished_at: new Date(),
    })
    .where(eq(jobRuns.id, jobId));
}
