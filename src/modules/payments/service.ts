import type Stripe from 'stripe';
import {
  findPaymentByCheckoutSessionId,
  markPaymentAuthorized,
} from './repository';

// ---------------------------------------------------------------------------
// Acceptance-time capture handoff boundary
// ---------------------------------------------------------------------------
// When Stripe Checkout completes in authorization-only mode, the payment
// transitions from `pending` to `authorized`. The authorization is held
// until the tutor accepts (capture) or declines/expires (release).
//
// Capture and release themselves live in P1-LESS-002.
//
// Card authorizations typically expire after 7 days; we record that
// horizon so the authorization-expiry job (P1-JOBS-001) can act on it.
// ---------------------------------------------------------------------------

const CARD_AUTHORIZATION_HOLD_DAYS = 7;

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ status: 'processed' | 'ignored' }> {
  if (session.mode !== 'payment') {
    return { status: 'ignored' };
  }

  const payment = await findPaymentByCheckoutSessionId(session.id);
  if (!payment) {
    return { status: 'ignored' };
  }

  if (payment.payment_status !== 'pending') {
    // Already authorized (or resolved) — safe replay, no-op.
    return { status: 'processed' };
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    return { status: 'ignored' };
  }

  const authorizedAt = new Date();
  const authorizationExpiresAt = new Date(
    authorizedAt.getTime() + CARD_AUTHORIZATION_HOLD_DAYS * 24 * 60 * 60 * 1000,
  );

  await markPaymentAuthorized({
    paymentId: payment.id,
    stripePaymentIntentId: paymentIntentId,
    authorizedAt,
    authorizationExpiresAt,
  });

  return { status: 'processed' };
}
