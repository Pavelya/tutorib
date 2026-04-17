import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { learningNeeds } from './schema';
import { studentProfiles } from '@/modules/accounts/schema';

export type LearningNeed = typeof learningNeeds.$inferSelect;

export async function findStudentProfileByAppUserId(
  appUserId: string,
): Promise<{ id: string } | undefined> {
  const db = getDb();
  const rows = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.app_user_id, appUserId))
    .limit(1);
  return rows[0];
}

export async function findLearningNeedById(
  id: string,
): Promise<LearningNeed | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(learningNeeds)
    .where(eq(learningNeeds.id, id))
    .limit(1);
  return rows[0];
}

export async function createLearningNeed(data: {
  studentProfileId: string;
  needType: string;
  subjectId?: string;
  urgencyLevel: string;
  supportStyle: string;
  freeTextNote?: string;
  timezone?: string;
}): Promise<LearningNeed> {
  const db = getDb();
  const rows = await db
    .insert(learningNeeds)
    .values({
      student_profile_id: data.studentProfileId,
      need_type: data.needType,
      need_status: 'active',
      subject_id: data.subjectId ?? null,
      urgency_level: data.urgencyLevel,
      support_style: data.supportStyle,
      free_text_note: data.freeTextNote ?? null,
      timezone: data.timezone ?? null,
    })
    .returning();
  return rows[0];
}
