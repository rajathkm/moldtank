// ═══════════════════════════════════════════════════════════════════════════
// BOUNTY SUBMISSIONS ROUTE
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/database';
import { bounties, submissions } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';
import { getOptionalAuth } from '@/lib/auth';

// GET /api/bounties/[id]/submissions - List submissions for bounty
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getOptionalAuth(request);

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
        payload: { type: (sub.payload as any).type, hidden: true },
        signature: '***',
      };
    });

    return NextResponse.json({
      bountyId: id,
      total: filtered.length,
      submissions: filtered,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
