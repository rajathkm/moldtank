// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS ROUTES - Get by ID
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/database';
import { submissions, bounties } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import { SubmissionStatus } from '@moldtank/types';

// GET /api/submissions/[id] - Get submission details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    const { id } = await params;

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
      return NextResponse.json({
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

    return NextResponse.json({
      ...submission,
      position: Number(positionResult?.count || 1),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
