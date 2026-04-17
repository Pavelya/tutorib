import { resolveAccountState } from '@/modules/accounts/service';
import { findStudentProfileByAppUserId } from '@/modules/learning-needs/repository';
import {
  findMatchRunByLearningNeedId,
  findMatchCandidatesByRunId,
  verifyLearningNeedOwnership,
  type MatchCandidateRow,
} from './repository';
import {
  findPublicTutorBySlug,
  findTutorSubjects,
  findTutorLanguages,
  findApprovedCredentials,
  type TutorSubjectRow,
} from '@/modules/tutors/repository';
import type {
  MatchResultsPageDto,
  MatchResultCardDto,
  MatchRunSummaryDto,
  MatchResultTutorDto,
} from './dto';
import type {
  PublicSubjectDto,
  PublicLanguageDto,
  PublicTrustSummaryDto,
} from '@/modules/tutors/dto';
import { tutorProfiles } from '@/modules/tutors/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type MatchResultsResult =
  | { status: 'found'; data: MatchResultsPageDto }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'unauthenticated' };

/**
 * Resolve match results for a learning need.
 *
 * Authorization: only the student who owns the learning need can view results.
 * Returns D4-safe DTOs — no raw scores, no ranking debug fields.
 */
export async function getMatchResults(
  learningNeedId: string,
): Promise<MatchResultsResult> {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    return { status: 'unauthenticated' };
  }

  if (state.status !== 'student_active') {
    return { status: 'forbidden' };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) {
    return { status: 'forbidden' };
  }

  const ownsNeed = await verifyLearningNeedOwnership(
    learningNeedId,
    studentProfile.id,
  );
  if (!ownsNeed) {
    return { status: 'not_found' };
  }

  const matchRun = await findMatchRunByLearningNeedId(learningNeedId);

  // No match run yet — the learning need exists but matching hasn't run.
  // Return an empty result set so the page can show an empty state.
  if (!matchRun) {
    const emptyRun: MatchRunSummaryDto = {
      match_run_id: '',
      learning_need_id: learningNeedId,
      ranking_version: '',
      run_status: 'pending',
      candidate_count: 0,
      created_at: new Date().toISOString(),
    };
    return { status: 'found', data: { run: emptyRun, candidates: [] } };
  }

  const candidateRows = await findMatchCandidatesByRunId(matchRun.id);
  const candidates = await Promise.all(
    candidateRows.map((row) => mapCandidateToDto(row)),
  );

  const run: MatchRunSummaryDto = {
    match_run_id: matchRun.id,
    learning_need_id: matchRun.learning_need_id,
    ranking_version: matchRun.ranking_version,
    run_status: matchRun.run_status,
    candidate_count: matchRun.candidate_count ?? candidateRows.length,
    created_at: matchRun.created_at.toISOString(),
  };

  return {
    status: 'found',
    data: { run, candidates },
  };
}

// ---------------------------------------------------------------------------
// Internal DTO mapping (server-only)
// ---------------------------------------------------------------------------

async function mapCandidateToDto(
  row: MatchCandidateRow,
): Promise<MatchResultCardDto> {
  const tutor = await loadTutorCardData(row.tutor_profile_id);

  return {
    match_candidate_id: row.id,
    match_run_id: row.match_run_id,
    rank_position: row.rank_position,
    confidence_label: row.confidence_label,
    fit_summary: row.fit_summary,
    best_for_summary: row.best_for_summary,
    availability_signal: row.availability_signal,
    trust_signal: row.trust_signal_snapshot,
    tutor,
  };
}

async function loadTutorCardData(
  tutorProfileId: string,
): Promise<MatchResultTutorDto> {
  const db = getDb();
  const rows = await db
    .select()
    .from(tutorProfiles)
    .where(eq(tutorProfiles.id, tutorProfileId))
    .limit(1);

  const profile = rows[0];

  if (!profile) {
    return {
      tutor_profile_id: tutorProfileId,
      public_slug: '',
      display_name: 'Tutor',
      headline: null,
      subjects: [],
      languages: [],
      best_for_summary: null,
      pricing_summary: null,
      trust_summary: null,
      availability_summary: null,
    };
  }

  const [subjectRows, languageRows, credentialRows] = await Promise.all([
    findTutorSubjects(tutorProfileId),
    findTutorLanguages(tutorProfileId),
    findApprovedCredentials(tutorProfileId),
  ]);

  const subjects = groupSubjects(subjectRows);
  const languages = mapLanguages(languageRows);
  const trustSummary = buildTrustSummary(credentialRows);

  return {
    tutor_profile_id: profile.id,
    public_slug: profile.public_slug ?? '',
    display_name: profile.display_name ?? 'Tutor',
    headline: profile.headline,
    subjects,
    languages,
    best_for_summary: profile.best_for_summary,
    pricing_summary: profile.pricing_summary,
    trust_summary: trustSummary,
    availability_summary: null, // populated by availability module in a later task
  };
}

// ---------------------------------------------------------------------------
// Shared mapping helpers (same patterns as tutors/service.ts)
// ---------------------------------------------------------------------------

function groupSubjects(rows: TutorSubjectRow[]): PublicSubjectDto[] {
  const map = new Map<string, PublicSubjectDto>();

  for (const row of rows) {
    let subject = map.get(row.subject_slug);
    if (!subject) {
      subject = {
        subject_name: row.subject_name,
        subject_slug: row.subject_slug,
        focus_areas: [],
      };
      map.set(row.subject_slug, subject);
    }
    if (row.focus_area_name && row.focus_area_slug) {
      subject.focus_areas.push({
        name: row.focus_area_name,
        slug: row.focus_area_slug,
      });
    }
  }

  return Array.from(map.values());
}

function mapLanguages(
  rows: { language_code: string; language_name: string }[],
): PublicLanguageDto[] {
  return rows.map((r) => ({
    code: r.language_code,
    name: r.language_name,
  }));
}

function buildTrustSummary(
  credentials: { credential_type: string; title: string }[],
): PublicTrustSummaryDto | null {
  if (credentials.length === 0) return null;

  return {
    verified_credential_count: credentials.length,
    trust_labels: credentials.map((c) => c.title),
  };
}
