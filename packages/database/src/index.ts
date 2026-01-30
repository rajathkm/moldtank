// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - DATABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Export all schema (Drizzle)
export * from './schema';

// Export Supabase client
export * from './supabase';

// Export TypeScript types
export * from './types';

// Create Drizzle database connection
export function createDatabase(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type DrizzleDatabase = ReturnType<typeof createDatabase>;
