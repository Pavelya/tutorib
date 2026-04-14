import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server';
import { processDueJobs } from '@/modules/jobs/cron-runner';

/**
 * Vercel Cron route for scheduled job execution.
 *
 * Triggered on a schedule defined in vercel.json.
 * Authenticates via the CRON_SECRET header that Vercel sends automatically.
 *
 * Responsibilities:
 * - Authenticate the cron trigger
 * - Claim and process due background jobs
 * - Return execution summary
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${getServerEnv().CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processed = await processDueJobs();

    return NextResponse.json({
      ok: true,
      processed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron] Job processing failed:', message);

    return NextResponse.json(
      { ok: false, error: 'Job processing failed' },
      { status: 500 },
    );
  }
}
