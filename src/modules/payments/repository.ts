import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { payments } from './schema';

export type PaymentRow = typeof payments.$inferSelect;

export interface InsertPaymentInput {
  lessonId: string;
  payerAppUserId: string;
  amount: string;
  currencyCode: string;
  stripeCheckoutSessionId: string | null;
}

export async function insertPendingPayment(
  input: InsertPaymentInput,
): Promise<PaymentRow> {
  const db = getDb();
  const [row] = await db
    .insert(payments)
    .values({
      lesson_id: input.lessonId,
      payer_app_user_id: input.payerAppUserId,
      amount: input.amount,
      currency_code: input.currencyCode,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      payment_status: 'pending',
    })
    .returning();
  return row;
}

export async function attachCheckoutSessionToPayment(
  paymentId: string,
  sessionId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(payments)
    .set({
      stripe_checkout_session_id: sessionId,
      updated_at: new Date(),
    })
    .where(eq(payments.id, paymentId));
}

export async function findPaymentByCheckoutSessionId(
  sessionId: string,
): Promise<PaymentRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.stripe_checkout_session_id, sessionId))
    .limit(1);
  return rows[0];
}

export interface AuthorizePaymentInput {
  paymentId: string;
  stripePaymentIntentId: string;
  authorizedAt: Date;
  authorizationExpiresAt: Date;
}

export async function markPaymentAuthorized(
  input: AuthorizePaymentInput,
): Promise<void> {
  const db = getDb();
  await db
    .update(payments)
    .set({
      payment_status: 'authorized',
      stripe_payment_intent_id: input.stripePaymentIntentId,
      authorized_at: input.authorizedAt,
      authorization_expires_at: input.authorizationExpiresAt,
      updated_at: new Date(),
    })
    .where(eq(payments.id, input.paymentId));
}
