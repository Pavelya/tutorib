import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getServerEnv } from '@/lib/env/server';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (!_db) {
    const queryClient = postgres(getServerEnv().DATABASE_URL);
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}
