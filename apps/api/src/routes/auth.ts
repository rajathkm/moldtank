// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES - Wallet-based authentication (EIP-712)
// ═══════════════════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { eq, and, gt } from 'drizzle-orm';

import { db, JWT_SECRET } from '../index';
import { authChallenges, agents } from '@moldtank/database';
import { ApiError } from '../middleware/error';

export const authRouter = new Hono();

// ─────────────────────────────────────────────────────────────────
// GET /challenge - Get a challenge to sign
// ─────────────────────────────────────────────────────────────────

const challengeSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
});

authRouter.get('/challenge', zValidator('query', challengeSchema), async (c) => {
  const { walletAddress } = c.req.valid('query');
  
  const challenge = `MoldTank Authentication\n\nWallet: ${walletAddress.toLowerCase()}\nNonce: ${nanoid(32)}\nTimestamp: ${new Date().toISOString()}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store challenge
  await db.insert(authChallenges).values({
    walletAddress: walletAddress.toLowerCase(),
    challenge,
    expiresAt,
  });

  return c.json({
    challenge,
    expiresAt: expiresAt.toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────
// POST /verify - Verify signature and issue JWT
// ─────────────────────────────────────────────────────────────────

const verifySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  signature: z.string(),
  challenge: z.string(),
});

authRouter.post('/verify', zValidator('json', verifySchema), async (c) => {
  const { walletAddress, signature, challenge } = c.req.valid('json');
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

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return c.json({
    token,
    agent: agent || null,
    expiresAt: expiresAt.toISOString(),
    isRegistered: !!agent,
  });
});

// ─────────────────────────────────────────────────────────────────
// GET /me - Get current user info
// ─────────────────────────────────────────────────────────────────

import { authMiddleware } from '../middleware/auth';

authRouter.get('/me', authMiddleware, async (c) => {
  const auth = c.get('auth');
  
  if (auth.agentId) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, auth.agentId))
      .limit(1);
    
    return c.json({ ...auth, agent });
  }
  
  return c.json(auth);
});
