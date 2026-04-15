import { pgTable, uuid, text, timestamp, integer, numeric, index } from 'drizzle-orm/pg-core';
import { tutorProfiles } from '@/modules/tutors/schema';
import { learningNeeds } from '@/modules/learning-needs/schema';

// ---------------------------------------------------------------------------
// match_runs — versioned record of a matching execution for a learning need
// ---------------------------------------------------------------------------
export const matchRuns = pgTable(
  'match_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learning_need_id: uuid('learning_need_id')
      .notNull()
      .references(() => learningNeeds.id),
    ranking_version: text('ranking_version').notNull(),
    need_signature: text('need_signature'),
    matching_projection_version: text('matching_projection_version'),
    run_status: text('run_status').notNull().default('pending'),
    candidate_count: integer('candidate_count'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_match_runs_learning_need').on(t.learning_need_id),
    index('idx_match_runs_status').on(t.run_status),
  ],
);

// ---------------------------------------------------------------------------
// match_candidates — one candidate tutor result within a specific match run.
// Makes Match a first-class domain object.
// ---------------------------------------------------------------------------
export const matchCandidates = pgTable(
  'match_candidates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    match_run_id: uuid('match_run_id')
      .notNull()
      .references(() => matchRuns.id),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    candidate_state: text('candidate_state').notNull().default('candidate'),
    rank_position: integer('rank_position').notNull(),
    match_score: numeric('match_score'),
    confidence_label: text('confidence_label'),
    fit_summary: text('fit_summary'),
    best_for_summary: text('best_for_summary'),
    availability_signal: text('availability_signal'),
    trust_signal_snapshot: text('trust_signal_snapshot'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_match_candidates_run').on(t.match_run_id),
    index('idx_match_candidates_tutor').on(t.tutor_profile_id),
    index('idx_match_candidates_state').on(t.candidate_state),
  ],
);
