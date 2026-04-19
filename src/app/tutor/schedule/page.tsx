import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Panel } from '@/components/Panel/Panel';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { site } from '@/lib/config/site';
import { getTutorSchedule } from '@/modules/availability/service';
import { DAYS_OF_WEEK } from '@/modules/availability/dto';
import { SchedulePolicyForm } from './SchedulePolicyForm';
import { AvailabilityRulesEditor } from './AvailabilityRulesEditor';
import { MeetingPreferenceForm } from './MeetingPreferenceForm';
import styles from './schedule.module.css';

export const metadata: Metadata = {
  title: `Schedule — ${site.name}`,
  robots: { index: false, follow: false },
};

export default async function TutorSchedulePage() {
  const result = await getTutorSchedule();

  if (result.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }
  if (result.status === 'forbidden') {
    notFound();
  }

  const { schedule } = result;
  const meetingConfigured =
    schedule.meeting_preference.provider_key !== null &&
    schedule.meeting_preference.default_meeting_url !== null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Schedule</h1>
        <p className={styles.subheading}>
          Set the booking rules students see, the recurring hours you teach,
          and the meeting link new lessons will use.
        </p>
      </header>

      <section
        aria-labelledby="schedule-policy"
        className={styles.section}
      >
        <div className={styles.sectionHead}>
          <h2 id="schedule-policy" className={styles.sectionHeading}>
            Booking rules
          </h2>
          <p className={styles.sectionHint}>
            Times shown to students use this timezone. The minimum notice
            window hides slots that start too soon to confirm.
          </p>
        </div>
        <Panel as="div" variant="default" className={styles.formPanel}>
          <SchedulePolicyForm policy={schedule.policy} />
        </Panel>
      </section>

      <section
        aria-labelledby="availability-rules"
        className={styles.section}
      >
        <div className={styles.sectionHead}>
          <h2 id="availability-rules" className={styles.sectionHeading}>
            Recurring availability
          </h2>
          <p className={styles.sectionHint}>
            Each window repeats every week in your booking timezone. Add
            multiple windows per day for split schedules.
          </p>
        </div>
        <Panel as="div" variant="default" className={styles.formPanel}>
          {schedule.rules.length === 0 ? (
            <EmptyState
              heading="No recurring hours yet"
              description="Add your first window so students can request lessons."
            />
          ) : null}
          <AvailabilityRulesEditor
            rules={schedule.rules}
            days={DAYS_OF_WEEK.map((d) => ({ value: d.value, long: d.long }))}
          />
        </Panel>
      </section>

      <section
        aria-labelledby="meeting-preference"
        className={styles.section}
      >
        <div className={styles.sectionHead}>
          <h2 id="meeting-preference" className={styles.sectionHeading}>
            Default meeting link
          </h2>
          <p className={styles.sectionHint}>
            New lessons will use this link unless you override it on the
            individual lesson. Only your students can see it.
          </p>
          <Badge variant={meetingConfigured ? 'positive' : 'warning'}>
            {meetingConfigured ? 'Configured' : 'Needs setup'}
          </Badge>
        </div>
        <Panel as="div" variant="default" className={styles.formPanel}>
          <MeetingPreferenceForm
            preference={schedule.meeting_preference}
            providerOptions={schedule.meeting_provider_options}
          />
        </Panel>
      </section>
    </div>
  );
}
