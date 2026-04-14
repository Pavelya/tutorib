/**
 * Job status lifecycle constants.
 *
 * pending → running → succeeded
 *                   → failed_retryable → running (retry)
 *                   → failed_terminal  (dead-letter)
 *          cancelled
 */
export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED_RETRYABLE: 'failed_retryable',
  FAILED_TERMINAL: 'failed_terminal',
  CANCELLED: 'cancelled',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

/** Webhook event verification status. */
export const VERIFICATION_STATUS = {
  VERIFIED: 'verified',
  FAILED: 'failed',
} as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

/** Webhook event processing status. */
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  IGNORED: 'ignored',
  FAILED: 'failed',
} as const;

export type ProcessingStatus =
  (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];

/** Maximum retry attempts before a job becomes terminal. */
export const MAX_JOB_ATTEMPTS = 5;

/** Linear retry delay in minutes per attempt (attempt_number * RETRY_DELAY_MINUTES). */
export const RETRY_DELAY_MINUTES = 2;
