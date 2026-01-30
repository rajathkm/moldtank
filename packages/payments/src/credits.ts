// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - CREDITS PAYMENT PROVIDER
// ═══════════════════════════════════════════════════════════════════════════
// Database-based credits system for off-chain payments
// ═══════════════════════════════════════════════════════════════════════════

import { getSupabaseService } from '@moldtank/database';
import type { Transaction, CurrencyType } from '@moldtank/database';
import type {
  PaymentProvider,
  PaymentResult,
  EscrowResult,
  TransactionReference,
  PaymentProviderConfig,
} from './interface';

const DEFAULT_PLATFORM_FEE_PERCENT = 5;

/**
 * Credits-based payment provider
 * 
 * Uses the database to track user balances and transactions.
 * No external payment processing - just internal ledger entries.
 * 
 * @example
 * ```typescript
 * const credits = new CreditsProvider();
 * 
 * // Check balance
 * const balance = await credits.getBalance(userId);
 * 
 * // Lock funds for bounty
 * await credits.escrow(userId, 100, bountyId);
 * 
 * // Pay winner
 * await credits.releaseEscrow(bountyId, winnerId);
 * ```
 */
export class CreditsProvider implements PaymentProvider {
  readonly type: CurrencyType = 'credits';
  private platformFeePercent: number;

  constructor(config?: Partial<PaymentProviderConfig>) {
    this.platformFeePercent = config?.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
  }

