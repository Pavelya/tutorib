import { DateTime } from 'luxon';
import { resolveAccountState } from '@/modules/accounts/service';
import {
  countActiveAvailabilityRules,
  countTutorOverviewMetrics,
  findTutorIdentityByAppUserId,
  findTutorOverviewLessons,
  type TutorOverviewLessonRow,
  type TutorOwnIdentityRow,
} from './overview-repository';
import type {
  TutorListingDisplayStatus,
  TutorNextActionDto,
  TutorOverviewDto,
  TutorOverviewResult,
  TutorReadinessDto,
  TutorReadinessGateDto,
  TutorReadinessGateStatus,
} from './overview-dto';

// Cap on the urgency-ordered next-action list. The overview is a
// "what should I do now?" surface — long lists belong on the tutor
// lessons hub (owned by P1-TUTOR-002).
const NEXT_ACTIONS_LIMIT = 5;

// ---------------------------------------------------------------------------
// Read: resolve the tutor overview for the current actor.
// ---------------------------------------------------------------------------

export async function getTutorOverview(): Promise<TutorOverviewResult> {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    return { status: 'unauthenticated' };
  }

  if (
    state.status !== 'tutor_active' &&
    state.status !== 'tutor_pending_review'
  ) {
    return { status: 'forbidden' };
  }

  const identity = await findTutorIdentityByAppUserId(state.appUser.id);
  if (!identity) {
    return { status: 'forbidden' };
  }

  const now = new Date();
  const [metrics, lessonRows, scheduleRuleCount] = await Promise.all([
    countTutorOverviewMetrics(identity.tutor_profile_id, now),
    findTutorOverviewLessons(identity.tutor_profile_id, now),
    countActiveAvailabilityRules(identity.tutor_profile_id),
  ]);

  const readiness = buildReadiness(identity, scheduleRuleCount);
  const nextActions = buildNextActions(lessonRows, DateTime.fromJSDate(now));

  const overview: TutorOverviewDto = {
    tutor: {
      display_name:
        identity.display_name ?? identity.full_name ?? 'Tutor',
      headline: identity.headline,
      timezone: identity.timezone ?? 'UTC',
    },
    readiness,
    metrics,
    next_actions: nextActions,
  };

  return { status: 'ok', overview };
}

// ---------------------------------------------------------------------------
// Readiness panel shaping — maps stored statuses onto the canonical gate
// vocabulary defined in `tutor-listing-readiness-model-v1.md`.
// ---------------------------------------------------------------------------

function buildReadiness(
  identity: TutorOwnIdentityRow,
  scheduleRuleCount: number,
): TutorReadinessDto {
  const gates: TutorReadinessGateDto[] = [
    {
      gate: 'application',
      label: 'Application approved',
      status: mapApplicationStatus(identity.application_status),
      hint: applicationHint(identity.application_status),
    },
    {
      gate: 'profile',
      label: 'Profile complete',
      status: mapProfileStatus(identity.profile_visibility_status),
      hint: profileHint(identity.profile_visibility_status),
    },
    {
      gate: 'schedule',
      label: 'Schedule set',
      status: scheduleRuleCount > 0 ? 'complete' : 'not_started',
      hint:
        scheduleRuleCount > 0
          ? null
          : 'Add recurring availability so students can book.',
    },
    {
      gate: 'payout',
      label: 'Payout ready',
      status: mapPayoutStatus(identity.payout_readiness_status),
      hint: payoutHint(identity.payout_readiness_status),
    },
  ];

  const listingStatus = normalizeListingStatus(identity.public_listing_status);
  const listingMessage = listingMessageFor(listingStatus, identity.account_status);

  return {
    listing_status: listingStatus,
    listing_message: listingMessage,
    gates,
  };
}

function mapApplicationStatus(value: string): TutorReadinessGateStatus {
  switch (value) {
    case 'approved':
      return 'complete';
    case 'under_review':
      return 'under_review';
    case 'rejected':
      return 'blocked';
    case 'submitted':
      return 'in_progress';
    default:
      return 'not_started';
  }
}

function applicationHint(value: string): string | null {
  switch (value) {
    case 'approved':
      return null;
    case 'under_review':
      return 'Your application is being reviewed.';
    case 'rejected':
      return 'Your application was not approved. Check your notifications.';
    case 'submitted':
      return 'Your application has been received.';
    default:
      return 'Submit your tutor application to get started.';
  }
}

function mapProfileStatus(value: string): TutorReadinessGateStatus {
  switch (value) {
    case 'published':
      return 'complete';
    case 'ready_to_publish':
      return 'in_progress';
    case 'draft':
      return 'in_progress';
    default:
      return 'not_started';
  }
}

function profileHint(value: string): string | null {
  if (value === 'published') return null;
  return 'Finish your public profile so students can learn about you.';
}

