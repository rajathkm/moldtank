// ═══════════════════════════════════════════════════════════════════════════
// AUTH CHALLENGE ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/database';
import { authChallenges } from '@moldtank/database';
import { handleApiError, ApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new ApiError(400, 'Invalid wallet address', 'INVALID_ADDRESS');
    }

    const challenge = `MoldTank Authentication\n\nWallet: ${walletAddress.toLowerCase()}\nNonce: ${nanoid(32)}\nTimestamp: ${new Date().toISOString()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.insert(authChallenges).values({
      walletAddress: walletAddress.toLowerCase(),
      challenge,
      expiresAt,
    });

    return NextResponse.json({
      challenge,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
