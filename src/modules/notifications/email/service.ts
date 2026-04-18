import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { getResend } from '@/lib/resend/client';
import { getServerEnv } from '@/lib/env/server';
import { appUsers } from '@/modules/accounts/schema';
import {
  findNotificationDeliveryById,
  findNotificationById,
  markDeliverySent,
  markDeliveryFailed,
} from '../repository';
import { renderNotificationEmail } from './templates';
import { EMAIL_CHANNEL } from './constants';

const SENT_STATUS = 'sent';

/**
 * Send a transactional email for a queued notification delivery.
 *
 * Idempotent by delivery ID — uses the Resend idempotency-key header so a
 * re-run after the provider already accepted the send does not duplicate.
 *
 * Throws on transient or provider failure so the caller (job runner) can
 * apply retry/backoff. The delivery row is updated to `failed` before the
 * throw so failures are observable at the notification-delivery boundary.
 */
export async function sendNotificationEmailDelivery(
  deliveryId: string,
): Promise<void> {
  const delivery = await findNotificationDeliveryById(deliveryId);
  if (!delivery) {
    throw new Error(`notification delivery not found: ${deliveryId}`);
  }

  if (delivery.channel !== EMAIL_CHANNEL) {
    throw new Error(
      `delivery ${deliveryId} is not an email channel (channel=${delivery.channel})`,
    );
  }

  if (delivery.delivery_status === SENT_STATUS) {
    return;
  }

  const notification = await findNotificationById(delivery.notification_id);
  if (!notification) {
    throw new Error(
      `notification not found for delivery ${deliveryId}: ${delivery.notification_id}`,
    );
  }

  const db = getDb();
  const [recipient] = await db
    .select({ email: appUsers.email, status: appUsers.account_status })
    .from(appUsers)
    .where(eq(appUsers.id, notification.app_user_id))
    .limit(1);

  if (!recipient) {
    await markDeliveryFailed(deliveryId);
    throw new Error(
      `recipient app user not found for notification ${notification.id}`,
    );
  }

  if (recipient.status !== 'active') {
    await markDeliveryFailed(deliveryId);
    throw new Error(
      `recipient account is not active (status=${recipient.status}) for notification ${notification.id}`,
    );
  }

  const rendered = renderNotificationEmail({
    notificationType: notification.notification_type,
    title: notification.title,
    bodySummary: notification.body_summary,
    objectType: notification.object_type,
    objectId: notification.object_id,
  });

  try {
    const result = await getResend().emails.send(
      {
        from: getServerEnv().RESEND_FROM_EMAIL,
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      { idempotencyKey: deliveryId },
    );

    if (result.error) {
      await markDeliveryFailed(deliveryId);
      throw new Error(
        `resend rejected email for delivery ${deliveryId}: ${result.error.name}: ${result.error.message}`,
      );
    }

    await markDeliverySent(deliveryId, result.data?.id ?? null);
  } catch (err) {
    if (delivery.delivery_status !== 'failed') {
      await markDeliveryFailed(deliveryId);
    }
    throw err;
  }
}
