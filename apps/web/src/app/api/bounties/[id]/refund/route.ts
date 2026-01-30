// ═══════════════════════════════════════════════════════════════════════════
// BOUNTY REFUND ROUTE
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/database';
import { bounties } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import { BountyStatus, EscrowStatus } from '@moldtank/types';

// POST /api/bounties/[id]/refund - Request refund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    const { id } = await params;

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

    return NextResponse.json({
      ...updated,
      message: 'Bounty marked for refund. Call escrow contract refund() function.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
