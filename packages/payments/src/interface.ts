// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - PAYMENT PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════
// Defines the contract for all payment providers (credits, Stripe, crypto)
// ═══════════════════════════════════════════════════════════════════════════

import type { Transaction, CurrencyType } from '@moldtank/database';

/**
 * Reference to an entity that triggered a transaction
 */
export interface TransactionReference {
  /** Type of entity (e.g., 'bounty', 'submission', 'deposit') */
  type: string;
  /** UUID of the referenced entity */
  id: string;
}

/**
 * Result of a balance check or transaction operation
 */
export interface PaymentResult {
  success: boolean;
  transaction?: Transaction;
  error?: string;
  errorCode?: string;
}

/**
 * Escrow operation result with additional details
 */
export interface EscrowResult extends PaymentResult {
  escrowId?: string;
  txHash?: string;
}

/**
 * Payment provider interface - implemented by all payment methods
 * 
 * @example
 * ```typescript
 * const provider = getPaymentProvider('credits');
 * 
 * // Check if user can afford a bounty
 * if (await provider.canAfford(userId, 100)) {
 *   await provider.escrow(userId, 100, bountyId);
 * }
 * ```
 */
export interface PaymentProvider {
  /** Provider type identifier */
  readonly type: CurrencyType;

  /**
   * Get the current balance for a user
   * @param userId - The user's UUID
   * @returns The user's balance in the provider's currency
   */
  getBalance(userId: string): Promise<number>;

  /**
   * Check if user has sufficient funds
   * @param userId - The user's UUID
   * @param amount - Amount to check against
   * @returns True if user can afford the amount
   */
  canAfford(userId: string, amount: number): Promise<boolean>;

  /**
   * Debit (subtract) funds from user's account
   * @param userId - The user's UUID
   * @param amount - Amount to debit (positive number)
   * @param reference - What this transaction is for
   * @returns Transaction record or error
   */
  debit(
    userId: string,
    amount: number,
    reference: TransactionReference
  ): Promise<PaymentResult>;

  /**
   * Credit (add) funds to user's account
   * @param userId - The user's UUID
   * @param amount - Amount to credit (positive number)
   * @param reference - What this transaction is for
   * @returns Transaction record or error
   */
  credit(
    userId: string,
    amount: number,
    reference: TransactionReference
  ): Promise<PaymentResult>;

  /**
   * Lock funds in escrow for a bounty
   * @param userId - The bounty poster's UUID
   * @param amount - Bounty amount to lock
   * @param bountyId - The bounty UUID
   * @returns Escrow transaction or error
   */
  escrow(
    userId: string,
    amount: number,
    bountyId: string
  ): Promise<EscrowResult>;

  /**
   * Release escrowed funds to the winner
   * @param bountyId - The bounty UUID
   * @param winnerId - The winning agent's owner UUID
   * @returns Transaction record or error
   */
  releaseEscrow(bountyId: string, winnerId: string): Promise<EscrowResult>;

  /**
   * Refund escrowed funds back to the poster
   * @param bountyId - The bounty UUID
   * @returns Transaction record or error
   */
  refundEscrow(bountyId: string): Promise<EscrowResult>;
}

/**
 * Configuration for payment providers
 */
export interface PaymentProviderConfig {
  /** Provider type */
  type: CurrencyType;
  /** Platform fee percentage (e.g., 5 for 5%) */
  platformFeePercent?: number;
  /** Minimum transaction amount */
  minAmount?: number;
  /** Maximum transaction amount */
  maxAmount?: number;
}

/**
 * Factory function type for creating payment providers
 */
export type PaymentProviderFactory = (
  config?: Partial<PaymentProviderConfig>
) => PaymentProvider;
