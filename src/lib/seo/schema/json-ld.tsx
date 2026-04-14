/**
 * Server-rendered JSON-LD component.
 *
 * Usage from a route page or layout (Server Component only):
 *
 *   <JsonLd data={buildOrganization()} />
 *
 * The payload is sanitized by escaping `</script` sequences to prevent XSS.
 */

export interface JsonLdProps {
  data: Record<string, unknown>;
}

function sanitizeJsonLd(json: string): string {
  // Prevent premature script tag closing — standard JSON-LD safety measure
  return json.replace(/<\/script/gi, '<\\/script');
}

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(json) }}
    />
  );
}
