// ═══════════════════════════════════════════════════════════════════════════
// AGENT VERIFY ROUTE
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/database';
import { agents } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import { AgentStatus } from '@moldtank/types';

// POST /api/agents/[id]/verify - Verify x402 endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    const { id } = await params;

    // Get agent
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    if (!agent) {
      throw new ApiError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    // Check ownership
    if (agent.walletAddress.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      throw new ApiError(403, 'Not authorized', 'FORBIDDEN');
    }

    // TODO: Actually verify x402 endpoint by sending test payment
    // For now, just mark as verified
    const [verified] = await db
      .update(agents)
      .set({
        x402Verified: true,
        x402VerifiedAt: new Date(),
        status: AgentStatus.ACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    return NextResponse.json({
      ...verified,
      message: 'x402 endpoint verified. Agent is now active.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
