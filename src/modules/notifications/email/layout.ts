import { site } from '@/lib/config/site';

export interface BrandedEmailContent {
  preheader: string;
  heading: string;
  bodyLines: string[];
  cta: {
    label: string;
    path: string;
  };
  closing?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COLOR_BG = '#F7F7F5';
const COLOR_CARD = '#FFFFFF';
const COLOR_TEXT = '#1F2933';
const COLOR_MUTED = '#52606D';
const COLOR_ACCENT = '#1B2A4E';
const COLOR_BUTTON_BG = '#1B2A4E';
const COLOR_BUTTON_TEXT = '#FFFFFF';
const COLOR_BORDER = '#E4E7EB';

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'IBM Plex Sans', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(path: string): string {
  const base = site.url.replace(/\/+$/, '');
  const rel = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rel}`;
}

function renderHtml(
  subject: string,
  content: BrandedEmailContent,
  ctaUrl: string,
): string {
  const paragraphs = content.bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:${COLOR_TEXT};">${escapeHtml(line)}</p>`,
    )
    .join('');

  const closing = content.closing
    ? `<p style="margin:24px 0 0 0;font-size:14px;line-height:1.5;color:${COLOR_MUTED};">${escapeHtml(content.closing)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLOR_BG};font-family:${FONT_STACK};color:${COLOR_TEXT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${COLOR_CARD};border:1px solid ${COLOR_BORDER};border-radius:12px;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="font-size:18px;font-weight:600;letter-spacing:-0.01em;color:${COLOR_ACCENT};">${escapeHtml(site.name)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:600;color:${COLOR_TEXT};">${escapeHtml(content.heading)}</h1>
                ${paragraphs}
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;">
                  <tr>
                    <td style="border-radius:8px;background:${COLOR_BUTTON_BG};">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;color:${COLOR_BUTTON_TEXT};text-decoration:none;border-radius:8px;">${escapeHtml(content.cta.label)}</a>
                    </td>
                  </tr>
                </table>
                ${closing}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px 32px;border-top:1px solid ${COLOR_BORDER};margin-top:24px;">
                <p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:${COLOR_MUTED};">You're receiving this because of activity on your ${escapeHtml(site.name)} account. For your security, we only send a short summary — open ${escapeHtml(site.name)} for the full details.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(content: BrandedEmailContent, ctaUrl: string): string {
  const lines: string[] = [];
  lines.push(site.name);
  lines.push('');
  lines.push(content.heading);
  lines.push('');
  for (const line of content.bodyLines) lines.push(line);
  lines.push('');
  lines.push(`${content.cta.label}: ${ctaUrl}`);
  if (content.closing) {
    lines.push('');
    lines.push(content.closing);
  }
  lines.push('');
  lines.push(
    `You're receiving this because of activity on your ${site.name} account. Open ${site.name} for full details.`,
  );
  return lines.join('\n');
}

export function renderBrandedEmail(
  subject: string,
  content: BrandedEmailContent,
): RenderedEmail {
  const ctaUrl = absoluteUrl(content.cta.path);
  return {
    subject,
    html: renderHtml(subject, content, ctaUrl),
    text: renderText(content, ctaUrl),
  };
}
