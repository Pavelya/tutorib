import { site } from '@/lib/config/site';
import { NOTIFICATION_TYPES } from '../types';
import {
  renderBrandedEmail,
  type BrandedEmailContent,
  type RenderedEmail,
} from './layout';

export interface EmailTemplateInput {
  notificationType: string;
  title: string;
  bodySummary: string | null;
  objectType: string | null;
  objectId: string | null;
}

const CTA_NOTIFICATIONS = { label: 'Open notifications', path: '/notifications' };
const CTA_EARNINGS = { label: 'Open earnings', path: '/tutor/earnings' };

function ctaFor(input: EmailTemplateInput): BrandedEmailContent['cta'] {
  switch (input.notificationType) {
    case NOTIFICATION_TYPES.PAYOUT_READY:
    case NOTIFICATION_TYPES.PAYOUT_HOLD:
      return CTA_EARNINGS;
    default:
      return CTA_NOTIFICATIONS;
  }
}

function subjectFor(input: EmailTemplateInput): string {
  return `${site.name}: ${input.title}`;
}

function baseBody(input: EmailTemplateInput): string[] {
  const summary = input.bodySummary?.trim();
  if (summary && summary.length > 0) return [summary];
  return [`There is an update on your ${site.name} account.`];
}

/**
 * Build the branded content block for a notification. Keeps wording conservative
 * and links back to authenticated surfaces for detail (architecture §8.8).
 */
function contentFor(input: EmailTemplateInput): BrandedEmailContent {
  const body = baseBody(input);

  switch (input.notificationType) {
    case NOTIFICATION_TYPES.LESSON_REQUEST_SUBMITTED:
      return {
        preheader: 'A new lesson request is waiting for your response.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
        closing: `Respond before the request expires so the student can plan.`,
      };
    case NOTIFICATION_TYPES.LESSON_ACCEPTED:
      return {
        preheader: 'Your lesson is confirmed.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
        closing: 'Open the lesson in-app to review the meeting link and prep.',
      };
    case NOTIFICATION_TYPES.LESSON_DECLINED:
      return {
        preheader: 'The lesson request was declined.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
        closing: 'The payment authorization is released — you can request another time.',
      };
    case NOTIFICATION_TYPES.LESSON_EXPIRED:
      return {
        preheader: 'The lesson request expired.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
        closing: 'No charge was made. You can send a new request at any time.',
      };
    case NOTIFICATION_TYPES.LESSON_CANCELLED:
      return {
        preheader: 'A lesson was cancelled.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
    case NOTIFICATION_TYPES.LESSON_RESCHEDULED:
      return {
        preheader: 'A lesson time has changed.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
    case NOTIFICATION_TYPES.LESSON_REMINDER:
      return {
        preheader: 'Your lesson is coming up soon.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
    case NOTIFICATION_TYPES.LESSON_ISSUE_ACKNOWLEDGED:
      return {
        preheader: 'We received your lesson issue report.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
    case NOTIFICATION_TYPES.LESSON_ISSUE_RESOLVED:
      return {
        preheader: 'Your lesson issue has been resolved.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
    case NOTIFICATION_TYPES.PAYOUT_READY:
      return {
        preheader: 'A payout is ready on your earnings page.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
    case NOTIFICATION_TYPES.PAYOUT_HOLD:
      return {
        preheader: 'A payout is on hold and needs your attention.',
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
    case NOTIFICATION_TYPES.LEGAL_UPDATE:
      return {
        preheader: `An update to ${site.name} policies.`,
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
        closing: 'The full update is visible the next time you sign in.',
      };
    default:
      return {
        preheader: `Activity on your ${site.name} account.`,
        heading: input.title,
        bodyLines: body,
        cta: ctaFor(input),
      };
  }
}

export function renderNotificationEmail(
  input: EmailTemplateInput,
): RenderedEmail {
  return renderBrandedEmail(subjectFor(input), contentFor(input));
}
