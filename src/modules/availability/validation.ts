import { z } from 'zod/v4';

// "Accepting new students" is the only tutor-owned booking-rule toggle in
// Phase 1. Minimum notice, buffers, and caps are platform-level defaults —
// they live in the schema but aren't user-editable until admin settings land.
export const updateSchedulePolicySchema = z.object({
  isAcceptingNewStudents: z.coerce.boolean(),
});

export type UpdateSchedulePolicyInput = z.infer<typeof updateSchedulePolicySchema>;

// Weekly availability is edited as a grid of hour cells. The client
// consolidates consecutive selected hours into windows before submitting so
// the stored shape matches the existing availability_rules contract.
const availabilityWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
  })
  .refine((v) => v.startHour < v.endHour, {
    message: 'Invalid window',
    path: ['endHour'],
  });

export const replaceAvailabilityWindowsSchema = z.object({
  windows: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid windows payload' });
        return z.NEVER;
      }
    })
    .pipe(z.array(availabilityWindowSchema).max(168)),
});

export type ReplaceAvailabilityWindowsInput = z.infer<
  typeof replaceAvailabilityWindowsSchema
>;

// Defensive URL guard: HTTPS only, length-bounded. Provider-specific URL
// validation lives at the booking/lesson access boundary.
const optionalMeetingUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || /^https:\/\//i.test(v),
    'Meeting link must start with https://',
  )
  .transform((v) => (v === '' ? null : v));

export const updateMeetingPreferenceSchema = z.object({
  providerKey: z.string().min(1).max(64),
  defaultMeetingUrl: optionalMeetingUrl,
});

export type UpdateMeetingPreferenceInput = z.infer<typeof updateMeetingPreferenceSchema>;
