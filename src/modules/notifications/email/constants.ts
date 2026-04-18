/**
 * Stable identifiers for the email delivery channel and its durable job type.
 * Living in their own file keeps the emit boundary free of the Resend-client
 * import path so emit.ts and email/* can coexist without circular resolution.
 */

export const EMAIL_CHANNEL = 'email';

export const JOB_TYPE_SEND_TRANSACTIONAL_EMAIL = 'send_transactional_email';
