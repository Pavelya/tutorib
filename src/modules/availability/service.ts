import { resolveAccountState } from '@/modules/accounts/service';
import {
  deleteAvailabilityRuleOwned,
  findActiveMeetingProviders,
  findAvailabilityRules,
  findMeetingPreference,
  findSchedulePolicy,
  findTutorScheduleIdentity,
  insertAvailabilityRule,
  isKnownMeetingProvider,
  upsertMeetingPreference,
  upsertSchedulePolicy,
} from './repository';
import type {
  AvailabilityRuleDto,
  AvailabilityRuleVisibility,
  MeetingPreferenceDto,
  SchedulePolicyDto,
  TutorScheduleResult,
} from './dto';
import type {
  CreateAvailabilityRuleInput,
  DeleteAvailabilityRuleInput,
  UpdateMeetingPreferenceInput,
  UpdateSchedulePolicyInput,
} from './validation';

const DEFAULT_TIMEZONE = 'UTC';

// Phase 1 minimum booking notice. Slot generation hides anything inside this
// window even if the tutor has technically set a smaller value somewhere.
const PHASE1_MINIMUM_NOTICE_FLOOR = 480;

// ---------------------------------------------------------------------------
// Read: full schedule view for the current tutor.
// ---------------------------------------------------------------------------

