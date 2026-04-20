import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { tutorProfiles, tutorMeetingPreferences } from '@/modules/tutors/schema';
import { meetingProviders } from '@/modules/reference/schema';
import { appUsers } from '@/modules/accounts/schema';
import {
  schedulePolicies,
  availabilityRules,
} from './schema';

// ---------------------------------------------------------------------------
// Internal row types — D0, never exported beyond the service layer.
// ---------------------------------------------------------------------------

export interface TutorScheduleIdentityRow {
  tutor_profile_id: string;
  account_timezone: string | null;
}

export async function findTutorScheduleIdentity(
  appUserId: string,
): Promise<TutorScheduleIdentityRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      tutor_profile_id: tutorProfiles.id,
      account_timezone: appUsers.timezone,
    })
    .from(tutorProfiles)
    .innerJoin(appUsers, eq(appUsers.id, tutorProfiles.app_user_id))
    .where(eq(tutorProfiles.app_user_id, appUserId))
    .limit(1);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Schedule policy
// ---------------------------------------------------------------------------

export interface SchedulePolicyRow {
  timezone: string;
  minimum_notice_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  daily_capacity: number | null;
  weekly_capacity: number | null;
  is_accepting_new_students: boolean;
}

export async function findSchedulePolicy(
  tutorProfileId: string,
): Promise<SchedulePolicyRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      timezone: schedulePolicies.timezone,
      minimum_notice_minutes: schedulePolicies.minimum_notice_minutes,
      buffer_before_minutes: schedulePolicies.buffer_before_minutes,
      buffer_after_minutes: schedulePolicies.buffer_after_minutes,
      daily_capacity: schedulePolicies.daily_capacity,
      weekly_capacity: schedulePolicies.weekly_capacity,
      is_accepting_new_students: schedulePolicies.is_accepting_new_students,
    })
    .from(schedulePolicies)
    .where(eq(schedulePolicies.tutor_profile_id, tutorProfileId))
    .limit(1);
  return rows[0];
}

export interface UpsertSchedulePolicyInput {
  tutorProfileId: string;
  timezone: string;
  minimumNoticeMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  dailyCapacity: number | null;
  weeklyCapacity: number | null;
  isAcceptingNewStudents: boolean;
}

export async function upsertSchedulePolicy(
  input: UpsertSchedulePolicyInput,
): Promise<void> {
  const db = getDb();
  await db
    .insert(schedulePolicies)
    .values({
      tutor_profile_id: input.tutorProfileId,
      timezone: input.timezone,
      minimum_notice_minutes: input.minimumNoticeMinutes,
      buffer_before_minutes: input.bufferBeforeMinutes,
      buffer_after_minutes: input.bufferAfterMinutes,
      daily_capacity: input.dailyCapacity,
      weekly_capacity: input.weeklyCapacity,
      is_accepting_new_students: input.isAcceptingNewStudents,
    })
    .onConflictDoUpdate({
      target: schedulePolicies.tutor_profile_id,
      set: {
        timezone: input.timezone,
        minimum_notice_minutes: input.minimumNoticeMinutes,
        buffer_before_minutes: input.bufferBeforeMinutes,
        buffer_after_minutes: input.bufferAfterMinutes,
        daily_capacity: input.dailyCapacity,
        weekly_capacity: input.weeklyCapacity,
        is_accepting_new_students: input.isAcceptingNewStudents,
        updated_at: new Date(),
      },
    });
}

// ---------------------------------------------------------------------------
// Availability rules
// ---------------------------------------------------------------------------

export interface AvailabilityRuleRow {
  id: string;
  day_of_week: number;
  start_local_time: string;
  end_local_time: string;
  visibility_status: string;
}

export async function findAvailabilityRules(
  tutorProfileId: string,
): Promise<AvailabilityRuleRow[]> {
  const db = getDb();
  return db
    .select({
      id: availabilityRules.id,
      day_of_week: availabilityRules.day_of_week,
      start_local_time: availabilityRules.start_local_time,
      end_local_time: availabilityRules.end_local_time,
      visibility_status: availabilityRules.visibility_status,
    })
    .from(availabilityRules)
    .where(eq(availabilityRules.tutor_profile_id, tutorProfileId))
    .orderBy(
      asc(availabilityRules.day_of_week),
      asc(availabilityRules.start_local_time),
    );
}

