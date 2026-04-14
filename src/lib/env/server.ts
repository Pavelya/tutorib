import { z } from 'zod/v4';

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
});

function parseServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error('Missing or invalid server environment variables:\n', formatted);
    throw new Error('Server environment validation failed. Check logs above.');
  }

  return result.data;
}

export const serverEnv = parseServerEnv();
