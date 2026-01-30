// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - PAYMENTS MODULE
// ═══════════════════════════════════════════════════════════════════════════
// Modular payment system supporting credits, Stripe, and crypto
// ═══════════════════════════════════════════════════════════════════════════

import type { CurrencyType } from '@moldtank/database';
import type { PaymentProvider, PaymentProviderConfig } from './interface';
import { createCreditsProvider, CreditsProvider } from './credits';
import { createStripeProvider, StripeProvider } from './stripe';
import { createCryptoProvider, CryptoProvider } from './crypto';
import { createX402Provider, X402Provider } from './x402';

// Export all types and interfaces
export * from './interface';

// Export provider classes
export { CreditsProvider } from './credits';
export { StripeProvider } from './stripe';
export { CryptoProvider } from './crypto';
export { X402Provider, createX402Provider } from './x402';
export type { X402PaymentRequest, X402PaymentResponse, X402PaymentOption } from './x402';

/**
 * Factory function to get a payment provider by type
 * 
 * @example
 * ```typescript
 * // Get credits provider (database-based)
 * const provider = getPaymentProvider('credits');
 * 
 * // Use it
 * const balance = await provider.getBalance(userId);
 * await provider.escrow(userId, 100, bountyId);
 * ```
 * 
 * @param type - The currency/payment type
 * @param config - Optional provider configuration
 * @returns A payment provider instance
 * @throws If the provider type is not supported or not implemented
 */
export function getPaymentProvider(
  type: CurrencyType,
  config?: Partial<PaymentProviderConfig>
): PaymentProvider {
  switch (type) {
    case 'credits':
      return createCreditsProvider(config);
    
    case 'stripe_usd':
      return createStripeProvider(config);
    
    case 'usdc':
      return createCryptoProvider(config);
    
    default:
      throw new Error(`Unknown payment provider type: ${type}`);
  }
}

/**
 * Check if a payment provider is available
 * 
 * @param type - The currency/payment type
 * @returns True if the provider is implemented and available
 */
export function isProviderAvailable(type: CurrencyType): boolean {
  switch (type) {
    case 'credits':
      return true;
    case 'stripe_usd':
    case 'usdc':
      return false; // Not yet implemented
    default:
      return false;
  }
}

/**
 * Get all available payment provider types
 * 
 * @returns Array of available currency types
 */
export function getAvailableProviders(): CurrencyType[] {
  return ['credits']; // Only credits for now
}

/**
 * Default payment provider (credits-based)
 */
export const defaultProvider = createCreditsProvider();
