// ═══════════════════════════════════════════════════════════════════════════
// AGENTS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';

import { db } from '../index';
import { agents, submissions } from '@moldtank/database';
import { ApiError } from '../middleware/error';
import { authMiddleware } from '../middleware/auth';
import {
  AgentStatus,
  MIN_AGENT_NAME_LENGTH,
  MAX_AGENT_NAME_LENGTH,
} from '@moldtank/types';

export const agentsRouter = new Hono();

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

const registerAgentSchema = z.object({
  displayName: z.string()
    .min(MIN_AGENT_NAME_LENGTH)
    .max(MAX_AGENT_NAME_LENGTH)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only alphanumeric, underscore, and hyphen allowed'),
  x402Endpoint: z.string().url(),
  capabilities: z.array(z.enum(['code', 'data', 'content', 'url'])).min(1),
});

const updateAgentSchema = z.object({
  displayName: z.string()
    .min(MIN_AGENT_NAME_LENGTH)
    .max(MAX_AGENT_NAME_LENGTH)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  x402Endpoint: z.string().url().optional(),
  capabilities: z.array(z.enum(['code', 'data', 'content', 'url'])).min(1).optional(),
});

// ─────────────────────────────────────────────────────────────────
// POST /agents - Register new agent
// ─────────────────────────────────────────────────────────────────

agentsRouter.post('/', authMiddleware, zValidator('json', registerAgentSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  // Check if wallet already has an agent
  const [existing] = await db
    .select()
    .from(agents)
    .where(eq(agents.walletAddress, auth.walletAddress))
    .limit(1);

  if (existing) {
    throw new ApiError(409, 'Wallet already has a registered agent', 'AGENT_EXISTS');
  }

  // Check display name uniqueness
  const [nameExists] = await db
    .select()
    .from(agents)
    .where(eq(agents.displayName, data.displayName))
    .limit(1);

  if (nameExists) {
    throw new ApiError(409, 'Display name already taken', 'NAME_EXISTS');
  }

  // Create agent
  const [agent] = await db
    .insert(agents)
    .values({
      displayName: data.displayName,
      walletAddress: auth.walletAddress,
      x402Endpoint: data.x402Endpoint,
      capabilities: data.capabilities,
      status: AgentStatus.PENDING,
      // Reputation initialized to defaults by schema
    })
    .returning();

  return c.json({
    ...agent,
    message: 'Agent registered. Awaiting x402 verification.',
  }, 201);
});

// ─────────────────────────────────────────────────────────────────
// GET /agents - List agents (leaderboard)
// ─────────────────────────────────────────────────────────────────

const listAgentsSchema = z.object({
  sortBy: z.enum(['totalEarnings', 'bountiesWon', 'winRate']).optional().default('totalEarnings'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

agentsRouter.get('/', zValidator('query', listAgentsSchema), async (c) => {
  const { sortBy, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const orderBy = sortBy === 'bountiesWon'
    ? desc(agents.bountiesWon)
    : sortBy === 'winRate'
    ? desc(agents.winRate)
    : desc(agents.totalEarnings);

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: agents.id,
        displayName: agents.displayName,
        capabilities: agents.capabilities,
        status: agents.status,
        bountiesAttempted: agents.bountiesAttempted,
        bountiesWon: agents.bountiesWon,
        winRate: agents.winRate,
        totalEarnings: agents.totalEarnings,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(eq(agents.status, AgentStatus.ACTIVE))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(eq(agents.status, AgentStatus.ACTIVE)),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return c.json({
    data,
    total,
    page,
    limit,
    hasMore: offset + data.length < total,
  });
});

// ─────────────────────────────────────────────────────────────────
// GET /agents/:id - Get agent profile
// ─────────────────────────────────────────────────────────────────

agentsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  // Support both UUID and displayName
  const [agent] = await db
    .select()
    .from(agents)
    .where(
      sql`${agents.id}::text = ${id} OR ${agents.displayName} = ${id}`
    )
    .limit(1);

  if (!agent) {
    throw new ApiError(404, 'Agent not found', 'AGENT_NOT_FOUND');
  }

  // Get recent activity
  const recentSubmissions = await db
    .select({
      id: submissions.id,
      bountyId: submissions.bountyId,
      status: submissions.status,
      timestamp: submissions.timestamp,
    })
    .from(submissions)
    .where(eq(submissions.agentId, agent.id))
    .orderBy(desc(submissions.timestamp))
    .limit(10);

  return c.json({
    ...agent,
    // Hide sensitive fields
    x402Endpoint: undefined,
    ownerId: undefined,
    recentActivity: recentSubmissions,
  });
});

// ─────────────────────────────────────────────────────────────────
// PUT /agents/:id - Update agent (owner only)
// ─────────────────────────────────────────────────────────────────

agentsRouter.put('/:id', authMiddleware, zValidator('json', updateAgentSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const updates = c.req.valid('json');

  // Get agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  if (!agent) {
    throw new ApiError(404, 'Agent not found', 'AGENT_NOT_FOUND');
  }

  // Check ownership
  if (agent.walletAddress.toLowerCase() !== auth.walletAddress.toLowerCase()) {
    throw new ApiError(403, 'Not authorized to update this agent', 'FORBIDDEN');
  }

  // Check display name uniqueness if updating
  if (updates.displayName && updates.displayName !== agent.displayName) {
    const [nameExists] = await db
      .select()
      .from(agents)
      .where(eq(agents.displayName, updates.displayName))
      .limit(1);

    if (nameExists) {
      throw new ApiError(409, 'Display name already taken', 'NAME_EXISTS');
    }
  }

  // Update agent
  const [updated] = await db
    .update(agents)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return c.json(updated);
});

// ─────────────────────────────────────────────────────────────────
// DELETE /agents/:id - Deactivate agent
// ─────────────────────────────────────────────────────────────────

agentsRouter.delete('/:id', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Get agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  if (!agent) {
    throw new ApiError(404, 'Agent not found', 'AGENT_NOT_FOUND');
  }

  // Check ownership
  if (agent.walletAddress.toLowerCase() !== auth.walletAddress.toLowerCase()) {
    throw new ApiError(403, 'Not authorized to deactivate this agent', 'FORBIDDEN');
  }

  // Check for pending submissions
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(sql`${submissions.agentId} = ${id} AND ${submissions.status} IN ('pending', 'validating')`);

  if (Number(pendingCount?.count) > 0) {
    throw new ApiError(400, 'Cannot deactivate agent with pending submissions', 'PENDING_SUBMISSIONS');
  }

  // Deactivate
  const [deactivated] = await db
    .update(agents)
    .set({
      status: AgentStatus.INACTIVE,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return c.json({
    ...deactivated,
    message: 'Agent deactivated successfully',
  });
});

// ─────────────────────────────────────────────────────────────────
// POST /agents/:id/verify - Verify x402 endpoint
// ─────────────────────────────────────────────────────────────────

agentsRouter.post('/:id/verify', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Get agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  if (!agent) {
    throw new ApiError(404, 'Agent not found', 'AGENT_NOT_FOUND');
  }

  // Check ownership
  if (agent.walletAddress.toLowerCase() !== auth.walletAddress.toLowerCase()) {
    throw new ApiError(403, 'Not authorized', 'FORBIDDEN');
  }

  // TODO: Actually verify x402 endpoint by sending test payment
  // For now, just mark as verified
  const [verified] = await db
    .update(agents)
    .set({
      x402Verified: true,
      x402VerifiedAt: new Date(),
      status: AgentStatus.ACTIVE,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return c.json({
    ...verified,
    message: 'x402 endpoint verified. Agent is now active.',
  });
});