export async function getTutorSchedule(): Promise<TutorScheduleResult> {
  const auth = await requireTutor();
  if (auth.kind !== 'ok') return auth.result;
  const { tutorProfileId, accountTimezone } = auth;

  const [policyRow, ruleRows, preferenceRow, providerRows] = await Promise.all([
    findSchedulePolicy(tutorProfileId),
    findAvailabilityRules(tutorProfileId),
    findMeetingPreference(tutorProfileId),
    findActiveMeetingProviders(),
  ]);

  const policy: SchedulePolicyDto = policyRow
    ? {
        timezone: policyRow.timezone,
        minimum_notice_minutes: policyRow.minimum_notice_minutes,
        buffer_before_minutes: policyRow.buffer_before_minutes,
        buffer_after_minutes: policyRow.buffer_after_minutes,
        daily_capacity: policyRow.daily_capacity,
        weekly_capacity: policyRow.weekly_capacity,
        is_accepting_new_students: policyRow.is_accepting_new_students,
      }
    : {
        timezone: accountTimezone ?? DEFAULT_TIMEZONE,
        minimum_notice_minutes: PHASE1_MINIMUM_NOTICE_FLOOR,
        buffer_before_minutes: 0,
        buffer_after_minutes: 0,
        daily_capacity: null,
        weekly_capacity: null,
        is_accepting_new_students: true,
      };

  const rules: AvailabilityRuleDto[] = ruleRows.map((row) => ({
    id: row.id,
    day_of_week: row.day_of_week,
    start_local_time: trimLocalTime(row.start_local_time),
    end_local_time: trimLocalTime(row.end_local_time),
    visibility_status: normalizeVisibility(row.visibility_status),
  }));

  const meeting_preference: MeetingPreferenceDto = preferenceRow
    ? {
        provider_key: preferenceRow.provider_key,
        default_meeting_url: preferenceRow.default_meeting_url,
        display_label: preferenceRow.display_label,
        is_active: preferenceRow.is_active,
        last_validated_at: preferenceRow.last_validated_at
          ? preferenceRow.last_validated_at.toISOString()
          : null,
      }
    : {
        provider_key: null,
        default_meeting_url: null,
        display_label: null,
        is_active: false,
        last_validated_at: null,
      };

  return {
    status: 'ok',
    schedule: {
      policy,
      rules,
      meeting_preference,
      meeting_provider_options: providerRows.map((p) => ({
        key: p.key,
        name: p.name,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type ScheduleMutationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function updateSchedulePolicy(
  input: UpdateSchedulePolicyInput,
): Promise<ScheduleMutationResult> {
  const auth = await requireTutor();
  if (auth.kind !== 'ok') return mutationFromAuth(auth.result);

  if (input.bufferBeforeMinutes + input.bufferAfterMinutes > 240) {
    return {
      ok: false,
      code: 'buffers_too_long',
      message: 'Combined buffers cannot exceed 4 hours.',
    };
  }

  await upsertSchedulePolicy({
    tutorProfileId: auth.tutorProfileId,
    timezone: input.timezone,
    minimumNoticeMinutes: input.minimumNoticeMinutes,
    bufferBeforeMinutes: input.bufferBeforeMinutes,
    bufferAfterMinutes: input.bufferAfterMinutes,
    dailyCapacity: input.dailyCapacity,
    weeklyCapacity: input.weeklyCapacity,
    isAcceptingNewStudents: input.isAcceptingNewStudents,
  });

  return { ok: true };
}

export async function createAvailabilityRule(
  input: CreateAvailabilityRuleInput,
): Promise<ScheduleMutationResult> {
  const auth = await requireTutor();
  if (auth.kind !== 'ok') return mutationFromAuth(auth.result);

  await insertAvailabilityRule({
    tutorProfileId: auth.tutorProfileId,
    dayOfWeek: input.dayOfWeek,
    startLocalTime: `${input.startLocalTime}:00`,
    endLocalTime: `${input.endLocalTime}:00`,
  });

  return { ok: true };
}

export async function deleteAvailabilityRule(
  input: DeleteAvailabilityRuleInput,
): Promise<ScheduleMutationResult> {
  const auth = await requireTutor();
  if (auth.kind !== 'ok') return mutationFromAuth(auth.result);

  await deleteAvailabilityRuleOwned(auth.tutorProfileId, input.ruleId);
  return { ok: true };
}

export async function updateMeetingPreference(
  input: UpdateMeetingPreferenceInput,
): Promise<ScheduleMutationResult> {
  const auth = await requireTutor();
  if (auth.kind !== 'ok') return mutationFromAuth(auth.result);

  const known = await isKnownMeetingProvider(input.providerKey);
  if (!known) {
    return {
      ok: false,
      code: 'unknown_provider',
      message: 'Choose a supported meeting provider.',
    };
  }

  await upsertMeetingPreference({
    tutorProfileId: auth.tutorProfileId,
    providerKey: input.providerKey,
    defaultMeetingUrl: input.defaultMeetingUrl,
    displayLabel: input.displayLabel,
    isActive: input.isActive,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Auth resolution — single point of truth for "is this caller a tutor?"
// ---------------------------------------------------------------------------

type TutorAuth =
  | { kind: 'ok'; tutorProfileId: string; accountTimezone: string | null }
  | {
      kind: 'denied';
      result: Exclude<TutorScheduleResult, { status: 'ok' }>;
    };

async function requireTutor(): Promise<TutorAuth> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated') {
    return { kind: 'denied', result: { status: 'unauthenticated' } };
  }
  if (state.status !== 'tutor_active' && state.status !== 'tutor_pending_review') {
    return { kind: 'denied', result: { status: 'forbidden' } };
  }
  const identity = await findTutorScheduleIdentity(state.appUser.id);
  if (!identity) {
    return { kind: 'denied', result: { status: 'forbidden' } };
  }
  return {
    kind: 'ok',
    tutorProfileId: identity.tutor_profile_id,
    accountTimezone: identity.account_timezone,
  };
}

function mutationFromAuth(
  result: Exclude<TutorScheduleResult, { status: 'ok' }>,
): ScheduleMutationResult {
  return result.status === 'unauthenticated'
    ? { ok: false, code: 'unauthorized', message: 'You must be signed in.' }
    : { ok: false, code: 'forbidden', message: 'Tutor access required.' };
}

function trimLocalTime(value: string): string {
  // Postgres returns time as `HH:MM:SS` — the schedule UI uses HH:MM.
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function normalizeVisibility(value: string): AvailabilityRuleVisibility {
  return value === 'paused' ? 'paused' : 'active';
}
