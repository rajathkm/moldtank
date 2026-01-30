// ═══════════════════════════════════════════════════════════════════════════
// AGENTS ROUTES - List and Register
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/database';
import { agents } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import {
  AgentStatus,
  MIN_AGENT_NAME_LENGTH,
  MAX_AGENT_NAME_LENGTH,
} from '@/types';

// GET /api/agents - List agents (leaderboard)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const sortBy = (searchParams.get('sortBy') || 'totalEarnings') as 'totalEarnings' | 'bountiesWon' | 'winRate';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const offset = (page - 1) * limit;

    const orderBy = sortBy === 'bountiesWon'
      ? desc(agents.bountiesWon)
      : sortBy === 'winRate'
      ? desc(agents.winRate)
      : desc(agents.totalEarnings);

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: agents.id,
          displayName: agents.displayName,
          capabilities: agents.capabilities,
          status: agents.status,
          bountiesAttempted: agents.bountiesAttempted,
          bountiesWon: agents.bountiesWon,
          winRate: agents.winRate,
          totalEarnings: agents.totalEarnings,
          createdAt: agents.createdAt,
        })
        .from(agents)
        .where(eq(agents.status, AgentStatus.ACTIVE))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(agents)
        .where(eq(agents.status, AgentStatus.ACTIVE)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/agents - Register new agent
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    const data = await request.json();

    // Validate
    if (!data.displayName || 
        data.displayName.length < MIN_AGENT_NAME_LENGTH || 
        data.displayName.length > MAX_AGENT_NAME_LENGTH ||
        !/^[a-zA-Z0-9_-]+$/.test(data.displayName)) {
      throw new ApiError(400, 'Invalid display name (alphanumeric, underscore, hyphen only)', 'INVALID_NAME');
    }

    if (!data.x402Endpoint || !data.x402Endpoint.startsWith('http')) {
      throw new ApiError(400, 'Invalid x402 endpoint URL', 'INVALID_ENDPOINT');
    }

    if (!data.capabilities || !Array.isArray(data.capabilities) || data.capabilities.length === 0) {
      throw new ApiError(400, 'At least one capability required', 'INVALID_CAPABILITIES');
    }

    // Check if wallet already has an agent
    const [existing] = await db
      .select()
      .from(agents)
      .where(eq(agents.walletAddress, auth.walletAddress))
      .limit(1);

    if (existing) {
      throw new ApiError(409, 'Wallet already has a registered agent', 'AGENT_EXISTS');
    }

    // Check display name uniqueness
    const [nameExists] = await db
      .select()
      .from(agents)
      .where(eq(agents.displayName, data.displayName))
      .limit(1);

    if (nameExists) {
      throw new ApiError(409, 'Display name already taken', 'NAME_EXISTS');
    }

    // Create agent
    const [agent] = await db
      .insert(agents)
      .values({
        displayName: data.displayName,
        walletAddress: auth.walletAddress,
        x402Endpoint: data.x402Endpoint,
        capabilities: data.capabilities,
        status: AgentStatus.PENDING,
      })
      .returning();

    return NextResponse.json({
      ...agent,
      message: 'Agent registered. Awaiting x402 verification.',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
