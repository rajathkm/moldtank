// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql, asc } from 'drizzle-orm';
import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';

import { db } from '../index';
import { submissions, bounties, agents } from '@moldtank/database';
import { ApiError } from '../middleware/error';
import { authMiddleware } from '../middleware/auth';
import {
  SubmissionStatus,
  BountyStatus,
  AgentStatus,
  MAX_PAYLOAD_SIZE_BYTES,
} from '@moldtank/types';

export const submissionsRouter = new Hono();

// ─────────────────────────────────────────────────────────────────
// SECURITY: Blocked patterns to prevent seed phrase extraction
// ─────────────────────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /\b(seed|mnemonic|phrase|recovery)\b.*\b(word|phrase)\b/i,
  /\b(private|secret)\s*(key)\b/i,
  /0x[a-fA-F0-9]{64}/, // Private key pattern
  /\b([a-z]+\s+){11,23}[a-z]+\b/, // 12-24 word phrase (BIP-39)
];

function containsBlockedPatterns(payload: any): boolean {
  const str = JSON.stringify(payload);
  return BLOCKED_PATTERNS.some(pattern => pattern.test(str));
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

const submitSolutionSchema = z.object({
  bountyId: z.string().uuid(),
  payload: z.object({
    type: z.enum(['code', 'data', 'content', 'url']),
  }).passthrough(),
  metadata: z.object({
    executionTimeMs: z.number().optional(),
    resourcesUsed: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
  signature: z.string(),
});

// ─────────────────────────────────────────────────────────────────
// POST /submissions - Submit a solution
// ─────────────────────────────────────────────────────────────────

submissionsRouter.post('/', authMiddleware, zValidator('json', submitSolutionSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  // Must be a registered agent
  if (!auth.agentId) {
    throw new ApiError(403, 'Must be a registered agent to submit', 'NOT_AGENT');
  }

  // Get agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, auth.agentId))
    .limit(1);

  if (!agent || agent.status !== AgentStatus.ACTIVE) {
    throw new ApiError(403, 'Agent is not active', 'AGENT_INACTIVE');
  }

  // Get bounty
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, data.bountyId))
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Check bounty is open
  if (bounty.status !== BountyStatus.OPEN && bounty.status !== BountyStatus.IN_PROGRESS) {
    throw new ApiError(400, 'Bounty is not accepting submissions', 'BOUNTY_NOT_OPEN');
  }

  // Check deadline
  if (new Date(bounty.deadline) < new Date()) {
    throw new ApiError(400, 'Bounty deadline has passed', 'DEADLINE_PASSED');
  }

  // Check payload type matches criteria
  if ((bounty.criteria as any).type !== data.payload.type) {
    throw new ApiError(400, `Submission type must be ${(bounty.criteria as any).type}`, 'TYPE_MISMATCH');
  }

  // Check for existing submission
  const [existing] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.bountyId, data.bountyId),
        eq(submissions.agentId, auth.agentId)
      )
    )
    .limit(1);

  if (existing) {
    throw new ApiError(409, 'You have already submitted to this bounty', 'DUPLICATE_SUBMISSION');
  }

  // Security: Check for blocked patterns
  if (containsBlockedPatterns(data.payload)) {
    throw new ApiError(400, 'Submission contains blocked content patterns', 'BLOCKED_CONTENT');
  }

  // Check payload size
  const payloadSize = JSON.stringify(data.payload).length;
  if (payloadSize > MAX_PAYLOAD_SIZE_BYTES) {
    throw new ApiError(400, `Payload exceeds maximum size of ${MAX_PAYLOAD_SIZE_BYTES} bytes`, 'PAYLOAD_TOO_LARGE');
  }

  // Calculate payload hash
  const payloadHash = CryptoJS.SHA256(JSON.stringify(data.payload)).toString();

  // Verify signature
  try {
    const recoveredAddress = ethers.verifyMessage(payloadHash, data.signature);
    if (recoveredAddress.toLowerCase() !== agent.walletAddress.toLowerCase()) {
      throw new ApiError(400, 'Signature does not match agent wallet', 'INVALID_SIGNATURE');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'Invalid signature', 'INVALID_SIGNATURE');
  }

  // Create submission
  const now = new Date();
  const [submission] = await db
    .insert(submissions)
    .values({
      bountyId: data.bountyId,
      agentId: auth.agentId,
      agentWallet: agent.walletAddress,
      timestamp: now,
      receivedAt: now,
      payload: data.payload,
      payloadHash,
      signature: data.signature,
      metadata: data.metadata || {},
      status: SubmissionStatus.PENDING,
    })
    .returning();

  // Update bounty counts and status
  await db
    .update(bounties)
    .set({
      submissionCount: sql`${bounties.submissionCount} + 1`,
      status: BountyStatus.IN_PROGRESS,
      updatedAt: now,
    })
    .where(eq(bounties.id, data.bountyId));

  // Update agent activity
  await db
    .update(agents)
    .set({
      lastActiveAt: now,
      bountiesAttempted: sql`${agents.bountiesAttempted} + 1`,
    })
    .where(eq(agents.id, auth.agentId));

  return c.json({
    ...submission,
    position: bounty.submissionCount + 1,
    message: 'Submission received. Queued for validation.',
  }, 201);
});

// ─────────────────────────────────────────────────────────────────
// GET /submissions/:id - Get submission details
// ─────────────────────────────────────────────────────────────────

submissionsRouter.get('/:id', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Get submission
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  if (!submission) {
    throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
  }

  // Get bounty for authorization check
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, submission.bountyId))
    .limit(1);

  // Check authorization
  const isSubmitter = auth.agentId === submission.agentId;
  const isOwner = auth.walletAddress.toLowerCase() === bounty?.posterWallet.toLowerCase();

  if (!isSubmitter && !isOwner && submission.status !== SubmissionStatus.PASSED) {
    // Return limited info
    return c.json({
      id: submission.id,
      bountyId: submission.bountyId,
      status: submission.status,
      timestamp: submission.timestamp,
      payload: { type: (submission.payload as any).type, hidden: true },
    });
  }

  // Calculate position in queue
  const [positionResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(
      and(
        eq(submissions.bountyId, submission.bountyId),
        sql`${submissions.timestamp} <= ${submission.timestamp}`
      )
    );

  return c.json({
    ...submission,
    position: Number(positionResult?.count || 1),
  });
});

// ─────────────────────────────────────────────────────────────────
// GET /submissions/my - Get current user's submissions
// ─────────────────────────────────────────────────────────────────

submissionsRouter.get('/my/all', authMiddleware, async (c) => {
  const auth = c.get('auth');

  if (!auth.agentId) {
    return c.json({ data: [], total: 0 });
  }

  const mySubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.agentId, auth.agentId))
    .orderBy(asc(submissions.timestamp));

  return c.json({
    data: mySubmissions,
    total: mySubmissions.length,
  });
});
