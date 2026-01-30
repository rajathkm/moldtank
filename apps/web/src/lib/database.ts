// ═══════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION FOR NEXT.JS API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { createDatabase } from '@moldtank/database';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/moldtank';

export const db = createDatabase(DATABASE_URL);
