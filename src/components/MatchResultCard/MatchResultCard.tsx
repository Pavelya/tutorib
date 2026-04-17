import Link from 'next/link';
import clsx from 'clsx';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import type { MatchResultCardDto } from '@/modules/matching/dto';
import styles from './MatchResultCard.module.css';

interface MatchResultCardProps {
  candidate: MatchResultCardDto;
  className?: string;
}

function confidenceToBadgeVariant(label: string | null): 'positive' | 'trust' | 'info' {
  if (!label) return 'info';
  const lower = label.toLowerCase();
  if (lower === 'strong' || lower === 'excellent') return 'positive';
  if (lower === 'good') return 'trust';
  return 'info';
}

export function MatchResultCard({ candidate, className }: MatchResultCardProps) {
  const { tutor } = candidate;
  const profileHref = `/tutors/${tutor.public_slug}`;

  return (
    <article className={clsx(styles.card, className)}>
      {/* Header: rank + identity + confidence */}
      <div className={styles.header}>
        <span className={styles.rankBadge} aria-label={`Rank ${candidate.rank_position}`}>
          {candidate.rank_position}
        </span>
        <div className={styles.identity}>
          <h3 className={styles.tutorName}>
            <Link href={profileHref}>{tutor.display_name}</Link>
          </h3>
          {tutor.headline && (
            <p className={styles.headline}>{tutor.headline}</p>
          )}
        </div>
        {candidate.confidence_label && (
          <Badge
            variant={confidenceToBadgeVariant(candidate.confidence_label)}
            className={styles.confidenceBadge}
          >
            {candidate.confidence_label} fit
          </Badge>
        )}
      </div>

      {/* Fit explanation */}
      {(candidate.fit_summary || candidate.best_for_summary) && (
        <div className={styles.fitSection}>
          <span className={styles.fitLabel}>Why this tutor</span>
          {candidate.fit_summary && (
            <p className={styles.fitSummary}>{candidate.fit_summary}</p>
          )}
          {candidate.best_for_summary && (
            <p className={styles.bestFor}>{candidate.best_for_summary}</p>
          )}
        </div>
      )}

      {/* Subject and language chips */}
      {(tutor.subjects.length > 0 || tutor.languages.length > 0) && (
        <div className={styles.subjectChips}>
          {tutor.subjects.map((s) => (
            <span key={s.subject_slug} className={styles.subjectChip}>
              {s.subject_name}
            </span>
          ))}
          {tutor.languages.map((l) => (
            <span key={l.code} className={styles.languageChip}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Availability and trust signals */}
      {(candidate.availability_signal || candidate.trust_signal || tutor.trust_summary) && (
        <div className={styles.signals}>
          {candidate.availability_signal && (
            <Badge variant="info">{candidate.availability_signal}</Badge>
          )}
          {candidate.trust_signal && (
            <Badge variant="trust">{candidate.trust_signal}</Badge>
          )}
          {!candidate.trust_signal && tutor.trust_summary && tutor.trust_summary.verified_credential_count > 0 && (
            <Badge variant="trust">
              {tutor.trust_summary.verified_credential_count} verified credential{tutor.trust_summary.verified_credential_count !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Footer: pricing + actions */}
      <div className={styles.footer}>
        <span className={styles.pricing}>
          {tutor.pricing_summary ?? 'Pricing on request'}
        </span>
        <div className={styles.actions}>
          <Link href={profileHref}>
            <Button variant="ghost" size="compact" type="button">
              View profile
            </Button>
          </Link>
          <Link href={`/book/${candidate.match_candidate_id}`}>
            <Button size="compact" type="button">
              Book
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
