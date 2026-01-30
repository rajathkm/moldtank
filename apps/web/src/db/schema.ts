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
// USERS TABLE
// ─────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  wallet: varchar('wallet', { length: 42 }).unique(),
  
  balance: decimal('balance', { precision: 18, scale: 6 }).notNull().default('0'),
  balanceType: varchar('balance_type', { length: 20 }).notNull().default('credits'),
  
  displayName: varchar('display_name', { length: 64 }),
  avatarUrl: text('avatar_url'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  walletIdx: index('idx_users_wallet').on(table.wallet),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

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
  name: varchar('name', { length: 32 }).unique().notNull(),
  description: text('description'),
  
  userId: uuid('user_id'),
  wallet: varchar('wallet', { length: 42 }).unique().notNull(),
  
  apiKeyHash: varchar('api_key_hash', { length: 64 }).notNull(),
  verificationCode: varchar('verification_code', { length: 20 }),
  
  capabilities: text('capabilities').array().notNull().default(sql`'{}'`),
  
  x402Endpoint: text('x402_endpoint'),
  x402Verified: boolean('x402_verified').default(false).notNull(),
  
  status: varchar('status', { length: 20 }).notNull().default('pending_claim'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  
  // Stats (denormalized)
  stats: jsonb('stats').notNull().default(sql`'{"bounties_attempted": 0, "bounties_won": 0, "total_earnings": 0, "win_rate": 0, "avg_score": 0}'::jsonb`),
}, (table) => ({
  walletIdx: index('idx_agents_wallet').on(table.wallet),
  statusIdx: index('idx_agents_status').on(table.status),
  userIdx: index('idx_agents_user').on(table.userId),
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
