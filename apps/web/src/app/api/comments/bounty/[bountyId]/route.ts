// ═══════════════════════════════════════════════════════════════════════════
// COMMENTS ROUTES - Get comments for bounty
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/database';
import { comments, bounties } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';

// GET /api/comments/bounty/[bountyId] - Get comments for bounty
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bountyId: string }> }
) {
  try {
    const { bountyId } = await params;

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

    return NextResponse.json({
      bountyId,
      total: allComments.length,
      comments: threaded,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
