// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - STRIPE PAYMENT PROVIDER (STUB)
// ═══════════════════════════════════════════════════════════════════════════
// Future implementation for Stripe payments
// ═══════════════════════════════════════════════════════════════════════════

import type { CurrencyType } from '@moldtank/database';
import type {
  PaymentProvider,
  PaymentResult,
  EscrowResult,
  TransactionReference,
  PaymentProviderConfig,
} from './interface';

/**
 * Stripe payment provider (STUB - not implemented)
 * 
 * Will handle real USD payments via Stripe Connect:
 * - User deposits via Stripe Checkout
 * - Escrow via Stripe transfers
 * - Winner payouts via Stripe Connect
 * 
 * @todo Implement when ready to process real payments
 */
export class StripeProvider implements PaymentProvider {
  readonly type: CurrencyType = 'stripe_usd';

  constructor(_config?: Partial<PaymentProviderConfig>) {
    // TODO: Initialize Stripe client
  }

  async getBalance(_userId: string): Promise<number> {
    throw new Error('StripeProvider not implemented');
  }

  async canAfford(_userId: string, _amount: number): Promise<boolean> {
    throw new Error('StripeProvider not implemented');
  }

  async debit(
    _userId: string,
    _amount: number,
    _reference: TransactionReference
  ): Promise<PaymentResult> {
    throw new Error('StripeProvider not implemented');
  }

  async credit(
    _userId: string,
    _amount: number,
    _reference: TransactionReference
  ): Promise<PaymentResult> {
    throw new Error('StripeProvider not implemented');
  }

  async escrow(
    _userId: string,
    _amount: number,
    _bountyId: string
  ): Promise<EscrowResult> {
    throw new Error('StripeProvider not implemented');
  }

  async releaseEscrow(_bountyId: string, _winnerId: string): Promise<EscrowResult> {
    throw new Error('StripeProvider not implemented');
  }

  async refundEscrow(_bountyId: string): Promise<EscrowResult> {
    throw new Error('StripeProvider not implemented');
  }
}

/**
 * Create a Stripe payment provider instance
 * @throws Always - not yet implemented
 */
export function createStripeProvider(
  _config?: Partial<PaymentProviderConfig>
): PaymentProvider {
  throw new Error('Stripe provider not yet implemented. Use credits for now.');
}
