// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - DATABASE SCHEMA (DRIZZLE ORM)
// ═══════════════════════════════════════════════════════════════════════════

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────
// BOUNTIES TABLE
// ─────────────────────────────────────────────────────────────────

export const bounties = pgTable('bounties', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  
  posterId: uuid('poster_id').notNull(),
  posterWallet: varchar('poster_wallet', { length: 42 }).notNull(),
  
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull(),
  
  amount: decimal('amount', { precision: 18, scale: 6 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 18, scale: 6 }).notNull(),
  winnerPayout: decimal('winner_payout', { precision: 18, scale: 6 }).notNull(),
  
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  
  criteria: jsonb('criteria').notNull(),
  
  escrowTxHash: varchar('escrow_tx_hash', { length: 66 }),
  escrowStatus: varchar('escrow_status', { length: 20 }).default('pending'),
  
  winningSubmissionId: uuid('winning_submission_id'),
  winnerId: uuid('winner_id'),
  paymentTxHash: varchar('payment_tx_hash', { length: 66 }),
  
  submissionCount: integer('submission_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  
  source: varchar('source', { length: 20 }).notNull().default('manual'),
  sourceUrl: text('source_url'),
}, (table) => ({
  statusIdx: index('idx_bounties_status').on(table.status),
  deadlineIdx: index('idx_bounties_deadline').on(table.deadline),
  posterIdx: index('idx_bounties_poster').on(table.posterId),
  slugIdx: uniqueIndex('idx_bounties_slug').on(table.slug),
}));

// ─────────────────────────────────────────────────────────────────
// AGENTS TABLE
// ─────────────────────────────────────────────────────────────────

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: varchar('display_name', { length: 32 }).unique().notNull(),
  
  ownerId: uuid('owner_id'),
  
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  
  x402Endpoint: text('x402_endpoint').notNull(),
  x402Verified: boolean('x402_verified').default(false).notNull(),
  x402VerifiedAt: timestamp('x402_verified_at', { withTimezone: true }),
  
  capabilities: text('capabilities').array().notNull().default(sql`'{}'`),
  
  registrationStake: decimal('registration_stake', { precision: 18, scale: 6 }).notNull().default('0'),
  stakeTxHash: varchar('stake_tx_hash', { length: 66 }),
  stakeStatus: varchar('stake_status', { length: 20 }),
  
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
  
  // Reputation metrics (denormalized for performance)
  bountiesAttempted: integer('bounties_attempted').default(0).notNull(),
  bountiesWon: integer('bounties_won').default(0).notNull(),
  winRate: decimal('win_rate', { precision: 5, scale: 4 }).default('0').notNull(),
  totalEarnings: decimal('total_earnings', { precision: 18, scale: 6 }).default('0').notNull(),
  avgTimeToSolve: integer('avg_time_to_solve').default(0).notNull(),
  qaPassRate: decimal('qa_pass_rate', { precision: 5, scale: 4 }).default('0').notNull(),
}, (table) => ({
  walletIdx: index('idx_agents_wallet').on(table.walletAddress),
  statusIdx: index('idx_agents_status').on(table.status),
  earningsIdx: index('idx_agents_earnings').on(table.totalEarnings),
}));

// ─────────────────────────────────────────────────────────────────
// SUBMISSIONS TABLE
// ─────────────────────────────────────────────────────────────────

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  bountyId: uuid('bounty_id').notNull().references(() => bounties.id),
  agentId: uuid('agent_id').notNull().references(() => agents.id),
  agentWallet: varchar('agent_wallet', { length: 42 }).notNull(),
  
  // Critical: determines winner
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  
  payload: jsonb('payload').notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
  signature: text('signature').notNull(),
  
  metadata: jsonb('metadata').default({}).notNull(),
  
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  
  validationResult: jsonb('validation_result'),
  validatorId: varchar('validator_id', { length: 50 }),
  
  paymentStatus: varchar('payment_status', { length: 20 }),
  paymentTxHash: varchar('payment_tx_hash', { length: 66 }),
  paymentAmount: decimal('payment_amount', { precision: 18, scale: 6 }),
}, (table) => ({
  bountyIdx: index('idx_submissions_bounty').on(table.bountyId),
  agentIdx: index('idx_submissions_agent').on(table.agentId),
  timestampIdx: index('idx_submissions_timestamp').on(table.bountyId, table.timestamp),
  statusIdx: index('idx_submissions_status').on(table.status),
  // One submission per agent per bounty
  uniqueSubmission: uniqueIndex('idx_unique_submission').on(table.bountyId, table.agentId),
}));

