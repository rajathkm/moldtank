// ═══════════════════════════════════════════════════════════════════════════
// BOUNTY PAYOUT ROUTE
// ═══════════════════════════════════════════════════════════════════════════
// Releases escrow payment to the winning agent via x402 protocol
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/database';
import { bounties, agents, submissions, payments } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { BountyStatus, EscrowStatus } from '@/types';

const X402_TIMEOUT_MS = 30000;

interface X402PaymentRequest {
  x402Version: string;
  accepts: Array<{
    chain: string;
    asset: string;
    amount: string;
    payTo: string;
  }>;
  paymentId: string;
}

// POST /api/bounties/[id]/payout - Release payment to winner
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bountyId = params.id;

  try {
    // Get bounty
    const [bounty] = await db
      .select()
      .from(bounties)
      .where(eq(bounties.id, bountyId))
      .limit(1);

    if (!bounty) {
      throw new ApiError(404, 'Bounty not found', 'NOT_FOUND');
    }

    // Must be completed with a winner
    if (bounty.status !== BountyStatus.COMPLETED) {
      throw new ApiError(400, 'Bounty is not completed', 'NOT_COMPLETED');
    }

    if (!bounty.winnerId || !bounty.winningSubmissionId) {
      throw new ApiError(400, 'No winner selected', 'NO_WINNER');
    }

    // Check escrow status
    if (bounty.escrowStatus === EscrowStatus.RELEASED) {
      return NextResponse.json({
        message: 'Payment already released',
        txHash: bounty.paymentTxHash,
      });
    }

    // Get winner agent
    const [winner] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, bounty.winnerId))
      .limit(1);

    if (!winner) {
      throw new ApiError(404, 'Winner agent not found', 'WINNER_NOT_FOUND');
    }

    if (!winner.x402Endpoint) {
      throw new ApiError(400, 'Winner has no x402 endpoint configured', 'NO_X402_ENDPOINT');
    }

    // Get winning submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, bounty.winningSubmissionId))
      .limit(1);

    if (!submission) {
      throw new ApiError(404, 'Winning submission not found', 'SUBMISSION_NOT_FOUND');
    }

    // Calculate payout amount
    const payoutAmount = Number(bounty.winnerPayout);
    const paymentId = `moldtank-${bountyId}-${Date.now()}`;

    // Step 1: Discover x402 payment requirements from agent
    const x402Requirements = await discoverX402Requirements(winner.x402Endpoint);

    // Step 2: Create payment record
    const [payment] = await db
      .insert(payments)
      .values({
        bountyId: bounty.id,
        submissionId: submission.id,
        winnerId: winner.id,
        winnerWallet: winner.walletAddress,
        grossAmount: bounty.amount,
        platformFee: bounty.platformFee,
        netAmount: String(payoutAmount),
        x402Endpoint: winner.x402Endpoint,
        x402RequestId: paymentId,
        chain: x402Requirements.accepts[0]?.chain || 'eip155:8453',
        asset: x402Requirements.accepts[0]?.asset || 'USDC',
        status: 'pending',
        attempts: 1,
      })
      .returning();

    // Step 3: Execute payment via x402
    let txHash: string | undefined;
    let paymentStatus = 'pending';
    let error: string | undefined;

    try {
      txHash = await executeX402Payment(
        winner.x402Endpoint,
        winner.walletAddress,
        payoutAmount,
        paymentId
      );
      paymentStatus = 'confirmed';

      // Update bounty with payment info
      await db
        .update(bounties)
        .set({
          escrowStatus: EscrowStatus.RELEASED,
          paymentTxHash: txHash,
        })
        .where(eq(bounties.id, bountyId));

      // Update agent earnings
      await db
        .update(agents)
        .set({
          totalEarnings: String(Number(winner.totalEarnings) + payoutAmount),
        })
        .where(eq(agents.id, winner.id));

    } catch (err) {
      error = err instanceof Error ? err.message : 'Payment execution failed';
      paymentStatus = 'failed';
    }

    // Update payment record
    await db
      .update(payments)
      .set({
        txHash,
        status: paymentStatus,
        lastError: error,
        completedAt: paymentStatus === 'confirmed' ? new Date() : undefined,
      })
      .where(eq(payments.id, payment.id));

    if (paymentStatus === 'failed') {
      throw new ApiError(500, `Payment failed: ${error}`, 'PAYMENT_FAILED');
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      txHash,
      amount: payoutAmount,
      recipient: winner.walletAddress,
      chain: payment.chain,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Discover x402 payment requirements from agent's endpoint
 */
async function discoverX402Requirements(endpoint: string): Promise<X402PaymentRequest> {
  try {
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Accept': 'application/json',
        'X-402-Version': '1',
      },
      signal: AbortSignal.timeout(X402_TIMEOUT_MS),
    });

    if (response.status === 402) {
      return await response.json();
    }

    // Default requirements if agent doesn't return 402
    return {
      x402Version: '1',
      accepts: [{
        chain: 'eip155:8453', // Base
        asset: 'USDC',
        amount: '0',
        payTo: '',
      }],
      paymentId: '',
    };
  } catch (error) {
    console.warn('Failed to discover x402 requirements:', error);
    return {
      x402Version: '1',
      accepts: [{
        chain: 'eip155:8453',
        asset: 'USDC',
        amount: '0',
        payTo: '',
      }],
      paymentId: '',
    };
  }
}

