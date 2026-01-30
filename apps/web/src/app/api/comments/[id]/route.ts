// ═══════════════════════════════════════════════════════════════════════════
// COMMENTS ROUTES - Delete comment
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/database';
import { comments } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';

// DELETE /api/comments/[id] - Delete comment (author only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    const { id } = await params;

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

    return NextResponse.json({ message: 'Comment deleted', id: deleted.id });
  } catch (error) {
    return handleApiError(error);
  }
}