// ─────────────────────────────────────────────────────────────────
// COMMENTS TABLE
// ─────────────────────────────────────────────────────────────────

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bountyId: uuid('bounty_id').notNull().references(() => bounties.id),
  authorId: uuid('author_id').notNull(),
  authorType: varchar('author_type', { length: 20 }).notNull(),
  
  content: text('content').notNull(),
  
  parentId: uuid('parent_id'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  
  status: varchar('status', { length: 20 }).default('visible').notNull(),
}, (table) => ({
  bountyIdx: index('idx_comments_bounty').on(table.bountyId),
  authorIdx: index('idx_comments_author').on(table.authorId),
}));

// ─────────────────────────────────────────────────────────────────
// PAYMENTS TABLE
// ─────────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  bountyId: uuid('bounty_id').notNull().references(() => bounties.id),
  submissionId: uuid('submission_id').notNull().references(() => submissions.id),
  winnerId: uuid('winner_id').notNull().references(() => agents.id),
  winnerWallet: varchar('winner_wallet', { length: 42 }).notNull(),
  
  grossAmount: decimal('gross_amount', { precision: 18, scale: 6 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 18, scale: 6 }).notNull(),
  netAmount: decimal('net_amount', { precision: 18, scale: 6 }).notNull(),
  
  x402Endpoint: text('x402_endpoint').notNull(),
  x402RequestId: varchar('x402_request_id', { length: 100 }),
  
  chain: varchar('chain', { length: 20 }).notNull().default('eip155:8453'),
  asset: varchar('asset', { length: 10 }).notNull().default('USDC'),
  txHash: varchar('tx_hash', { length: 66 }),
  blockNumber: integer('block_number'),
  
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  
  initiatedAt: timestamp('initiated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  bountyIdx: index('idx_payments_bounty').on(table.bountyId),
  statusIdx: index('idx_payments_status').on(table.status),
}));

// ─────────────────────────────────────────────────────────────────
// ESCROW DEPOSITS TABLE
// ─────────────────────────────────────────────────────────────────

export const escrowDeposits = pgTable('escrow_deposits', {
  id: uuid('id').primaryKey().defaultRandom(),
  bountyId: uuid('bounty_id').notNull().references(() => bounties.id),
  
  depositorWallet: varchar('depositor_wallet', { length: 42 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 6 }).notNull(),
  
  txHash: varchar('tx_hash', { length: 66 }).notNull(),
  blockNumber: integer('block_number'),
  
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
}, (table) => ({
  bountyIdx: index('idx_escrow_bounty').on(table.bountyId),
  txIdx: index('idx_escrow_tx').on(table.txHash),
}));

// ─────────────────────────────────────────────────────────────────
// AUTH CHALLENGES TABLE (for wallet-based auth)
// ─────────────────────────────────────────────────────────────────

export const authChallenges = pgTable('auth_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  challenge: text('challenge').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('idx_auth_wallet').on(table.walletAddress),
  challengeIdx: index('idx_auth_challenge').on(table.challenge),
}));

// ─────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────

export type Bounty = typeof bounties.$inferSelect;
export type NewBounty = typeof bounties.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type EscrowDeposit = typeof escrowDeposits.$inferSelect;
export type NewEscrowDeposit = typeof escrowDeposits.$inferInsert;
