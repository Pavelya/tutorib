import type {
  PublicTutorProfileDto,
  PublicSubjectDto,
  PublicLanguageDto,
  PublicTrustSummaryDto,
  PublicIntroVideoDto,
} from './dto';
import {
  findPublicTutorBySlug,
  findTutorSubjects,
  findTutorLanguages,
  findApprovedCredentials,
  type TutorSubjectRow,
} from './repository';

// ---------------------------------------------------------------------------
// Public tutor profile — D1 boundary
// ---------------------------------------------------------------------------

type PublicProfileResult =
  | { status: 'found'; profile: PublicTutorProfileDto }
  | { status: 'not_found' };

/**
 * Resolve a public tutor profile by slug.
 *
 * Returns only D1-safe (public anonymous) fields.
 * Private credential evidence, account IDs, and operational fields are excluded.
 */
export async function getPublicTutorProfile(
  slug: string,
): Promise<PublicProfileResult> {
  const row = await findPublicTutorBySlug(slug);
  if (!row) {
    return { status: 'not_found' };
  }

  const [subjectRows, languageRows, credentialRows] = await Promise.all([
    findTutorSubjects(row.id),
    findTutorLanguages(row.id),
    findApprovedCredentials(row.id),
  ]);

  const subjects = groupSubjects(subjectRows);
  const languages = mapLanguages(languageRows);
  const trustSummary = buildTrustSummary(credentialRows);
  const introVideo = buildIntroVideo(row);

  const profile: PublicTutorProfileDto = {
    tutor_profile_id: row.id,
    public_slug: row.public_slug ?? slug,
    display_name: row.display_name ?? 'Tutor',
    headline: row.headline,
    bio: row.bio,
    teaching_style_summary: row.teaching_style_summary,
    best_for_summary: row.best_for_summary,
    pricing_summary: row.pricing_summary,
    subjects,
    languages,
    trust_summary: trustSummary,
    availability_summary: null, // populated by availability module in a later task
    intro_video: introVideo,
  };

  return { status: 'found', profile };
}

// ---------------------------------------------------------------------------
// Mapping helpers (server-only)
// ---------------------------------------------------------------------------

/**
 * Group flat subject/focus-area rows into nested PublicSubjectDto[].
 */
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

function mapLanguages(rows: { language_code: string; language_name: string }[]): PublicLanguageDto[] {
  return rows.map((r) => ({
    code: r.language_code,
    name: r.language_name,
  }));
}

function buildTrustSummary(
  credentials: { credential_type: string; title: string }[],
): PublicTrustSummaryDto | null {
  if (credentials.length === 0) return null;

  const labels = credentials.map((c) => c.title);

  return {
    verified_credential_count: credentials.length,
    trust_labels: labels,
  };
}

function buildIntroVideo(row: {
  intro_video_provider: string | null;
  intro_video_external_id: string | null;
  intro_video_url: string | null;
}): PublicIntroVideoDto | null {
  if (!row.intro_video_provider || !row.intro_video_external_id || !row.intro_video_url) {
    return null;
  }

  return {
    provider: row.intro_video_provider,
    external_id: row.intro_video_external_id,
    url: row.intro_video_url,
  };
}
