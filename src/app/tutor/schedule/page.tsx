import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Panel } from '@/components/Panel/Panel';
import { Badge } from '@/components/Badge/Badge';
import { site } from '@/lib/config/site';
import { getTutorSchedule } from '@/modules/availability/service';
import { SchedulePolicyForm } from './SchedulePolicyForm';
import { AvailabilityGrid } from './AvailabilityGrid';
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
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.heading}>Schedule</h1>
          <p className={styles.subheading}>
            Control when students can book, the weekly hours you teach, and the
            meeting link new lessons use.
          </p>
        </header>

        <section
          aria-labelledby="schedule-policy"
          className={styles.section}
        >
          <div className={styles.sectionHead}>
            <h2 id="schedule-policy" className={styles.sectionHeading}>
              Booking status
            </h2>
            <p className={styles.sectionHint}>
              Pause new requests while you catch up, then turn them back on
              when you have room.
            </p>
          </div>
          <Panel as="div" variant="default" className={styles.formPanel}>
            <SchedulePolicyForm
              policy={schedule.policy}
              timezoneLabel={schedule.policy.timezone}
            />
          </Panel>
        </section>

        <section
          aria-labelledby="availability-rules"
          className={styles.section}
        >
          <div className={styles.sectionHead}>
            <h2 id="availability-rules" className={styles.sectionHeading}>
              Weekly availability
            </h2>
            <p className={styles.sectionHint}>
              Click an hour to mark yourself available. Drag across cells to
              select a range. The grid repeats every week.
            </p>
          </div>
          <Panel as="div" variant="default" className={styles.formPanel}>
            <AvailabilityGrid rules={schedule.rules} />
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
              New lessons use this link unless you override it on the
              individual lesson. Only your confirmed students can see it.
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
    </div>
  );
}
