'use server';

import { revalidatePath } from 'next/cache';
import {
  replaceAvailabilityWindows,
  updateMeetingPreference,
  updateSchedulePolicy,
} from './service';
import {
  replaceAvailabilityWindowsSchema,
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

export async function replaceAvailabilityWindowsAction(
  _prevState: ScheduleActionResult | null,
  formData: FormData,
): Promise<ScheduleActionResult> {
  const parsed = replaceAvailabilityWindowsSchema.safeParse({
    windows: formData.get('windows'),
  });

  if (!parsed.success) {
    return toValidationResult(parsed.error);
  }

  const result = await replaceAvailabilityWindows(parsed.data);
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
