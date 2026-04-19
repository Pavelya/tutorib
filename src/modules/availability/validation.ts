import { z } from 'zod/v4';

// Phase 1 minimum booking notice is 8 hours (480 minutes). Tutors can raise
// the threshold but never lower it below the platform floor.
const MINIMUM_NOTICE_FLOOR = 480;
const MINIMUM_NOTICE_CEILING = 14 * 24 * 60; // 14 days
const BUFFER_CEILING = 240;
const CAPACITY_CEILING = 50;

const optionalCapacity = z
  .union([z.literal(''), z.coerce.number().int().min(1).max(CAPACITY_CEILING)])
  .transform((v) => (v === '' ? null : v));

export const updateSchedulePolicySchema = z.object({
  timezone: z.string().min(1).max(64),
  minimumNoticeMinutes: z.coerce
    .number()
    .int()
    .min(MINIMUM_NOTICE_FLOOR)
    .max(MINIMUM_NOTICE_CEILING),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(BUFFER_CEILING),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(BUFFER_CEILING),
  dailyCapacity: optionalCapacity,
  weeklyCapacity: optionalCapacity,
  isAcceptingNewStudents: z.coerce.boolean(),
});

export type UpdateSchedulePolicyInput = z.infer<typeof updateSchedulePolicySchema>;

const localTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour) format');

export const createAvailabilityRuleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startLocalTime: localTime,
    endLocalTime: localTime,
  })
  .refine((v) => v.startLocalTime < v.endLocalTime, {
    message: 'End time must be after start time',
    path: ['endLocalTime'],
  });

export type CreateAvailabilityRuleInput = z.infer<typeof createAvailabilityRuleSchema>;

export const deleteAvailabilityRuleSchema = z.object({
  ruleId: z.string().uuid(),
});

export type DeleteAvailabilityRuleInput = z.infer<typeof deleteAvailabilityRuleSchema>;

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

const optionalLabel = z
  .string()
  .trim()
  .max(80)
  .transform((v) => (v === '' ? null : v));

export const updateMeetingPreferenceSchema = z.object({
  providerKey: z.string().min(1).max(64),
  defaultMeetingUrl: optionalMeetingUrl,
  displayLabel: optionalLabel,
  isActive: z.coerce.boolean(),
});

export type UpdateMeetingPreferenceInput = z.infer<typeof updateMeetingPreferenceSchema>;
