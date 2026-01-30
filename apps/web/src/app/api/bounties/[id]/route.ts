// ═══════════════════════════════════════════════════════════════════════════
// BOUNTIES ROUTES - Get, Update, Delete by ID
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, or, sql } from 'drizzle-orm';
import { db } from '@/lib/database';
import { bounties, submissions } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import { BountyStatus, EscrowStatus } from '@moldtank/types';

// GET /api/bounties/[id] - Get bounty details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    return NextResponse.json({
      ...bounty,
      submissionStats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/bounties/[id] - Update bounty
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    const { id } = await params;
    const updates = await request.json();

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

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/bounties/[id] - Cancel bounty
export async function DELETE(
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

    return NextResponse.json({
      ...cancelled,
      message: 'Bounty cancelled. If escrow was funded, initiate refund on-chain.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
