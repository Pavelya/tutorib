import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { site } from '@/lib/config/site';
import { buildRouteMetadata } from '@/lib/seo/metadata/build-metadata';
import { buildProfilePage } from '@/lib/seo/schema/profile-page';
import { buildBreadcrumbList } from '@/lib/seo/schema/breadcrumb';
import { JsonLd } from '@/lib/seo/schema/json-ld';
import { Badge } from '@/components/Badge/Badge';
import { Avatar } from '@/components/Avatar/Avatar';
import { getPublicTutorProfile } from '@/modules/tutors/service';
import type { PublicTutorProfileDto } from '@/modules/tutors/dto';
import styles from './tutor-profile.module.css';

// ---------------------------------------------------------------------------
// Metadata (dynamic)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicTutorProfile(slug);

  if (result.status === 'not_found') {
    return buildRouteMetadata({
      title: 'Tutor not found',
      description: 'The tutor profile you are looking for does not exist.',
      pathname: `/tutors/${slug}`,
      indexable: false,
    });
  }

  const { profile } = result;
  const subjectList = profile.subjects
    .map((s) => s.subject_name)
    .join(', ');
  const description = profile.headline
    ?? `${profile.display_name} — IB tutor${subjectList ? ` for ${subjectList}` : ''} on ${site.name}.`;

  return buildRouteMetadata({
    title: `${profile.display_name} — IB Tutor | ${site.name}`,
    description,
    pathname: `/tutors/${profile.public_slug}`,
    ogType: 'profile',
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TutorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicTutorProfile(slug);

  if (result.status === 'not_found') {
    notFound();
  }

  const { profile } = result;
  const pathname = `/tutors/${profile.public_slug}`;

  return (
    <article className={styles.page}>
      {/* Structured data */}
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', pathname: '/' },
          { name: 'Tutors', pathname: '/tutors' },
          { name: profile.display_name, pathname },
        ])}
      />
      <JsonLd
        data={buildProfilePage({
          name: profile.display_name,
          description:
            profile.headline ?? profile.bio ?? `IB tutor on ${site.name}`,
          pathname,
          knowsAbout: profile.subjects.map((s) => s.subject_name),
        })}
      />

      {/* Profile header */}
      <header className={styles.profileHeader}>
        <Avatar size="lg" name={profile.display_name} />
        <div className={styles.headerText}>
          <h1>{profile.display_name}</h1>
          {profile.headline && (
            <p className={styles.headline}>{profile.headline}</p>
          )}
        </div>
      </header>

      {/* Main content grid */}
      <div className={styles.contentGrid}>
        {/* Left column: bio and details */}
        <div className={styles.mainCol}>
          {/* Bio */}
          {profile.bio && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>About</h2>
              <p className={styles.bodyText}>{profile.bio}</p>
            </section>
          )}

          {/* Teaching style */}
          {profile.teaching_style_summary && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Teaching style</h2>
              <p className={styles.bodyText}>
                {profile.teaching_style_summary}
              </p>
            </section>
          )}

          {/* Best for */}
          {profile.best_for_summary && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Best for</h2>
              <p className={styles.bodyText}>{profile.best_for_summary}</p>
            </section>
          )}

          {/* Subjects */}
          <SubjectsSection profile={profile} />

          {/* Intro video */}
          <IntroVideoSection profile={profile} />
        </div>

        {/* Right column: sidebar */}
        <aside className={styles.sidebar}>
          {/* Booking CTA */}
          <div className={styles.ctaCard}>
            {profile.pricing_summary && (
              <p className={styles.pricing}>{profile.pricing_summary}</p>
            )}
            <Link
              href={`/book?tutor=${profile.public_slug}`}
              className={styles.ctaPrimary}
            >
              Request a lesson
            </Link>
            <Link
              href={`/match`}
              className={styles.ctaSecondary}
            >
              See other matches
            </Link>
          </div>

          {/* Trust proof */}
          <TrustSection profile={profile} />

          {/* Languages */}
          <LanguagesSection profile={profile} />

          {/* Availability hint */}
          {profile.availability_summary && (
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Availability</h3>
              {profile.availability_summary.is_accepting_new_students && (
                <Badge variant="positive">Accepting new students</Badge>
              )}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Section components (Server Components, same file for colocation)
// ---------------------------------------------------------------------------

function SubjectsSection({ profile }: { profile: PublicTutorProfileDto }) {
  if (profile.subjects.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Subjects</h2>
      <div className={styles.subjectList}>
        {profile.subjects.map((subject) => (
          <div key={subject.subject_slug} className={styles.subjectItem}>
            <strong>{subject.subject_name}</strong>
            {subject.focus_areas.length > 0 && (
              <div className={styles.focusAreas}>
                {subject.focus_areas.map((fa) => (
                  <Badge key={fa.slug} variant="info">
                    {fa.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustSection({ profile }: { profile: PublicTutorProfileDto }) {
  if (!profile.trust_summary) return null;

  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sidebarTitle}>Trust proof</h3>
      <div className={styles.trustList}>
        {profile.trust_summary.trust_labels.map((label) => (
          <Badge key={label} variant="trust">
            {label}
          </Badge>
        ))}
      </div>
      {profile.trust_summary.verified_credential_count > 0 && (
        <p className={styles.trustNote}>
          {profile.trust_summary.verified_credential_count} verified{' '}
          {profile.trust_summary.verified_credential_count === 1
            ? 'credential'
            : 'credentials'}
        </p>
      )}
    </div>
  );
}

function LanguagesSection({ profile }: { profile: PublicTutorProfileDto }) {
  if (profile.languages.length === 0) return null;

  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sidebarTitle}>Languages</h3>
      <div className={styles.languageList}>
        {profile.languages.map((lang) => (
          <span key={lang.code} className={styles.languageTag}>
            {lang.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Render an external video embed using a provider-specific embed URL.
 * Never renders arbitrary user-supplied HTML — generates the iframe from
 * normalized provider + external_id.
 */
function IntroVideoSection({ profile }: { profile: PublicTutorProfileDto }) {
  if (!profile.intro_video) return null;

  const embedUrl = getEmbedUrl(
    profile.intro_video.provider,
    profile.intro_video.external_id,
  );
  if (!embedUrl) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Intro video</h2>
      <div className={styles.videoWrapper}>
        <iframe
          src={embedUrl}
          title={`${profile.display_name} introduction video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.videoIframe}
        />
      </div>
    </section>
  );
}

/**
 * Build a safe embed URL from normalized provider + external ID.
 * Only allowlisted providers are supported (YouTube, Vimeo, Loom).
 */
function getEmbedUrl(provider: string, externalId: string): string | null {
  switch (provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(externalId)}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${encodeURIComponent(externalId)}`;
    case 'loom':
      return `https://www.loom.com/embed/${encodeURIComponent(externalId)}`;
    default:
      return null;
  }
}
