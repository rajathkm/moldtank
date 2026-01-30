// ═══════════════════════════════════════════════════════════════════════════
// COMMENTS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql, asc, isNull } from 'drizzle-orm';

import { db } from '../index';
import { comments, bounties, agents } from '@moldtank/database';
import { ApiError } from '../middleware/error';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { MAX_COMMENT_LENGTH, COMMENTS_PER_AGENT_PER_BOUNTY } from '@moldtank/types';

export const commentsRouter = new Hono();

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

const createCommentSchema = z.object({
  bountyId: z.string().uuid(),
  content: z.string().min(1).max(MAX_COMMENT_LENGTH),
  parentId: z.string().uuid().optional(),
});

// ─────────────────────────────────────────────────────────────────
// GET /comments/bounty/:bountyId - Get comments for bounty
// ─────────────────────────────────────────────────────────────────

commentsRouter.get('/bounty/:bountyId', async (c) => {
  const bountyId = c.req.param('bountyId');

  // Check bounty exists
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, bountyId))
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Get all visible comments
  const allComments = await db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.bountyId, bountyId),
        eq(comments.status, 'visible')
      )
    )
    .orderBy(asc(comments.createdAt));

  // Build threaded structure
  const rootComments = allComments.filter(c => !c.parentId);
  const replies = allComments.filter(c => c.parentId);

  const threaded = rootComments.map(root => ({
    ...root,
    replies: replies.filter(r => r.parentId === root.id),
  }));

  return c.json({
    bountyId,
    total: allComments.length,
    comments: threaded,
  });
});

// ─────────────────────────────────────────────────────────────────
// POST /comments - Create comment
// ─────────────────────────────────────────────────────────────────

commentsRouter.post('/', authMiddleware, zValidator('json', createCommentSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  // Check bounty exists
  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, data.bountyId))
    .limit(1);

  if (!bounty) {
    throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
  }

  // Check rate limit for agents
  if (auth.agentId) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(
        and(
          eq(comments.bountyId, data.bountyId),
          eq(comments.authorId, auth.agentId)
        )
      );

    if (Number(countResult?.count) >= COMMENTS_PER_AGENT_PER_BOUNTY) {
      throw new ApiError(429, `Maximum ${COMMENTS_PER_AGENT_PER_BOUNTY} comments per bounty`, 'RATE_LIMITED');
    }
  }

  // Validate parent comment if provided
  if (data.parentId) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.id, data.parentId),
          eq(comments.bountyId, data.bountyId)
        )
      )
      .limit(1);

    if (!parent) {
      throw new ApiError(404, 'Parent comment not found', 'PARENT_NOT_FOUND');
    }
  }

  // Determine author type
  const isPoster = bounty.posterWallet.toLowerCase() === auth.walletAddress.toLowerCase();
  const authorType = isPoster ? 'poster' : auth.agentId ? 'agent' : 'poster';
  const authorId = auth.agentId || auth.walletAddress;

  // Create comment
  const [comment] = await db
    .insert(comments)
    .values({
      bountyId: data.bountyId,
      authorId,
      authorType,
      content: data.content,
      parentId: data.parentId,
    })
    .returning();

  // Update bounty comment count
  await db
    .update(bounties)
    .set({
      commentCount: sql`${bounties.commentCount} + 1`,
    })
    .where(eq(bounties.id, data.bountyId));

  return c.json(comment, 201);
});

// ─────────────────────────────────────────────────────────────────
// DELETE /comments/:id - Delete comment (author only)
// ─────────────────────────────────────────────────────────────────

commentsRouter.delete('/:id', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Get comment
  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);

  if (!comment) {
    throw new ApiError(404, 'Comment not found', 'COMMENT_NOT_FOUND');
  }

  // Check authorization
  const isAuthor = comment.authorId === auth.agentId || 
                   comment.authorId === auth.walletAddress;

  if (!isAuthor) {
    throw new ApiError(403, 'Not authorized to delete this comment', 'FORBIDDEN');
  }

  // Soft delete
  const [deleted] = await db
    .update(comments)
    .set({
      status: 'deleted',
      content: '[deleted]',
      updatedAt: new Date(),
    })
    .where(eq(comments.id, id))
    .returning();

  return c.json({ message: 'Comment deleted', id: deleted.id });
});
