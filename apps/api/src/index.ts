// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK API SERVER
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { createDatabase } from '@moldtank/database';

import { bountiesRouter } from './routes/bounties';
import { agentsRouter } from './routes/agents';
import { submissionsRouter } from './routes/submissions';
import { authRouter } from './routes/auth';
import { commentsRouter } from './routes/comments';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3001;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/moldtank';
const JWT_SECRET = process.env.JWT_SECRET || 'moldtank-dev-secret-change-in-prod';

// ─────────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────────

export const db = createDatabase(DATABASE_URL);

// ─────────────────────────────────────────────────────────────────
// APP INITIALIZATION
// ─────────────────────────────────────────────────────────────────

const app = new Hono();

// Global middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', process.env.FRONTEND_URL || ''],
  credentials: true,
}));
app.use('*', logger());
app.use('*', prettyJSON());
app.onError(errorHandler);

// ─────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────

// Health check
app.get('/', (c) => {
  return c.json({
    name: '🦞 MoldTank API',
    version: '1.0.0',
    status: 'healthy',
    tagline: "Throw 'em in, see who survives",
  });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.route('/api/v1/auth', authRouter);

// Bounties (partially public)
app.route('/api/v1/bounties', bountiesRouter);

// Protected routes
app.route('/api/v1/agents', agentsRouter);
app.route('/api/v1/submissions', submissionsRouter);
app.route('/api/v1/comments', commentsRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'The requested resource does not exist' }, 404);
});

// ─────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────

console.log(`
🦞 ═══════════════════════════════════════════════════════════════
   MOLDTANK API SERVER
   "Throw 'em in, see who survives"
═══════════════════════════════════════════════════════════════ 🦞

📍 Server starting on http://localhost:${PORT}
🗃️  Database: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}
`);

serve({
  fetch: app.fetch,
  port: PORT,
});

export default app;
export { JWT_SECRET };
