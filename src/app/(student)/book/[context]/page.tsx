import { notFound, redirect } from 'next/navigation';
import { z } from 'zod/v4';
import { getBookingContext } from '@/modules/lessons/service';
import { BookFormClient } from './book-form-client';
import styles from './book.module.css';

const uuidSchema = z.string().uuid();

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ context: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const [{ context }, sp] = await Promise.all([params, searchParams]);

  const parsed = uuidSchema.safeParse(context);
  if (!parsed.success) {
    notFound();
  }

  const result = await getBookingContext(parsed.data);

  if (result.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }

  if (result.status !== 'found') {
    notFound();
  }

  const { context: ctx } = result;
  const cancelled = sp.cancelled === '1';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.kicker}>Request a lesson</span>
        <h1 className={styles.title}>Book with {ctx.tutor.display_name}</h1>
        {ctx.tutor.headline && (
          <p className={styles.headline}>{ctx.tutor.headline}</p>
        )}
      </header>

      {cancelled && (
        <div className={styles.cancelledNotice}>
          Payment authorization was cancelled. You can pick a new time and try
          again.
        </div>
      )}

      <section className={styles.contextCard}>
        {ctx.subject_snapshot && (
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Subject</span>
            <span className={styles.contextValue}>{ctx.subject_snapshot}</span>
          </div>
        )}
        {ctx.focus_snapshot && (
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Focus</span>
            <span className={styles.contextValue}>{ctx.focus_snapshot}</span>
          </div>
        )}
        {ctx.tutor.pricing_summary && (
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Tutor pricing</span>
            <span className={styles.contextValue}>{ctx.tutor.pricing_summary}</span>
          </div>
        )}
        <div className={styles.contextRow}>
          <span className={styles.contextLabel}>Authorization hold</span>
          <span className={styles.contextValue}>
            {formatMoney(ctx.default_price_amount, ctx.default_currency_code)}
          </span>
        </div>
        <div className={styles.contextRow}>
          <span className={styles.contextLabel}>Minimum notice</span>
          <span className={styles.contextValue}>{ctx.minimum_notice_hours} hours</span>
        </div>
      </section>

      <BookFormClient
        matchCandidateId={ctx.match_candidate_id}
        initialTimezone={ctx.student_timezone}
        minimumNoticeHours={ctx.minimum_notice_hours}
      />
    </div>
  );
}

function formatMoney(amount: string, currencyCode: string): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currencyCode}`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(num);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}
