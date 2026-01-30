// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - x402 PAYMENT PROVIDER
// ═══════════════════════════════════════════════════════════════════════════
// Implements HTTP 402 Payment Required protocol for agent payouts
// https://www.x402.org/
// ═══════════════════════════════════════════════════════════════════════════

import type { CurrencyType } from '@moldtank/database';
import type {
  PaymentProvider,
  PaymentResult,
  EscrowResult,
  TransactionReference,
  PaymentProviderConfig,
} from './interface';

const DEFAULT_CHAIN = 'eip155:8453'; // Base mainnet
const DEFAULT_ASSET = 'USDC';
const X402_VERSION = '1';

/**
 * x402 Payment Request structure
 * Sent to agent's x402 endpoint
 */
export interface X402PaymentRequest {
  /** Protocol version */
  x402Version: string;
  /** Payment details */
  accepts: X402PaymentOption[];
  /** Human-readable description */
  description?: string;
  /** Unique payment ID for tracking */
  paymentId: string;
  /** Callback URL for payment confirmation */
  callbackUrl?: string;
}

export interface X402PaymentOption {
  /** Chain in CAIP-2 format (e.g., "eip155:8453") */
  chain: string;
  /** Token symbol */
  asset: string;
  /** Amount in smallest unit (e.g., USDC has 6 decimals) */
  amount: string;
  /** Recipient address */
  payTo: string;
  /** Extra data for the transaction */
  extra?: Record<string, unknown>;
}

/**
 * x402 Payment Response from agent
 */
export interface X402PaymentResponse {
  /** Transaction hash if paid on-chain */
  txHash?: string;
  /** Chain where payment was made */
  chain?: string;
  /** Payment status */
  status: 'pending' | 'confirmed' | 'failed';
  /** Error message if failed */
  error?: string;
}

/**
 * x402 Provider - Pays agents via HTTP 402 protocol
 * 
 * Flow:
 * 1. Agent registers with x402 endpoint URL
 * 2. When agent wins, we POST payment request to their endpoint
 * 3. Agent's endpoint returns 402 with payment instructions
 * 4. We execute the payment on-chain
 * 5. Agent receives USDC directly to their wallet
 */
export class X402Provider implements PaymentProvider {
  readonly type: CurrencyType = 'usdc';
  
  private chain: string;
  private asset: string;
  private platformWallet?: string;
  private rpcUrl?: string;

  constructor(config?: Partial<X402ProviderConfig>) {
    this.chain = config?.chain || DEFAULT_CHAIN;
    this.asset = config?.asset || DEFAULT_ASSET;
    this.platformWallet = config?.platformWallet || process.env.PLATFORM_WALLET_ADDRESS;
    this.rpcUrl = config?.rpcUrl || process.env.BASE_RPC;
  }

  /**
   * Get platform's USDC balance (for escrow)
   */
  async getBalance(_userId: string): Promise<number> {
    // For x402, we track escrow in our database, not on-chain per-user
    // This would query the escrow contract balance
    throw new Error('Use escrow balance tracking for x402');
  }

  async canAfford(_userId: string, _amount: number): Promise<boolean> {
    // Check if platform has enough USDC to pay out
    // This checks the escrow contract balance
    return true; // Escrow already locked funds
  }

  async debit(
    _userId: string,
    _amount: number,
    _reference: TransactionReference
  ): Promise<PaymentResult> {
    throw new Error('Use escrow() for x402 payments');
  }

  async credit(
    _userId: string,
    _amount: number,
    _reference: TransactionReference
  ): Promise<PaymentResult> {
    throw new Error('Use releaseEscrow() for x402 payments');
  }

  /**
   * Lock funds in escrow (on-chain or credits)
   */
  async escrow(
    userId: string,
    amount: number,
    bountyId: string
  ): Promise<EscrowResult> {
    // For now, just record the escrow in database
    // Real implementation would:
    // 1. User approves USDC spending
    // 2. Call escrow contract to lock funds
    console.log(`[x402] Escrow ${amount} USDC for bounty ${bountyId} from user ${userId}`);
    
    return {
      success: true,
      escrowId: bountyId,
      // txHash would come from on-chain transaction
    };
  }

  /**
   * Release escrow to winner via x402 protocol
   */
  async releaseEscrow(bountyId: string, winnerId: string): Promise<EscrowResult> {
    // 1. Get agent's x402 endpoint from database
    // 2. Send payment request
    // 3. Execute on-chain payment
    // 4. Return result
    
    console.log(`[x402] Release escrow for bounty ${bountyId} to winner ${winnerId}`);
    
    // This would be the actual implementation:
    // const agent = await db.query.agents.findFirst({ where: eq(agents.id, winnerId) });
    // const paymentResult = await this.payViaX402(agent.x402Endpoint, amount);
    
    return {
      success: true,
      escrowId: bountyId,
    };
  }

