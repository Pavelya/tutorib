/**
 * Matching result DTO types.
 *
 * Class D4 (student private) — only fields approved for an authenticated
 * student viewing their own match results. Raw numeric scores, ranking
 * debug details, and internal projection rows are excluded.
 */

import type {
  PublicSubjectDto,
  PublicLanguageDto,
  PublicTrustSummaryDto,
  PublicAvailabilitySummaryDto,
} from '@/modules/tutors/dto';

// ---------------------------------------------------------------------------
// D4: Match result card DTO — one candidate within a match run
// ---------------------------------------------------------------------------
export interface MatchResultCardDto {
  match_candidate_id: string;
  match_run_id: string;
  rank_position: number;
  confidence_label: string | null;
  fit_summary: string | null;
  best_for_summary: string | null;
  availability_signal: string | null;
  trust_signal: string | null;
  tutor: MatchResultTutorDto;
}

// ---------------------------------------------------------------------------
// Tutor card embedded in match result — public-safe tutor data
// ---------------------------------------------------------------------------
export interface MatchResultTutorDto {
  tutor_profile_id: string;
  public_slug: string;
  display_name: string;
  headline: string | null;
  subjects: PublicSubjectDto[];
  languages: PublicLanguageDto[];
  best_for_summary: string | null;
  pricing_summary: string | null;
  trust_summary: PublicTrustSummaryDto | null;
  availability_summary: PublicAvailabilitySummaryDto | null;
}

// ---------------------------------------------------------------------------
// D4: Match run summary DTO — context for the results page header
// ---------------------------------------------------------------------------
export interface MatchRunSummaryDto {
  match_run_id: string;
  learning_need_id: string;
  ranking_version: string;
  run_status: string;
  candidate_count: number;
  created_at: string; // ISO string
}

// ---------------------------------------------------------------------------
// Composite result returned to the route
// ---------------------------------------------------------------------------
export interface MatchResultsPageDto {
  run: MatchRunSummaryDto;
  candidates: MatchResultCardDto[];
}