  /**
   * Get user's credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const supabase = getSupabaseService();
    
    const { data, error } = await supabase
      .from('users')
      .select('balance, balance_type')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Failed to get balance:', error);
      return 0;
    }

    // Only return balance if it's in credits
    if (data.balance_type !== 'credits') {
      return 0;
    }

    return Number(data.balance);
  }

  /**
   * Check if user can afford an amount
   */
  async canAfford(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Debit credits from user's account
   */
  async debit(
    userId: string,
    amount: number,
    reference: TransactionReference
  ): Promise<PaymentResult> {
    const supabase = getSupabaseService();

    // Check current balance
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      return {
        success: false,
        error: 'Insufficient credits',
        errorCode: 'INSUFFICIENT_FUNDS',
      };
    }

    // Update balance and create transaction in a transaction-like manner
    // Note: Supabase doesn't support true transactions, so we do this carefully
    const newBalance = balance - amount;

    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)
      .eq('balance', balance); // Optimistic locking

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update balance',
        errorCode: 'UPDATE_FAILED',
      };
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'withdrawal',
        amount: -amount,
        currency_type: 'credits',
        reference_type: reference.type,
        reference_id: reference.id,
        description: `Debit for ${reference.type}`,
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create transaction record:', txError);
      // Balance was already updated, log the discrepancy
    }

    return {
      success: true,
      transaction: transaction as Transaction,
    };
  }

  /**
   * Credit funds to user's account
   */
  async credit(
    userId: string,
    amount: number,
    reference: TransactionReference
  ): Promise<PaymentResult> {
    const supabase = getSupabaseService();

    // Get current balance
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return {
        success: false,
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      };
    }

    const newBalance = Number(user.balance) + amount;

    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update balance',
        errorCode: 'UPDATE_FAILED',
      };
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: amount,
        currency_type: 'credits',
        reference_type: reference.type,
        reference_id: reference.id,
        description: `Credit from ${reference.type}`,
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create transaction record:', txError);
    }

    return {
      success: true,
      transaction: transaction as Transaction,
    };
  }

  /**
   * Lock funds in escrow for a bounty
   */
  async escrow(
    userId: string,
    amount: number,
    bountyId: string
  ): Promise<EscrowResult> {
    const supabase = getSupabaseService();

    // Check current balance
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      return {
        success: false,
        error: 'Insufficient credits for escrow',
        errorCode: 'INSUFFICIENT_FUNDS',
      };
    }

    // Debit the user
    const newBalance = balance - amount;

    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)
      .eq('balance', balance); // Optimistic locking

    if (updateError) {
      return {
        success: false,
        error: 'Failed to lock escrow',
        errorCode: 'ESCROW_LOCK_FAILED',
      };
    }

    // Create escrow transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'escrow_lock',
        amount: -amount,
        currency_type: 'credits',
        reference_type: 'bounty',
        reference_id: bountyId,
        description: `Escrow locked for bounty`,
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create escrow transaction:', txError);
    }

    // Update bounty escrow status
    await supabase
      .from('bounties')
      .update({ 
        escrow_status: 'held',
        status: 'open'
      })
      .eq('id', bountyId);

    return {
      success: true,
      transaction: transaction as Transaction,
      escrowId: bountyId,
    };
  }

  /**
   * Release escrow to the winner
   */
  async releaseEscrow(bountyId: string, winnerId: string): Promise<EscrowResult> {
    const supabase = getSupabaseService();

    // Get bounty details
    const { data: bounty, error: bountyError } = await supabase
      .from('bounties')
      .select('amount, winner_payout, poster_id, escrow_status')
      .eq('id', bountyId)
      .single();

    if (bountyError || !bounty) {
      return {
        success: false,
        error: 'Bounty not found',
        errorCode: 'BOUNTY_NOT_FOUND',
      };
    }

    if (bounty.escrow_status !== 'held') {
      return {
        success: false,
        error: 'Escrow not in held status',
        errorCode: 'INVALID_ESCROW_STATUS',
      };
    }

    const winnerPayout = Number(bounty.winner_payout);
    const platformFee = Number(bounty.amount) - winnerPayout;

    // Credit the winner
    const { data: winner, error: winnerFetchError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', winnerId)
      .single();

    if (winnerFetchError || !winner) {
      return {
        success: false,
        error: 'Winner not found',
        errorCode: 'WINNER_NOT_FOUND',
      };
    }

    const newWinnerBalance = Number(winner.balance) + winnerPayout;

    const { error: winnerUpdateError } = await supabase
      .from('users')
      .update({ balance: newWinnerBalance })
      .eq('id', winnerId);

    if (winnerUpdateError) {
      return {
        success: false,
        error: 'Failed to credit winner',
        errorCode: 'CREDIT_FAILED',
      };
    }

    // Create release transaction for winner
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: winnerId,
        type: 'bounty_win',
        amount: winnerPayout,
        currency_type: 'credits',
        reference_type: 'bounty',
        reference_id: bountyId,
        description: `Bounty win payout`,
      })
      .select()
      .single();

    // Create platform fee transaction (if tracking separately)
    if (platformFee > 0) {
      await supabase
        .from('transactions')
        .insert({
          user_id: bounty.poster_id,
          type: 'platform_fee',
          amount: -platformFee,
          currency_type: 'credits',
          reference_type: 'bounty',
          reference_id: bountyId,
          description: `Platform fee`,
        });
    }

    // Update bounty status
    await supabase
      .from('bounties')
      .update({
        escrow_status: 'released',
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', bountyId);

    return {
      success: true,
      transaction: transaction as Transaction,
      escrowId: bountyId,
    };
  }

  /**
   * Refund escrow back to the poster
   */
  async refundEscrow(bountyId: string): Promise<EscrowResult> {
    const supabase = getSupabaseService();

    // Get bounty details
    const { data: bounty, error: bountyError } = await supabase
      .from('bounties')
      .select('amount, poster_id, escrow_status')
      .eq('id', bountyId)
      .single();

    if (bountyError || !bounty) {
      return {
        success: false,
        error: 'Bounty not found',
        errorCode: 'BOUNTY_NOT_FOUND',
      };
    }

    if (bounty.escrow_status !== 'held') {
      return {
        success: false,
        error: 'Escrow not in held status',
        errorCode: 'INVALID_ESCROW_STATUS',
      };
    }

    const refundAmount = Number(bounty.amount);

    // Credit the poster
    const { data: poster, error: posterFetchError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', bounty.poster_id)
      .single();

    if (posterFetchError || !poster) {
      return {
        success: false,
        error: 'Poster not found',
        errorCode: 'POSTER_NOT_FOUND',
      };
    }

    const newPosterBalance = Number(poster.balance) + refundAmount;

    const { error: posterUpdateError } = await supabase
      .from('users')
      .update({ balance: newPosterBalance })
      .eq('id', bounty.poster_id);

    if (posterUpdateError) {
      return {
        success: false,
        error: 'Failed to refund poster',
        errorCode: 'REFUND_FAILED',
      };
    }

    // Create refund transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: bounty.poster_id,
        type: 'escrow_refund',
        amount: refundAmount,
        currency_type: 'credits',
        reference_type: 'bounty',
        reference_id: bountyId,
        description: `Escrow refund`,
      })
      .select()
      .single();

    // Update bounty status
    await supabase
      .from('bounties')
      .update({
        escrow_status: 'refunded',
        status: 'refunded',
      })
      .eq('id', bountyId);

    return {
      success: true,
      transaction: transaction as Transaction,
      escrowId: bountyId,
    };
  }
}

/**
 * Create a credits payment provider instance
 */
export function createCreditsProvider(
  config?: Partial<PaymentProviderConfig>
): PaymentProvider {
  return new CreditsProvider(config);
}