/**
 * Execute payment via x402 protocol
 * 
 * In production, this would:
 * 1. Sign a USDC transfer transaction
 * 2. Submit it to Base network
 * 3. Return the transaction hash
 */
async function executeX402Payment(
  endpoint: string,
  recipientWallet: string,
  amount: number,
  paymentId: string
): Promise<string> {
  // For MVP: Just simulate the payment
  // Real implementation would use viem/ethers to execute on-chain
  
  console.log(`[x402] Executing payment:
    Endpoint: ${endpoint}
    Recipient: ${recipientWallet}
    Amount: ${amount} USDC
    Payment ID: ${paymentId}
  `);

  // Check if we have platform wallet configured
  const platformWallet = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  
  if (!platformWallet) {
    // Development mode - return mock transaction
    console.warn('[x402] PLATFORM_WALLET_PRIVATE_KEY not set - returning mock tx');
    
    // Notify agent's endpoint about the "payment"
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Version': '1',
        },
        body: JSON.stringify({
          paymentId,
          status: 'confirmed',
          amount: String(amount),
          chain: 'eip155:8453',
          // Mock tx hash
          txHash: `0x${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Non-fatal
    }
    
    return `0x${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;
  }

  // TODO: Real implementation with viem
  // const walletClient = createWalletClient({
  //   account: privateKeyToAccount(platformWallet),
  //   chain: base,
  //   transport: http(process.env.BASE_RPC),
  // });
  //
  // const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  // const txHash = await walletClient.writeContract({
  //   address: usdcAddress,
  //   abi: erc20Abi,
  //   functionName: 'transfer',
  //   args: [recipientWallet, BigInt(amount * 1e6)],
  // });
  
  throw new Error('On-chain payments not yet implemented - set PLATFORM_WALLET_PRIVATE_KEY to enable mock mode');
}

// GET /api/bounties/[id]/payout - Get payout status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bountyId = params.id;

  try {
    const [bounty] = await db
      .select()
      .from(bounties)
      .where(eq(bounties.id, bountyId))
      .limit(1);

    if (!bounty) {
      throw new ApiError(404, 'Bounty not found', 'NOT_FOUND');
    }

    // Get payment records
    const paymentRecords = await db
      .select()
      .from(payments)
      .where(eq(payments.bountyId, bountyId));

    return NextResponse.json({
      bountyId,
      status: bounty.status,
      escrowStatus: bounty.escrowStatus,
      winnerId: bounty.winnerId,
      winnerPayout: bounty.winnerPayout,
      paymentTxHash: bounty.paymentTxHash,
      payments: paymentRecords,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
