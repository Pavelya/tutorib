import { registerJobHandler } from '@/modules/jobs/cron-runner';
import { sendNotificationEmailDelivery } from './service';
import { JOB_TYPE_SEND_TRANSACTIONAL_EMAIL } from './constants';

export { JOB_TYPE_SEND_TRANSACTIONAL_EMAIL };

interface SendEmailPayload {
  deliveryId: string;
}

function parsePayload(payload: unknown): SendEmailPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as { deliveryId?: unknown }).deliveryId !== 'string'
  ) {
    throw new Error('send_transactional_email payload missing deliveryId');
  }
  return payload as SendEmailPayload;
}

let _registered = false;

/**
 * Register the transactional-email job handler exactly once.
 *
 * Called from the cron route (and anywhere that wants to run jobs in-process)
 * so the handler is wired up before `processDueJobs` dispatches.
 */
export function registerTransactionalEmailHandler(): void {
  if (_registered) return;
  _registered = true;
  registerJobHandler(JOB_TYPE_SEND_TRANSACTIONAL_EMAIL, async (job) => {
    const { deliveryId } = parsePayload(job.payload);
    await sendNotificationEmailDelivery(deliveryId);
  });
}
