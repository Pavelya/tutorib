import { NextResponse } from 'next/server';
import { getLessonIcsForParticipant } from '@/modules/lessons/service';

/**
 * Participant-scoped `.ics` export for a lesson.
 *
 * Authorization: caller must be either the student or the tutor on the
 * lesson. Declined/cancelled lessons return 404 so the calendar entry
 * disappears when the lesson no longer exists.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  const { lessonId } = await context.params;

  const result = await getLessonIcsForParticipant(lessonId);

  if (result.status === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return new NextResponse(result.ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
