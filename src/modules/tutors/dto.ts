/**
 * Public-safe DTO types for tutor discovery and profile display.
 *
 * These types define the boundary between server-side data and
 * route/component consumption. They contain only fields approved
 * for the target audience (Class D1 = public anonymous).
 *
 * Raw Drizzle row types must NOT cross into routes or client components.
 */

// ---------------------------------------------------------------------------
// D1: Public tutor discovery card DTO (browse/search surfaces)
// ---------------------------------------------------------------------------
export interface PublicTutorCardDto {
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
  intro_video: PublicIntroVideoDto | null;
}

// ---------------------------------------------------------------------------
// D1: Public tutor profile DTO (full /tutors/[slug] page)
// ---------------------------------------------------------------------------
export interface PublicTutorProfileDto {
  tutor_profile_id: string;
  public_slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  teaching_style_summary: string | null;
  best_for_summary: string | null;
  pricing_summary: string | null;
  subjects: PublicSubjectDto[];
  languages: PublicLanguageDto[];
  trust_summary: PublicTrustSummaryDto | null;
  availability_summary: PublicAvailabilitySummaryDto | null;
  intro_video: PublicIntroVideoDto | null;
}

// ---------------------------------------------------------------------------
// Shared public sub-DTOs
// ---------------------------------------------------------------------------

export interface PublicSubjectDto {
  subject_name: string;
  subject_slug: string;
  focus_areas: PublicFocusAreaDto[];
}

export interface PublicFocusAreaDto {
  name: string;
  slug: string;
}

export interface PublicLanguageDto {
  code: string;
  name: string;
}

export interface PublicTrustSummaryDto {
  verified_credential_count: number;
  trust_labels: string[];
}

export interface PublicAvailabilitySummaryDto {
  is_accepting_new_students: boolean;
  has_upcoming_slots: boolean;
}

export interface PublicIntroVideoDto {
  provider: string;
  external_id: string;
  url: string;
}
