import { redirect, notFound } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { getMatchResults } from '@/modules/matching/service';
import { findLearningNeedById } from '@/modules/learning-needs/repository';
import { needTypeOptions, urgencyOptions, supportStyleOptions } from '@/modules/learning-needs/validation';
import { NeedSummaryBar } from '@/components/NeedSummaryBar/NeedSummaryBar';
import { MatchResultCard } from '@/components/MatchResultCard/MatchResultCard';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Button } from '@/components/Button/Button';
import Link from 'next/link';
import styles from './results.module.css';

interface ResultsPageProps {
  searchParams: Promise<{ needId?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const needId = params.needId;

  if (!needId) {
    redirect('/match');
  }

  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    redirect(`/auth/sign-in?next=/results?needId=${encodeURIComponent(needId)}`);
  }

  if (
    state.status === 'authenticated_no_profile' ||
    state.status === 'authenticated_role_pending'
  ) {
    redirect('/auth/role');
  }

  if (state.status === 'tutor_active' || state.status === 'tutor_pending_review') {
    redirect('/tutor/overview');
  }

  const result = await getMatchResults(needId);

  if (result.status === 'unauthenticated') {
    redirect(`/auth/sign-in?next=/results?needId=${encodeURIComponent(needId)}`);
  }

  if (result.status === 'forbidden' || result.status === 'not_found') {
    notFound();
  }

  const { run, candidates } = result.data;

  // Load the learning need for the summary bar
  const need = await findLearningNeedById(run.learning_need_id);
  const needLabel = need
    ? needTypeOptions.find((o) => o.value === need.need_type)?.label ?? 'Your need'
    : 'Your need';

  const qualifiers: { label: string; tone?: 'default' | 'muted' | 'warm' }[] = [];
  if (need?.urgency_level) {
    const urgLabel = urgencyOptions.find((o) => o.value === need.urgency_level)?.label;
    if (urgLabel) {
      qualifiers.push({ label: urgLabel, tone: need.urgency_level === 'urgent' ? 'warm' : 'default' });
    }
  }
  if (need?.support_style) {
    const styleLabel = supportStyleOptions.find((o) => o.value === need.support_style)?.label;
    if (styleLabel) {
      qualifiers.push({ label: styleLabel, tone: 'muted' });
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your matches</h1>
        <p className={styles.subtitle}>
          {candidates.length === 0
            ? 'We could not find matching tutors right now. Try broadening your need or check back later.'
            : `${candidates.length} tutor${candidates.length !== 1 ? 's' : ''} matched to your need`}
        </p>
      </div>

      <NeedSummaryBar
        label="Matched for"
        need={needLabel}
        qualifiers={qualifiers}
        state="locked"
        action={
          <Link href="/match">
            <Button variant="ghost" size="compact" type="button">
              New match
            </Button>
          </Link>
        }
      />

      {candidates.length === 0 ? (
        <EmptyState
          heading="No matches yet"
          description="Try adjusting your learning need or check back as new tutors join."
          action={
            <Link href="/match">
              <Button type="button">Try again</Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.resultList}>
          {candidates.map((candidate) => (
            <MatchResultCard key={candidate.match_candidate_id} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
}
