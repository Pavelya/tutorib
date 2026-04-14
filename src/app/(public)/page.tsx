import type { Metadata } from 'next';
import { site } from '@/lib/config/site';

export const metadata: Metadata = {
  title: `Find Your IB Mentor | ${site.name}`,
  description: site.description,
};

export default function HomePage() {
  return (
    <div>
      <h1>{site.name}</h1>
    </div>
  );
}
