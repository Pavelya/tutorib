import { eq, and, asc } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import {
  tutorProfiles,
  tutorSubjectCapabilities,
  tutorLanguageCapabilities,
  tutorCredentials,
} from './schema';
import { subjects, subjectFocusAreas, languages } from '@/modules/reference/schema';

// ---------------------------------------------------------------------------
// Internal row types — D0, never exported to routes or client components
// ---------------------------------------------------------------------------

export type TutorProfileRow = typeof tutorProfiles.$inferSelect;

export interface TutorSubjectRow {
  subject_name: string;
  subject_slug: string;
  focus_area_name: string | null;
  focus_area_slug: string | null;
  display_priority: number;
}

export interface TutorLanguageRow {
  language_code: string;
  language_name: string;
  display_priority: number;
}

export interface TutorCredentialSummaryRow {
  credential_type: string;
  title: string;
  review_status: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Find a tutor profile by public slug.
 * Only returns profiles that are publicly listed.
 */
export async function findPublicTutorBySlug(
  slug: string,
): Promise<TutorProfileRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(tutorProfiles)
    .where(
      and(
        eq(tutorProfiles.public_slug, slug),
        eq(tutorProfiles.public_listing_status, 'listed'),
      ),
    )
    .limit(1);
  return rows[0];
}

/**
 * Get subject capabilities for a tutor, joined with reference data.
 */
export async function findTutorSubjects(
  tutorProfileId: string,
): Promise<TutorSubjectRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      subject_name: subjects.name,
      subject_slug: subjects.slug,
      focus_area_name: subjectFocusAreas.name,
      focus_area_slug: subjectFocusAreas.slug,
      display_priority: tutorSubjectCapabilities.display_priority,
    })
    .from(tutorSubjectCapabilities)
    .innerJoin(subjects, eq(tutorSubjectCapabilities.subject_id, subjects.id))
    .leftJoin(
      subjectFocusAreas,
      eq(tutorSubjectCapabilities.subject_focus_area_id, subjectFocusAreas.id),
    )
    .where(eq(tutorSubjectCapabilities.tutor_profile_id, tutorProfileId))
    .orderBy(asc(tutorSubjectCapabilities.display_priority));
  return rows;
}

/**
 * Get language capabilities for a tutor, joined with reference data.
 */
export async function findTutorLanguages(
  tutorProfileId: string,
): Promise<TutorLanguageRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      language_code: languages.code,
      language_name: languages.name,
      display_priority: tutorLanguageCapabilities.display_priority,
    })
    .from(tutorLanguageCapabilities)
    .innerJoin(languages, eq(tutorLanguageCapabilities.language_code, languages.code))
    .where(eq(tutorLanguageCapabilities.tutor_profile_id, tutorProfileId))
    .orderBy(asc(tutorLanguageCapabilities.display_priority));
  return rows;
}

/**
 * Get approved credential summaries for public trust proof display.
 * Only returns credentials with review_status = 'approved'.
 */
export async function findApprovedCredentials(
  tutorProfileId: string,
): Promise<TutorCredentialSummaryRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      credential_type: tutorCredentials.credential_type,
      title: tutorCredentials.title,
      review_status: tutorCredentials.review_status,
    })
    .from(tutorCredentials)
    .where(
      and(
        eq(tutorCredentials.tutor_profile_id, tutorProfileId),
        eq(tutorCredentials.review_status, 'approved'),
      ),
    );
  return rows;
}
