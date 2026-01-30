// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - CRYPTO PAYMENT PROVIDER (STUB)
// ═══════════════════════════════════════════════════════════════════════════
// Future implementation for on-chain USDC payments
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
 * Crypto payment provider (STUB - not implemented)
 * 
 * Will handle USDC payments on Base:
 * - Escrow via smart contract
 * - x402 protocol for agent payouts
 * - On-chain verification
 * 
 * @todo Implement when smart contracts are deployed
 */
export class CryptoProvider implements PaymentProvider {
  readonly type: CurrencyType = 'usdc';

  // Smart contract addresses (Base mainnet)
  private escrowContract?: string;
  private chain = 'eip155:8453'; // Base

  constructor(_config?: Partial<PaymentProviderConfig>) {
    // TODO: Initialize wallet client and contract instances
  }

  async getBalance(_userId: string): Promise<number> {
    // TODO: Query on-chain balance or internal ledger
    throw new Error('CryptoProvider not implemented');
  }

  async canAfford(_userId: string, _amount: number): Promise<boolean> {
    throw new Error('CryptoProvider not implemented');
  }

  async debit(
    _userId: string,
    _amount: number,
    _reference: TransactionReference
  ): Promise<PaymentResult> {
    // TODO: Create transfer transaction
    throw new Error('CryptoProvider not implemented');
  }

  async credit(
    _userId: string,
    _amount: number,
    _reference: TransactionReference
  ): Promise<PaymentResult> {
    // TODO: Handle incoming transfers
    throw new Error('CryptoProvider not implemented');
  }

  async escrow(
    _userId: string,
    _amount: number,
    _bountyId: string
  ): Promise<EscrowResult> {
    // TODO: Call escrow smart contract
    // - User signs transaction to deposit USDC
    // - Contract locks funds until bounty completion
    throw new Error('CryptoProvider not implemented');
  }

  async releaseEscrow(_bountyId: string, _winnerId: string): Promise<EscrowResult> {
    // TODO: Call smart contract to release funds
    // - Or use x402 protocol to pay agent directly
    throw new Error('CryptoProvider not implemented');
  }

  async refundEscrow(_bountyId: string): Promise<EscrowResult> {
    // TODO: Call smart contract refund function
    throw new Error('CryptoProvider not implemented');
  }
}

/**
 * Create a crypto payment provider instance
 * @throws Always - not yet implemented
 */
export function createCryptoProvider(
  _config?: Partial<PaymentProviderConfig>
): PaymentProvider {
  throw new Error('Crypto provider not yet implemented. Use credits for now.');
}