function mapPayoutStatus(value: string): TutorReadinessGateStatus {
  switch (value) {
    case 'enabled':
      return 'complete';
    case 'pending_verification':
      return 'under_review';
    case 'restricted':
      return 'blocked';
    case 'in_progress':
      return 'in_progress';
    default:
      return 'not_started';
  }
}

function payoutHint(value: string): string | null {
  switch (value) {
    case 'enabled':
      return null;
    case 'pending_verification':
      return 'Stripe is verifying your payout details.';
    case 'restricted':
      return 'Your payout account needs attention.';
    case 'in_progress':
      return 'Finish your Stripe onboarding to receive payouts.';
    default:
      return 'Start your Stripe payout setup.';
  }
}

function normalizeListingStatus(value: string): TutorListingDisplayStatus {
  if (
    value === 'listed' ||
    value === 'eligible' ||
    value === 'paused' ||
    value === 'delisted'
  ) {
    return value;
  }
  return 'not_listed';
}

function listingMessageFor(
  listing: TutorListingDisplayStatus,
  accountStatus: string,
): string {
  if (accountStatus === 'suspended') {
    return 'Your account is suspended. Check your notifications for details.';
  }
  switch (listing) {
    case 'listed':
      return 'Your profile is live.';
    case 'eligible':
      return "All set — you're moving into public listing now.";
    case 'paused':
      return 'Your profile is temporarily paused — check notifications for details.';
    case 'delisted':
      return 'Your profile has been removed from public listing — check notifications for details.';
    default:
      return 'Complete your setup to go live.';
  }
}

// ---------------------------------------------------------------------------
// Next-action shaping — pending requests first (expiry urgency), then
// upcoming lessons (start urgency). Capped so the overview stays decision-led.
// ---------------------------------------------------------------------------

function buildNextActions(
  rows: TutorOverviewLessonRow[],
  now: DateTime,
): TutorNextActionDto[] {
  const pending: TutorNextActionDto[] = [];
  const upcoming: TutorNextActionDto[] = [];

  for (const row of rows) {
    const action = toNextActionDto(row, now);
    if (!action) continue;
    if (action.kind === 'pending_request') pending.push(action);
    else upcoming.push(action);
  }

  pending.sort(byPendingUrgency);
  upcoming.sort(byStartUrgency);

  return [...pending, ...upcoming].slice(0, NEXT_ACTIONS_LIMIT);
}

function toNextActionDto(
  row: TutorOverviewLessonRow,
  now: DateTime,
): TutorNextActionDto | null {
  const start = DateTime.fromJSDate(row.scheduled_start_at);
  const end = DateTime.fromJSDate(row.scheduled_end_at);

  let kind: TutorNextActionDto['kind'];
  let urgencyLabel: string;

  if (row.lesson_status === 'requested') {
    kind = 'pending_request';
    urgencyLabel = buildExpiryLabel(row.request_expires_at, now);
  } else if (row.lesson_status === 'accepted' && end >= now) {
    kind = 'upcoming_lesson';
    urgencyLabel = buildStartLabel(start, now);
  } else {
    return null;
  }

  return {
    kind,
    lesson_id: row.lesson_id,
    scheduled_start_at: row.scheduled_start_at.toISOString(),
    scheduled_end_at: row.scheduled_end_at.toISOString(),
    lesson_timezone: row.lesson_timezone,
    subject_snapshot: row.subject_snapshot,
    focus_snapshot: row.focus_snapshot,
    request_expires_at: row.request_expires_at
      ? row.request_expires_at.toISOString()
      : null,
    student: {
      display_name:
        row.student_display_name ?? row.student_full_name ?? 'Student',
      avatar_url: row.student_avatar_url,
    },
    urgency_label: urgencyLabel,
  };
}

function buildExpiryLabel(expiresAt: Date | null, now: DateTime): string {
  if (!expiresAt) return 'Respond to request';
  const expiry = DateTime.fromJSDate(expiresAt);
  const hours = expiry.diff(now, 'hours').hours;
  if (hours <= 0) return 'Expired';
  if (hours < 1) return `Respond within ${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `Respond within ${Math.round(hours)}h`;
  return `Respond within ${Math.round(hours / 24)}d`;
}

function buildStartLabel(start: DateTime, now: DateTime): string {
  const hours = start.diff(now, 'hours').hours;
  if (hours <= 0) return 'In progress';
  if (hours < 1) return `Starts in ${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `Starts in ${Math.round(hours)}h`;
  return `Starts in ${Math.round(hours / 24)}d`;
}

function byPendingUrgency(a: TutorNextActionDto, b: TutorNextActionDto): number {
  const aExp = a.request_expires_at ?? a.scheduled_start_at;
  const bExp = b.request_expires_at ?? b.scheduled_start_at;
  return aExp.localeCompare(bExp);
}

function byStartUrgency(a: TutorNextActionDto, b: TutorNextActionDto): number {
  return a.scheduled_start_at.localeCompare(b.scheduled_start_at);
}
