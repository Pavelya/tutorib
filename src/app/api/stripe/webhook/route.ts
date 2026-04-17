import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { getServerEnv } from '@/lib/env/server';
import { getStripe } from '@/lib/stripe/client';
import {
  recordWebhookEvent,
  markWebhookProcessed,
  markWebhookIgnored,
  markWebhookFailed,
} from '@/modules/jobs/webhook-service';
import { VERIFICATION_STATUS } from '@/modules/jobs/job-status';
import { handleCheckoutSessionCompleted } from '@/modules/payments/service';

/**
 * Stripe webhook events that the system currently handles.
 * Domain-specific processing is dispatched by later tasks
 * (P1-BOOK-001, P1-TUTOR-005, P1-LESS-002).
 *
 * This route handles: verify → record → deduplicate → dispatch.
 */
const HANDLED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'payment_intent.amount_capturable_updated',
  'charge.captured',
  'charge.refunded',
  'account.updated',
]);

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  // Step 1: Verify signature
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    console.error('[stripe-webhook] Signature verification failed:', message);
    return NextResponse.json(
      { error: 'Signature verification failed' },
      { status: 400 },
    );
  }

  // Step 2: Record and deduplicate
  const { event: webhookRow, isNew } = await recordWebhookEvent({
    provider: 'stripe',
    provider_event_id: event.id,
    event_type: event.type,
    verification_status: VERIFICATION_STATUS.VERIFIED,
  });

  // Duplicate delivery — skip silently
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Step 3: Check if we handle this event type
  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    await markWebhookIgnored(webhookRow.id);
    return NextResponse.json({ received: true });
  }

  // Step 4: Dispatch to domain handlers.
  // P1-BOOK-001 owns `checkout.session.completed` — transitions payment to
  // `authorized`. Capture/release events (`charge.captured`, `charge.refunded`)
  // belong to P1-LESS-002; Connect events (`account.updated`) to P1-TUTOR-005.
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      revalidatePath('/lessons');
    }
    await markWebhookProcessed(webhookRow.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    await markWebhookFailed(webhookRow.id, message);
    console.error(
      `[stripe-webhook] Processing failed for event=${event.id} type=${event.type}: ${message}`,
    );
  }

  return NextResponse.json({ received: true });
}
