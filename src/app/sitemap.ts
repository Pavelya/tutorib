import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap for Phase 1 public pages.
 *
 * Includes only Class A routes. Dynamic routes (e.g. tutor profiles) are
 * added only after passing a quality gate — currently stubbed with a
 * placeholder for when tutor data is available.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  // ── Static Class A routes ───────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/trust-and-safety`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/become-a-tutor`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // ── Dynamic Class A routes (quality-gated) ──────────────────────
  // Tutor profiles: added when tutor data + quality gate are available.
  // The quality gate ensures only approved, complete profiles enter the
  // sitemap. Thin or pending profiles are excluded.
  //
  // Future: fetch approved tutor slugs from the database and map them:
  //   const tutors = await getApprovedTutorSlugs();
  //   const tutorRoutes = tutors.map(slug => ({
  //     url: `${baseUrl}/tutors/${slug}`,
  //     lastModified: new Date(),
  //     changeFrequency: 'weekly' as const,
  //     priority: 0.7,
  //   }));

  return staticRoutes;
}
