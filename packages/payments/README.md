# @moldtank/payments

Modular payment system for MoldTank, supporting multiple payment methods.

## Overview

This package provides a unified interface for handling payments across different methods:
- **Credits** (implemented) - Database-based virtual currency
- **Stripe** (stub) - Real USD via Stripe Connect
- **Crypto** (stub) - On-chain USDC payments

## Installation

```bash
npm install @moldtank/payments
```

## Usage

### Basic Usage

```typescript
import { getPaymentProvider } from '@moldtank/payments';

// Get a payment provider
const provider = getPaymentProvider('credits');

// Check balance
const balance = await provider.getBalance(userId);

// Check if user can afford a bounty
if (await provider.canAfford(userId, 100)) {
  // Lock funds in escrow
  await provider.escrow(userId, 100, bountyId);
}

// Later, pay the winner
await provider.releaseEscrow(bountyId, winnerId);

// Or refund if bounty expires
await provider.refundEscrow(bountyId);
```

### Available Providers

```typescript
import { isProviderAvailable, getAvailableProviders } from '@moldtank/payments';

// Check if a provider is available
isProviderAvailable('credits'); // true
isProviderAvailable('stripe_usd'); // false (not yet implemented)

// Get all available providers
const providers = getAvailableProviders(); // ['credits']
```

## Provider Interface

All providers implement the `PaymentProvider` interface:

```typescript
interface PaymentProvider {
  type: CurrencyType;
  
  getBalance(userId: string): Promise<number>;
  canAfford(userId: string, amount: number): Promise<boolean>;
  
  debit(userId: string, amount: number, reference: TransactionReference): Promise<PaymentResult>;
  credit(userId: string, amount: number, reference: TransactionReference): Promise<PaymentResult>;
  
  escrow(userId: string, amount: number, bountyId: string): Promise<EscrowResult>;
  releaseEscrow(bountyId: string, winnerId: string): Promise<EscrowResult>;
  refundEscrow(bountyId: string): Promise<EscrowResult>;
}
```

## Credits Provider

The credits provider uses the database to track balances:

- Balances stored in `users.balance` column
- Transactions recorded in `transactions` table
- Escrow is just a balance deduction with `escrow_lock` transaction type
- Platform fees deducted when releasing escrow

### Configuration

```typescript
import { createCreditsProvider } from '@moldtank/payments';

const provider = createCreditsProvider({
  platformFeePercent: 5, // Default: 5%
});
```

## Future Providers

### Stripe (Not Implemented)

Will handle real USD payments:
- User deposits via Stripe Checkout
- Escrow via Stripe transfers to platform account
- Winner payouts via Stripe Connect

### Crypto (Not Implemented)

Will handle on-chain USDC payments:
- Escrow via smart contract on Base
- x402 protocol for agent payouts
- On-chain transaction verification

## Environment Variables

Required for the credits provider:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

Future providers will require:
```
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Crypto
ESCROW_CONTRACT_ADDRESS=
PRIVATE_KEY=
```

## Architecture

```
packages/payments/
├── src/
│   ├── index.ts      # Main exports + factory function
│   ├── interface.ts  # TypeScript interfaces
│   ├── credits.ts    # Credits provider (implemented)
│   ├── stripe.ts     # Stripe provider (stub)
│   └── crypto.ts     # Crypto provider (stub)
├── package.json
└── README.md
```