  /**
   * Refund escrow back to poster
   */
  async refundEscrow(bountyId: string): Promise<EscrowResult> {
    console.log(`[x402] Refund escrow for bounty ${bountyId}`);
    
    return {
      success: true,
      escrowId: bountyId,
    };
  }

  /**
   * Pay an agent via their x402 endpoint
   */
  async payViaX402(
    endpoint: string,
    amount: number,
    payTo: string,
    paymentId: string,
    description?: string
  ): Promise<X402PaymentResponse> {
    // Step 1: Discover payment requirements
    const paymentRequest = await this.discoverPaymentRequirements(endpoint);
    
    // Step 2: Verify the payment details match what we expect
    const acceptedOption = paymentRequest.accepts.find(
      opt => opt.chain === this.chain && opt.asset === this.asset
    );
    
    if (!acceptedOption) {
      throw new Error(`Agent doesn't accept ${this.asset} on ${this.chain}`);
    }
    
    // Step 3: Execute the on-chain payment
    const txHash = await this.executeOnChainPayment(
      payTo,
      amount,
      acceptedOption.extra
    );
    
    // Step 4: Notify the agent's endpoint that payment was made
    await this.notifyPaymentComplete(endpoint, paymentId, txHash);
    
    return {
      txHash,
      chain: this.chain,
      status: 'confirmed',
    };
  }

  /**
   * Discover payment requirements from agent's x402 endpoint
   */
  private async discoverPaymentRequirements(endpoint: string): Promise<X402PaymentRequest> {
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Accept': 'application/json',
        'X-402-Version': X402_VERSION,
      },
    });

    if (response.status === 402) {
      // Agent returned payment requirements
      const data = await response.json();
      return data as X402PaymentRequest;
    }

    // Fallback: construct default payment request
    return {
      x402Version: X402_VERSION,
      accepts: [{
        chain: this.chain,
        asset: this.asset,
        amount: '0', // Will be set by caller
        payTo: '', // Will be set from agent's wallet
      }],
      paymentId: crypto.randomUUID(),
    };
  }

  /**
   * Execute on-chain USDC transfer
   */
  private async executeOnChainPayment(
    to: string,
    amount: number,
    _extra?: Record<string, unknown>
  ): Promise<string> {
    // TODO: Use viem or ethers to execute the transfer
    // This is a placeholder - real implementation would:
    // 1. Create wallet client with platform's private key
    // 2. Call USDC contract's transfer function
    // 3. Wait for confirmation
    // 4. Return tx hash
    
    console.log(`[x402] Executing on-chain payment: ${amount} USDC to ${to}`);
    
    // Placeholder - return mock tx hash
    return `0x${crypto.randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Notify agent that payment was completed
   */
  private async notifyPaymentComplete(
    endpoint: string,
    paymentId: string,
    txHash: string
  ): Promise<void> {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Version': X402_VERSION,
        },
        body: JSON.stringify({
          paymentId,
          txHash,
          chain: this.chain,
          status: 'confirmed',
        }),
      });
    } catch (error) {
      // Non-fatal - payment already complete
      console.warn('[x402] Failed to notify agent of payment:', error);
    }
  }

  /**
   * Verify agent's x402 endpoint is valid
   */
  async verifyEndpoint(endpoint: string): Promise<{
    valid: boolean;
    accepts?: X402PaymentOption[];
    error?: string;
  }> {
    try {
      const url = new URL(endpoint);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Invalid protocol' };
      }

      const response = await fetch(endpoint, {
        method: 'OPTIONS',
        headers: {
          'Accept': 'application/json',
          'X-402-Version': X402_VERSION,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 402 || response.status === 200) {
        const data = await response.json().catch(() => ({}));
        return {
          valid: true,
          accepts: data.accepts || [],
        };
      }

      return {
        valid: false,
        error: `Endpoint returned ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export interface X402ProviderConfig extends PaymentProviderConfig {
  chain?: string;
  asset?: string;
  platformWallet?: string;
  rpcUrl?: string;
}

/**
 * Create an x402 payment provider instance
 */
export function createX402Provider(
  config?: Partial<X402ProviderConfig>
): X402Provider {
  return new X402Provider(config);
}
