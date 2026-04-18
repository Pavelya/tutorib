import { z } from 'zod/v4';
import { STUDENT_LESSON_ISSUE_REASONS } from './dto';

export const DURATION_MINUTES = [30, 45, 60, 90, 120] as const;

export const bookingRequestSchema = z.object({
  matchCandidateId: z.string().uuid(),
  scheduledStartAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.coerce.number().int().refine(
    (v): v is (typeof DURATION_MINUTES)[number] =>
      (DURATION_MINUTES as readonly number[]).includes(v),
    'Invalid duration',
  ),
  timezone: z.string().min(1).max(64),
  studentNote: z.string().max(500).optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const cancelLessonSchema = z.object({
  lessonId: z.string().uuid(),
});

export type CancelLessonInput = z.infer<typeof cancelLessonSchema>;

export const reportLessonIssueSchema = z.object({
  lessonId: z.string().uuid(),
  reason: z.enum(STUDENT_LESSON_ISSUE_REASONS),
});

export type ReportLessonIssueInput = z.infer<typeof reportLessonIssueSchema>;
