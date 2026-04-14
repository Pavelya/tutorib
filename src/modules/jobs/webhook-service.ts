import { eq, and } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { webhookEvents } from './schema';
import { VERIFICATION_STATUS, PROCESSING_STATUS } from './job-status';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordWebhookInput {
  provider: string;
  provider_event_id: string;
  event_type: string;
  verification_status: 'verified' | 'failed';
  payload?: Record<string, unknown>;
}

export interface WebhookEventRow {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  processing_status: string;
}

// ---------------------------------------------------------------------------
// Record — verify, record, deduplicate
// ---------------------------------------------------------------------------

/**
 * Records a webhook event. Returns the row and whether it is new (not a duplicate).
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING for atomic dedup on
 * (provider, provider_event_id).
 */
export async function recordWebhookEvent(
  input: RecordWebhookInput,
): Promise<{ event: WebhookEventRow; isNew: boolean }> {
  const db = getDb();

  const [inserted] = await db
    .insert(webhookEvents)
    .values({
      provider: input.provider,
      provider_event_id: input.provider_event_id,
      event_type: input.event_type,
      verification_status: input.verification_status,
      processing_status:
        input.verification_status === VERIFICATION_STATUS.FAILED
          ? PROCESSING_STATUS.FAILED
          : PROCESSING_STATUS.PENDING,
      payload: input.payload ?? null,
    })
    .onConflictDoNothing()
    .returning({
      id: webhookEvents.id,
      provider: webhookEvents.provider,
      provider_event_id: webhookEvents.provider_event_id,
      event_type: webhookEvents.event_type,
      processing_status: webhookEvents.processing_status,
    });

  if (inserted) {
    return { event: inserted, isNew: true };
  }

  // Duplicate — fetch existing record
  const [existing] = await db
    .select({
      id: webhookEvents.id,
      provider: webhookEvents.provider,
      provider_event_id: webhookEvents.provider_event_id,
      event_type: webhookEvents.event_type,
      processing_status: webhookEvents.processing_status,
    })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.provider, input.provider),
        eq(webhookEvents.provider_event_id, input.provider_event_id),
      ),
    )
    .limit(1);

  return { event: existing, isNew: false };
}

// ---------------------------------------------------------------------------
// Status updates
// ---------------------------------------------------------------------------

export async function markWebhookProcessed(eventId: string): Promise<void> {
  const db = getDb();
  await db
    .update(webhookEvents)
    .set({
      processing_status: PROCESSING_STATUS.PROCESSED,
      processed_at: new Date(),
    })
    .where(eq(webhookEvents.id, eventId));
}

export async function markWebhookIgnored(eventId: string): Promise<void> {
  const db = getDb();
  await db
    .update(webhookEvents)
    .set({
      processing_status: PROCESSING_STATUS.IGNORED,
      processed_at: new Date(),
    })
    .where(eq(webhookEvents.id, eventId));
}

export async function markWebhookFailed(
  eventId: string,
  failureMessage: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(webhookEvents)
    .set({
      processing_status: PROCESSING_STATUS.FAILED,
      failure_message: failureMessage,
      processed_at: new Date(),
    })
    .where(eq(webhookEvents.id, eventId));
}
