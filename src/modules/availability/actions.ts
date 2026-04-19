'use server';

import { revalidatePath } from 'next/cache';
import {
  createAvailabilityRule,
  deleteAvailabilityRule,
  updateMeetingPreference,
  updateSchedulePolicy,
} from './service';
import {
  createAvailabilityRuleSchema,
  deleteAvailabilityRuleSchema,
  updateMeetingPreferenceSchema,
  updateSchedulePolicySchema,
} from './validation';

export type ScheduleActionResult =
  | { ok: true }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function updateSchedulePolicyAction(
  _prevState: ScheduleActionResult | null,
  formData: FormData,
): Promise<ScheduleActionResult> {
  const parsed = updateSchedulePolicySchema.safeParse({
    timezone: formData.get('timezone'),
    minimumNoticeMinutes: formData.get('minimumNoticeMinutes'),
    bufferBeforeMinutes: formData.get('bufferBeforeMinutes'),
    bufferAfterMinutes: formData.get('bufferAfterMinutes'),
    dailyCapacity: formData.get('dailyCapacity') ?? '',
    weeklyCapacity: formData.get('weeklyCapacity') ?? '',
    isAcceptingNewStudents: formData.get('isAcceptingNewStudents') === 'on',
  });

  if (!parsed.success) {
    return toValidationResult(parsed.error);
  }

  const result = await updateSchedulePolicy(parsed.data);
  if (!result.ok) return result;

  revalidatePath('/tutor/schedule');
  return { ok: true };
}

export async function createAvailabilityRuleAction(
  _prevState: ScheduleActionResult | null,
  formData: FormData,
): Promise<ScheduleActionResult> {
  const parsed = createAvailabilityRuleSchema.safeParse({
    dayOfWeek: formData.get('dayOfWeek'),
    startLocalTime: formData.get('startLocalTime'),
    endLocalTime: formData.get('endLocalTime'),
  });

  if (!parsed.success) {
    return toValidationResult(parsed.error);
  }

  const result = await createAvailabilityRule(parsed.data);
  if (!result.ok) return result;

  revalidatePath('/tutor/schedule');
  return { ok: true };
}

export async function deleteAvailabilityRuleAction(
  _prevState: ScheduleActionResult | null,
  formData: FormData,
): Promise<ScheduleActionResult> {
  const parsed = deleteAvailabilityRuleSchema.safeParse({
    ruleId: formData.get('ruleId'),
  });

  if (!parsed.success) {
    return toValidationResult(parsed.error);
  }

  const result = await deleteAvailabilityRule(parsed.data);
  if (!result.ok) return result;

  revalidatePath('/tutor/schedule');
  return { ok: true };
}

export async function updateMeetingPreferenceAction(
  _prevState: ScheduleActionResult | null,
  formData: FormData,
): Promise<ScheduleActionResult> {
  const parsed = updateMeetingPreferenceSchema.safeParse({
    providerKey: formData.get('providerKey'),
    defaultMeetingUrl: formData.get('defaultMeetingUrl') ?? '',
    displayLabel: formData.get('displayLabel') ?? '',
    isActive: formData.get('isActive') === 'on',
  });

  if (!parsed.success) {
    return toValidationResult(parsed.error);
  }

  const result = await updateMeetingPreference(parsed.data);
  if (!result.ok) return result;

  revalidatePath('/tutor/schedule');
  return { ok: true };
}

function toValidationResult(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): ScheduleActionResult {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return {
    ok: false,
    code: 'validation_failed',
    message: 'Please correct the highlighted fields.',
    fieldErrors,
  };
}
