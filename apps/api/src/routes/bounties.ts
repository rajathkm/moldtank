// ═══════════════════════════════════════════════════════════════════════════
// BOUNTIES ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, gte, lte, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import slugify from 'slugify';

import { db } from '../index';
import { bounties, submissions, comments as commentsTable } from '@moldtank/database';
import { ApiError } from '../middleware/error';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import {
  BountyStatus,
  EscrowStatus,
  PLATFORM_FEE_PERCENT,
  MIN_BOUNTY_AMOUNT,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  DEFAULT_PAGE_SIZE,
} from '@moldtank/types';

export const bountiesRouter = new Hono();

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

const createBountySchema = z.object({
  title: z.string().min(5).max(MAX_TITLE_LENGTH),
  description: z.string().min(20).max(MAX_DESCRIPTION_LENGTH),
  amount: z.number().min(MIN_BOUNTY_AMOUNT),
  deadline: z.string().datetime(),
  criteria: z.object({
    type: z.enum(['code', 'data', 'content', 'url']),
  }).passthrough(), // Allow additional criteria fields
  escrowTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

const listBountiesSchema = z.object({
  status: z.enum(['draft', 'open', 'in_progress', 'completed', 'expired', 'cancelled', 'disputed']).optional(),
  type: z.enum(['code', 'data', 'content', 'url']).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  sortBy: z.enum(['deadline', 'amount', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────
// GET /bounties - List bounties (public)
// ─────────────────────────────────────────────────────────────────

bountiesRouter.get('/', zValidator('query', listBountiesSchema), async (c) => {
  const filters = c.req.valid('query');
  const { status, type, minAmount, maxAmount, sortBy, sortOrder, page, limit, search } = filters;

  // Build conditions
  const conditions = [];
  
  if (status) {
    conditions.push(eq(bounties.status, status));
  } else {
    // Default: show only open bounties for public view
    conditions.push(
      or(
        eq(bounties.status, 'open'),
        eq(bounties.status, 'in_progress'),
        eq(bounties.status, 'completed')
      )
    );
  }
  
  if (type) {
    conditions.push(sql`${bounties.criteria}->>'type' = ${type}`);
  }
  
  if (minAmount !== undefined) {
    conditions.push(gte(bounties.amount, String(minAmount)));
  }
  
  if (maxAmount !== undefined) {
    conditions.push(lte(bounties.amount, String(maxAmount)));
  }
  
  if (search) {
    conditions.push(
      or(
        ilike(bounties.title, `%${search}%`),
        ilike(bounties.description, `%${search}%`)
      )
    );
  }

  // Sorting
  const orderBy = sortBy === 'deadline' 
    ? (sortOrder === 'asc' ? asc(bounties.deadline) : desc(bounties.deadline))
    : sortBy === 'amount'
    ? (sortOrder === 'asc' ? asc(bounties.amount) : desc(bounties.amount))
    : (sortOrder === 'asc' ? asc(bounties.createdAt) : desc(bounties.createdAt));

  // Execute query
  const offset = (page - 1) * limit;
  
  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(bounties)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(bounties)
      .where(and(...conditions)),
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
// GET /bounties/:id - Get bounty details
// ─────────────────────────────────────────────────────────────────

bountiesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  // Support both UUID and slug
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(
      or(
        eq(bounties.id, id),
        eq(bounties.slug, id)
      )
    )
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Increment view count
  await db
    .update(bounties)
    .set({ viewCount: sql`${bounties.viewCount} + 1` })
    .where(eq(bounties.id, bounty.id));

  // Get submissions count by status
  const submissionStats = await db
    .select({
      status: submissions.status,
      count: sql<number>`count(*)`,
    })
    .from(submissions)
    .where(eq(submissions.bountyId, bounty.id))
    .groupBy(submissions.status);

  return c.json({
    ...bounty,
    submissionStats,
  });
});

// ─────────────────────────────────────────────────────────────────
// POST /bounties - Create bounty (authenticated)
// ─────────────────────────────────────────────────────────────────

bountiesRouter.post('/', authMiddleware, zValidator('json', createBountySchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');
  
  // Calculate fees
  const amount = data.amount;
  const platformFee = amount * (PLATFORM_FEE_PERCENT / 100);
  const winnerPayout = amount - platformFee;
  
  // Generate slug
  const baseSlug = slugify(data.title, { lower: true, strict: true });
  const slug = `${baseSlug}-${nanoid(6)}`;
  
  // Create bounty
  const [bounty] = await db
    .insert(bounties)
    .values({
      slug,
      posterId: auth.agentId || auth.walletAddress,
      posterWallet: auth.walletAddress,
      title: data.title,
      description: data.description,
      amount: String(amount),
      platformFee: String(platformFee),
      winnerPayout: String(winnerPayout),
      deadline: new Date(data.deadline),
      status: data.escrowTxHash ? BountyStatus.OPEN : BountyStatus.DRAFT,
      criteria: data.criteria,
      escrowTxHash: data.escrowTxHash,
      escrowStatus: data.escrowTxHash ? EscrowStatus.PENDING : EscrowStatus.PENDING,
      source: 'manual',
    })
    .returning();

  return c.json(bounty, 201);
});

// ─────────────────────────────────────────────────────────────────
// PUT /bounties/:id - Update bounty (owner only, limited fields)
// ─────────────────────────────────────────────────────────────────

const updateBountySchema = z.object({
  escrowTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  status: z.enum(['open']).optional(), // Can only activate, not deactivate
});

bountiesRouter.put('/:id', authMiddleware, zValidator('json', updateBountySchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const updates = c.req.valid('json');

  // Get bounty
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, id))
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Check ownership
  if (bounty.posterWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
    throw new ApiError(403, 'Not authorized to update this bounty', 'FORBIDDEN');
  }

  // Only allow updates in draft status
  if (bounty.status !== BountyStatus.DRAFT && !updates.escrowTxHash) {
    throw new ApiError(400, 'Can only update bounties in draft status', 'INVALID_STATUS');
  }

  // Build update object
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (updates.escrowTxHash) {
    updateData.escrowTxHash = updates.escrowTxHash;
    updateData.escrowStatus = EscrowStatus.PENDING;
    updateData.status = BountyStatus.OPEN;
  }

  const [updated] = await db
    .update(bounties)
    .set(updateData)
    .where(eq(bounties.id, id))
    .returning();

  return c.json(updated);
});

// ─────────────────────────────────────────────────────────────────
// DELETE /bounties/:id - Cancel bounty (owner only, no submissions)
// ─────────────────────────────────────────────────────────────────

bountiesRouter.delete('/:id', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Get bounty
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, id))
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Check ownership
  if (bounty.posterWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
    throw new ApiError(403, 'Not authorized to cancel this bounty', 'FORBIDDEN');
  }

  // Check if cancellable
  if (bounty.status !== BountyStatus.DRAFT && bounty.status !== BountyStatus.OPEN) {
    throw new ApiError(400, 'Cannot cancel bounty in current status', 'INVALID_STATUS');
  }

  // Check for submissions
  if (bounty.submissionCount > 0) {
    throw new ApiError(400, 'Cannot cancel bounty with submissions', 'HAS_SUBMISSIONS');
  }

  // Cancel bounty
  const [cancelled] = await db
    .update(bounties)
    .set({
      status: BountyStatus.CANCELLED,
      updatedAt: new Date(),
    })
    .where(eq(bounties.id, id))
    .returning();

  return c.json({
    ...cancelled,
    message: 'Bounty cancelled. If escrow was funded, initiate refund on-chain.',
  });
});

// ─────────────────────────────────────────────────────────────────
// POST /bounties/:id/refund - Request refund (after deadline)
// ─────────────────────────────────────────────────────────────────

bountiesRouter.post('/:id/refund', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Get bounty
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, id))
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Check ownership
  if (bounty.posterWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
    throw new ApiError(403, 'Not authorized to request refund', 'FORBIDDEN');
  }

  // Check deadline passed
  const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours
  if (new Date(bounty.deadline).getTime() + gracePeriod > Date.now()) {
    throw new ApiError(400, 'Deadline + grace period not yet passed', 'DEADLINE_NOT_PASSED');
  }

  // Check no winner
  if (bounty.winningSubmissionId) {
    throw new ApiError(400, 'Bounty has a winner, cannot refund', 'HAS_WINNER');
  }

  // Mark as expired
  const [updated] = await db
    .update(bounties)
    .set({
      status: BountyStatus.EXPIRED,
      escrowStatus: EscrowStatus.REFUNDED,
      updatedAt: new Date(),
    })
    .where(eq(bounties.id, id))
    .returning();

  return c.json({
    ...updated,
    message: 'Bounty marked for refund. Call escrow contract refund() function.',
  });
});

// ─────────────────────────────────────────────────────────────────
// GET /bounties/:id/submissions - List submissions for bounty
// ─────────────────────────────────────────────────────────────────

bountiesRouter.get('/:id/submissions', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const auth = c.get('auth');

  // Get bounty
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, id))
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Get submissions (hide payload for non-owners)
  const allSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.bountyId, id))
    .orderBy(asc(submissions.timestamp));

  // Filter sensitive data unless owner or the submitting agent
  const filtered = allSubmissions.map((sub) => {
    const isOwner = auth?.walletAddress?.toLowerCase() === bounty.posterWallet.toLowerCase();
    const isSubmitter = auth?.agentId === sub.agentId;
    
    if (isOwner || isSubmitter || sub.status === 'passed') {
      return sub;
    }
    
    // Hide payload for others
    return {
      ...sub,
      payload: { type: sub.payload.type, hidden: true },
      signature: '***',
    };
  });

  return c.json({
    bountyId: id,
    total: filtered.length,
    submissions: filtered,
  });
});
