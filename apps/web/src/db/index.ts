// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - DATABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Export all schema
export * from './schema';

// Create database connection
export function createDatabase(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
