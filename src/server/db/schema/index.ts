/**
 * Barrel re-export for all Drizzle table declarations.
 * Domain modules own their own schema files; this file aggregates them
 * for the shared DB client.
 */
export { appUsers, userRoles, studentProfiles } from '@/modules/accounts/schema';
export { jobRuns, webhookEvents } from '@/modules/jobs/schema';
export {
  subjects,
  subjectFocusAreas,
  languages,
  countries,
  meetingProviders,
  videoMediaProviders,
} from '@/modules/reference/schema';
export {
  tutorProfiles,
  tutorSubjectCapabilities,
  tutorLanguageCapabilities,
  tutorCredentials,
} from '@/modules/tutors/schema';
export {
  schedulePolicies,
  availabilityRules,
  availabilityOverrides,
} from '@/modules/availability/schema';
export {
  conversations,
  conversationParticipants,
  messages,
  messageReads,
  userBlocks,
  abuseReports,
} from '@/modules/conversations/schema';
export { learningNeeds } from '@/modules/learning-needs/schema';
export { matchRuns, matchCandidates } from '@/modules/matching/schema';
export {
  lessons,
  lessonStatusHistory,
  lessonMeetingAccess,
  lessonReports,
  lessonIssueCases,
} from '@/modules/lessons/schema';
export { payments, earnings } from '@/modules/payments/schema';
export {
  notifications,
  notificationDeliveries,
  policyNoticeVersions,
  policyNoticeReceipts,
} from '@/modules/notifications/schema';
