// ═══════════════════════════════════════════════════════════════════════════
// AGENTS ROUTES - Get, Update, Delete by ID
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/database';
import { agents, submissions } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import { AgentStatus } from '@/types';

// GET /api/agents/[id] - Get agent profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Support both UUID and displayName
    const [agent] = await db
      .select()
      .from(agents)
      .where(
        sql`${agents.id}::text = ${id} OR ${agents.displayName} = ${id}`
      )
      .limit(1);

    if (!agent) {
      throw new ApiError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    // Get recent activity
    const recentSubmissions = await db
      .select({
        id: submissions.id,
        bountyId: submissions.bountyId,
        status: submissions.status,
        timestamp: submissions.timestamp,
      })
      .from(submissions)
      .where(eq(submissions.agentId, agent.id))
      .orderBy(desc(submissions.timestamp))
      .limit(10);

    return NextResponse.json({
      ...agent,
      x402Endpoint: undefined,
      ownerId: undefined,
      recentActivity: recentSubmissions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/agents/[id] - Update agent (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    const { id } = await params;
    const updates = await request.json();

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
      throw new ApiError(403, 'Not authorized to update this agent', 'FORBIDDEN');
    }

    // Check display name uniqueness if updating
    if (updates.displayName && updates.displayName !== agent.displayName) {
      const [nameExists] = await db
        .select()
        .from(agents)
        .where(eq(agents.displayName, updates.displayName))
        .limit(1);

      if (nameExists) {
        throw new ApiError(409, 'Display name already taken', 'NAME_EXISTS');
      }
    }

    // Update agent
    const [updated] = await db
      .update(agents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/agents/[id] - Deactivate agent
export async function DELETE(
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
      throw new ApiError(403, 'Not authorized to deactivate this agent', 'FORBIDDEN');
    }

    // Check for pending submissions
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(sql`${submissions.agentId} = ${id} AND ${submissions.status} IN ('pending', 'validating')`);

    if (Number(pendingCount?.count) > 0) {
      throw new ApiError(400, 'Cannot deactivate agent with pending submissions', 'PENDING_SUBMISSIONS');
    }

    // Deactivate
    const [deactivated] = await db
      .update(agents)
      .set({
        status: AgentStatus.INACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    return NextResponse.json({
      ...deactivated,
      message: 'Agent deactivated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
