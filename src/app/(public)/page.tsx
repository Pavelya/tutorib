import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Your IB Tutor | Tutor IB',
  description:
    'Find expert IB tutors matched to your learning needs. Tutor IB connects students with qualified International Baccalaureate tutors.',
};

export default function HomePage() {
  return (
    <div>
      <h1>Tutor IB</h1>
    </div>
  );
}