export interface InsertAvailabilityRuleInput {
  tutorProfileId: string;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
}

export async function insertAvailabilityRule(
  input: InsertAvailabilityRuleInput,
): Promise<void> {
  const db = getDb();
  await db.insert(availabilityRules).values({
    tutor_profile_id: input.tutorProfileId,
    day_of_week: input.dayOfWeek,
    start_local_time: input.startLocalTime,
    end_local_time: input.endLocalTime,
    visibility_status: 'active',
  });
}

export async function deleteAvailabilityRuleOwned(
  tutorProfileId: string,
  ruleId: string,
): Promise<number> {
  const db = getDb();
  const result = await db
    .delete(availabilityRules)
    .where(
      and(
        eq(availabilityRules.id, ruleId),
        eq(availabilityRules.tutor_profile_id, tutorProfileId),
      ),
    );
  // postgres-js returns a result with `count`
  return (result as unknown as { count?: number }).count ?? 0;
}

export interface ReplaceAvailabilityRuleInput {
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
}

export async function replaceAvailabilityRulesForTutor(
  tutorProfileId: string,
  windows: ReplaceAvailabilityRuleInput[],
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(availabilityRules)
      .where(eq(availabilityRules.tutor_profile_id, tutorProfileId));
    if (windows.length === 0) return;
    await tx.insert(availabilityRules).values(
      windows.map((w) => ({
        tutor_profile_id: tutorProfileId,
        day_of_week: w.dayOfWeek,
        start_local_time: w.startLocalTime,
        end_local_time: w.endLocalTime,
        visibility_status: 'active',
      })),
    );
  });
}

// ---------------------------------------------------------------------------
// Meeting preference
// ---------------------------------------------------------------------------

export interface MeetingPreferenceRow {
  provider_key: string;
  default_meeting_url: string | null;
  display_label: string | null;
  is_active: boolean;
  last_validated_at: Date | null;
}

export async function findMeetingPreference(
  tutorProfileId: string,
): Promise<MeetingPreferenceRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      provider_key: tutorMeetingPreferences.provider_key,
      default_meeting_url: tutorMeetingPreferences.default_meeting_url,
      display_label: tutorMeetingPreferences.display_label,
      is_active: tutorMeetingPreferences.is_active,
      last_validated_at: tutorMeetingPreferences.last_validated_at,
    })
    .from(tutorMeetingPreferences)
    .where(eq(tutorMeetingPreferences.tutor_profile_id, tutorProfileId))
    .limit(1);
  return rows[0];
}

export interface UpsertMeetingPreferenceInput {
  tutorProfileId: string;
  providerKey: string;
  defaultMeetingUrl: string | null;
  displayLabel: string | null;
  isActive: boolean;
}

export async function upsertMeetingPreference(
  input: UpsertMeetingPreferenceInput,
): Promise<void> {
  const db = getDb();
  await db
    .insert(tutorMeetingPreferences)
    .values({
      tutor_profile_id: input.tutorProfileId,
      provider_key: input.providerKey,
      default_meeting_url: input.defaultMeetingUrl,
      display_label: input.displayLabel,
      is_active: input.isActive,
    })
    .onConflictDoUpdate({
      target: tutorMeetingPreferences.tutor_profile_id,
      set: {
        provider_key: input.providerKey,
        default_meeting_url: input.defaultMeetingUrl,
        display_label: input.displayLabel,
        is_active: input.isActive,
        updated_at: new Date(),
      },
    });
}

// ---------------------------------------------------------------------------
// Reference: meeting provider options
// ---------------------------------------------------------------------------

export interface MeetingProviderOptionRow {
  key: string;
  name: string;
}

export async function findActiveMeetingProviders(): Promise<
  MeetingProviderOptionRow[]
> {
  const db = getDb();
  return db
    .select({ key: meetingProviders.key, name: meetingProviders.name })
    .from(meetingProviders)
    .where(eq(meetingProviders.is_active, true))
    .orderBy(asc(meetingProviders.display_order), asc(meetingProviders.name));
}

export async function isKnownMeetingProvider(key: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ key: meetingProviders.key })
    .from(meetingProviders)
    .where(and(eq(meetingProviders.key, key), eq(meetingProviders.is_active, true)))
    .limit(1);
  return rows.length > 0;
}
