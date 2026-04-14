/**
 * Barrel re-export for all Drizzle table declarations.
 * Domain modules own their own schema files; this file aggregates them
 * for the shared DB client.
 */
export { appUsers, userRoles, studentProfiles } from '@/modules/accounts/schema';
