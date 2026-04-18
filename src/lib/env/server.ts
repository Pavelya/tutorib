import { z } from 'zod/v4';

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.email(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let _cached: ServerEnv | undefined;

function parseServerEnv(): ServerEnv {
  if (_cached) return _cached;

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error('Missing or invalid server environment variables:\n', formatted);
    throw new Error('Server environment validation failed. Check logs above.');
  }

  _cached = result.data;
  return _cached;
}

/**
 * Server environment variables — parsed and validated on first access.
 * Lazy so that module imports during build don't throw when env vars are absent.
 */
export function getServerEnv(): ServerEnv {
  return parseServerEnv();
}
