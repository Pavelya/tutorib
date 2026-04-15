import { z } from 'zod/v4';

export const needTypeOptions = [
  { value: 'ia_feedback', label: 'IA feedback', description: 'Written task drafts, structure review, and supervisor-prep.' },
  { value: 'tok_essay', label: 'TOK essay', description: 'Essay framing, exhibition ideas, and argument structure.' },
  { value: 'io_practice', label: 'IO practice', description: 'Individual oral preparation, passage selection, and practice delivery.' },
  { value: 'ee_planning', label: 'EE planning', description: 'Planning, scope control, feedback structure, and draft review.' },
  { value: 'hl_exam_rescue', label: 'HL exam rescue', description: 'Targeted exam prep for HL papers and timed practice.' },
  { value: 'weekly_support', label: 'Weekly support', description: 'Ongoing weekly sessions for consistent progress.' },
  { value: 'other', label: 'Other', description: 'Describe your need if it does not fit the options above.' },
] as const;

export const urgencyOptions = [
  { value: 'urgent', label: 'Urgent', description: 'I need help in the next few days.' },
  { value: 'soon', label: 'Soon', description: 'Within the next week or two.' },
  { value: 'flexible', label: 'Flexible', description: 'No immediate deadline — I want ongoing support.' },
] as const;

export const supportStyleOptions = [
  { value: 'one_off', label: 'One-off session', description: 'A single focused session on a specific problem.' },
  { value: 'short_series', label: 'Short series', description: 'A few sessions to work through a defined goal.' },
  { value: 'weekly', label: 'Weekly support', description: 'Regular sessions for sustained progress.' },
] as const;

export const learningNeedSchema = z.object({
  needType: z.enum([
    'ia_feedback', 'tok_essay', 'io_practice', 'ee_planning',
    'hl_exam_rescue', 'weekly_support', 'other',
  ]),
  subjectId: z.string().uuid().optional(),
  urgencyLevel: z.enum(['urgent', 'soon', 'flexible']),
  supportStyle: z.enum(['one_off', 'short_series', 'weekly']),
  freeTextNote: z.string().max(500).optional(),
});

export type LearningNeedInput = z.infer<typeof learningNeedSchema>;
