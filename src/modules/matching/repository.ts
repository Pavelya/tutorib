import { eq, asc } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { matchRuns, matchCandidates } from './schema';
import { learningNeeds } from '@/modules/learning-needs/schema';

// ---------------------------------------------------------------------------
// Internal row types — D0, never exported to routes or client components
// ---------------------------------------------------------------------------

export type MatchRunRow = typeof matchRuns.$inferSelect;
export type MatchCandidateRow = typeof matchCandidates.$inferSelect;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Find a match run by the learning need ID.
 * Returns the most recent run for the given need.
 */
export async function findMatchRunByLearningNeedId(
  learningNeedId: string,
): Promise<MatchRunRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(matchRuns)
    .where(eq(matchRuns.learning_need_id, learningNeedId))
    .orderBy(asc(matchRuns.created_at))
    .limit(1);
  return rows[0];
}

/**
 * Find a match run by its own ID.
 */
export async function findMatchRunById(
  matchRunId: string,
): Promise<MatchRunRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(matchRuns)
    .where(eq(matchRuns.id, matchRunId))
    .limit(1);
  return rows[0];
}

/**
 * Find all candidates for a match run, ordered by rank position.
 */
export async function findMatchCandidatesByRunId(
  matchRunId: string,
): Promise<MatchCandidateRow[]> {
  const db = getDb();
  return db
    .select()
    .from(matchCandidates)
    .where(eq(matchCandidates.match_run_id, matchRunId))
    .orderBy(asc(matchCandidates.rank_position));
}

/**
 * Verify that a learning need belongs to a specific student profile.
 */
export async function verifyLearningNeedOwnership(
  learningNeedId: string,
  studentProfileId: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: learningNeeds.id })
    .from(learningNeeds)
    .where(eq(learningNeeds.id, learningNeedId))
    .limit(1);

  if (!rows[0]) return false;

  const need = await db
    .select({ student_profile_id: learningNeeds.student_profile_id })
    .from(learningNeeds)
    .where(eq(learningNeeds.id, learningNeedId))
    .limit(1);

  return need[0]?.student_profile_id === studentProfileId;
}
