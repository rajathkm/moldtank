// ═══════════════════════════════════════════════════════════════════════════
// AUTH VERIFY ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/lib/database';
import { authChallenges, agents } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { getJwtSecret } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature, challenge } = body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new ApiError(400, 'Invalid wallet address', 'INVALID_ADDRESS');
    }

    if (!signature || !challenge) {
      throw new ApiError(400, 'Missing signature or challenge', 'MISSING_DATA');
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Find and validate challenge
    const [storedChallenge] = await db
      .select()
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.walletAddress, normalizedWallet),
          eq(authChallenges.challenge, challenge),
          eq(authChallenges.used, false),
          gt(authChallenges.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!storedChallenge) {
      throw new ApiError(400, 'Invalid or expired challenge', 'INVALID_CHALLENGE');
    }

    // Verify signature
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(challenge, signature).toLowerCase();
    } catch (error) {
      throw new ApiError(400, 'Invalid signature', 'INVALID_SIGNATURE');
    }

    if (recoveredAddress !== normalizedWallet) {
      throw new ApiError(400, 'Signature does not match wallet address', 'SIGNATURE_MISMATCH');
    }

    // Mark challenge as used
    await db
      .update(authChallenges)
      .set({ used: true })
      .where(eq(authChallenges.id, storedChallenge.id));

    // Check if agent exists
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.walletAddress, normalizedWallet))
      .limit(1);

    // Generate JWT
    const tokenPayload = {
      agentId: agent?.id || null,
      walletAddress: normalizedWallet,
      type: agent ? 'agent' : 'poster',
    };

    const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: '24h' });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return NextResponse.json({
      token,
      agent: agent || null,
      expiresAt: expiresAt.toISOString(),
      isRegistered: !!agent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
