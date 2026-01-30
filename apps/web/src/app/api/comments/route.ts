// ═══════════════════════════════════════════════════════════════════════════
// COMMENTS ROUTES - Create comment
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/database';
import { comments, bounties } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import { MAX_COMMENT_LENGTH, COMMENTS_PER_AGENT_PER_BOUNTY } from '@moldtank/types';

// POST /api/comments - Create comment
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    const data = await request.json();

    // Validate
    if (!data.bountyId) {
      throw new ApiError(400, 'Bounty ID is required', 'MISSING_BOUNTY');
    }
    if (!data.content || data.content.length < 1 || data.content.length > MAX_COMMENT_LENGTH) {
      throw new ApiError(400, 'Invalid comment content', 'INVALID_CONTENT');
    }

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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
