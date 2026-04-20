import { resolveAccountState } from '@/modules/accounts/service';
import {
  findActiveMeetingProviders,
  findAvailabilityRules,
  findMeetingPreference,
  findSchedulePolicy,
  findTutorScheduleIdentity,
  isKnownMeetingProvider,
  replaceAvailabilityRulesForTutor,
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
  ReplaceAvailabilityWindowsInput,
  UpdateMeetingPreferenceInput,
  UpdateSchedulePolicyInput,
} from './validation';

const DEFAULT_TIMEZONE = 'UTC';

// Phase 1 platform defaults. These aren't tutor-editable until admin settings
// land; the schedule surface preserves them on every policy upsert so no
// tutor can shrink the 8-hour booking floor or invent buffers/caps.
const PHASE1_MINIMUM_NOTICE_FLOOR = 480;
const PHASE1_BUFFER_BEFORE = 0;
const PHASE1_BUFFER_AFTER = 0;
const PHASE1_DAILY_CAPACITY: number | null = null;
const PHASE1_WEEKLY_CAPACITY: number | null = null;

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

  const resolvedTimezone =
    policyRow?.timezone ?? accountTimezone ?? DEFAULT_TIMEZONE;

  const policy: SchedulePolicyDto = {
    timezone: resolvedTimezone,
    minimum_notice_minutes:
      policyRow?.minimum_notice_minutes ?? PHASE1_MINIMUM_NOTICE_FLOOR,
    buffer_before_minutes:
      policyRow?.buffer_before_minutes ?? PHASE1_BUFFER_BEFORE,
    buffer_after_minutes:
      policyRow?.buffer_after_minutes ?? PHASE1_BUFFER_AFTER,
    daily_capacity: policyRow?.daily_capacity ?? PHASE1_DAILY_CAPACITY,
    weekly_capacity: policyRow?.weekly_capacity ?? PHASE1_WEEKLY_CAPACITY,
    is_accepting_new_students: policyRow?.is_accepting_new_students ?? true,
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

  const existing = await findSchedulePolicy(auth.tutorProfileId);
  const timezone =
    existing?.timezone ?? auth.accountTimezone ?? DEFAULT_TIMEZONE;

  await upsertSchedulePolicy({
    tutorProfileId: auth.tutorProfileId,
    timezone,
    minimumNoticeMinutes:
      existing?.minimum_notice_minutes ?? PHASE1_MINIMUM_NOTICE_FLOOR,
    bufferBeforeMinutes:
      existing?.buffer_before_minutes ?? PHASE1_BUFFER_BEFORE,
    bufferAfterMinutes:
      existing?.buffer_after_minutes ?? PHASE1_BUFFER_AFTER,
    dailyCapacity: existing?.daily_capacity ?? PHASE1_DAILY_CAPACITY,
    weeklyCapacity: existing?.weekly_capacity ?? PHASE1_WEEKLY_CAPACITY,
    isAcceptingNewStudents: input.isAcceptingNewStudents,
  });

  return { ok: true };
}

export async function replaceAvailabilityWindows(
  input: ReplaceAvailabilityWindowsInput,
): Promise<ScheduleMutationResult> {
  const auth = await requireTutor();
  if (auth.kind !== 'ok') return mutationFromAuth(auth.result);

  await replaceAvailabilityRulesForTutor(
    auth.tutorProfileId,
    input.windows.map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startLocalTime: formatHour(w.startHour),
      endLocalTime: formatHour(w.endHour),
    })),
  );

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
    displayLabel: null,
    // A link is "active" when the tutor has actually set a URL. Saving a blank
    // URL effectively pauses the default without a separate toggle.
    isActive: input.defaultMeetingUrl !== null,
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

function formatHour(hour: number): string {
  // Postgres `time` accepts 24:00:00 as the upper bound; pad to HH:00:00.
  const hh = hour.toString().padStart(2, '0');
  return `${hh}:00:00`;
}
