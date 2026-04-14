import { after } from 'next/server';

/**
 * Schedule short post-response work via Next.js `after()`.
 *
 * Use ONLY for lightweight, non-critical side effects under ~100ms:
 * - audit logging
 * - lightweight event recording
 * - enqueueing durable jobs that have already been persisted
 *
 * Do NOT use for:
 * - sending emails or external API calls
 * - business-critical mutations
 * - anything that needs retry or durability
 *
 * Those belong in the durable job system (dispatchJob).
 */
export function scheduleAfter(fn: () => Promise<void> | void): void {
  after(async () => {
    try {
      await fn();
    } catch (err) {
      console.error('[after] post-response work failed:', err);
    }
  });
}
