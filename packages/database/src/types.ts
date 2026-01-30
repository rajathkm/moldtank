// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - DATABASE TYPES
// ═══════════════════════════════════════════════════════════════════════════
// TypeScript types generated from the database schema
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type CurrencyType = 'credits' | 'usdc' | 'stripe_usd';

export type BountyStatus = 
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'refunded';

export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded';

export type AgentStatus = 'pending_claim' | 'active' | 'suspended' | 'banned';

export type SubmissionStatus = 
  | 'pending'
  | 'validating'
  | 'passed'
  | 'failed'
  | 'winner'
  | 'rejected';

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'escrow_lock'
  | 'escrow_release'
  | 'escrow_refund'
  | 'bounty_win'
  | 'platform_fee'
  | 'bonus';

export type BountyType = 'code' | 'data' | 'content' | 'url';

// ─────────────────────────────────────────────────────────────────────────────
// TABLE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  wallet: string | null;
  balance: number;
  balance_type: CurrencyType;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

export interface UserInsert {
  id?: string;
  email?: string | null;
  wallet?: string | null;
  balance?: number;
  balance_type?: CurrencyType;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface UserUpdate {
  email?: string | null;
  wallet?: string | null;
  balance?: number;
  balance_type?: CurrencyType;
  display_name?: string | null;
  avatar_url?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AgentStats {
  bounties_attempted: number;
  bounties_won: number;
  total_earnings: number;
  win_rate: number;
  avg_score: number;
}

export interface Agent {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  wallet: string;
  api_key_hash: string;
  verification_code: string | null;
  capabilities: string[];
  x402_endpoint: string | null;
  x402_verified: boolean;
  status: AgentStatus;
  stats: AgentStats;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  last_active_at: string | null;
}

export interface AgentInsert {
  id?: string;
  user_id?: string | null;
  name: string;
  description?: string | null;
  wallet: string;
  api_key_hash: string;
  verification_code?: string | null;
  capabilities?: string[];
  x402_endpoint?: string | null;
  status?: AgentStatus;
}

export interface AgentUpdate {
  user_id?: string | null;
  description?: string | null;
  capabilities?: string[];
  x402_endpoint?: string | null;
  x402_verified?: boolean;
  status?: AgentStatus;
  stats?: AgentStats;
  claimed_at?: string | null;
  last_active_at?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface BountyCriteria {
  type: BountyType;
  // Code bounty criteria
  language?: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
  }>;
  // Data bounty criteria
  schema?: Record<string, unknown>;
  minRecords?: number;
  // Content bounty criteria
  minWords?: number;
  maxWords?: number;
  format?: string;
  // URL bounty criteria
  httpMethod?: string;
  expectedStatus?: number;
  responseSchema?: Record<string, unknown>;
  // Common
  customPrompt?: string;
  requireLLMReview?: boolean;
}

export interface Bounty {
  id: string;
  slug: string;
  poster_id: string;
  poster_wallet: string | null;
  title: string;
  description: string;
  type: BountyType;
  amount: number;
  amount_type: CurrencyType;
  platform_fee: number;
  winner_payout: number;
  criteria: BountyCriteria;
  status: BountyStatus;
  escrow_status: EscrowStatus;
  escrow_tx_hash: string | null;
  winner_id: string | null;
  winning_submission_id: string | null;
  payment_tx_hash: string | null;
  deadline: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  submission_count: number;
  source: string;
  source_url: string | null;
}

export interface BountyInsert {
  id?: string;
  slug: string;
  poster_id: string;
  poster_wallet?: string | null;
  title: string;
  description: string;
  type?: BountyType;
  amount: number;
  amount_type?: CurrencyType;
  platform_fee?: number;
  winner_payout: number;
  criteria: BountyCriteria;
  status?: BountyStatus;
  escrow_status?: EscrowStatus;
  deadline: string;
  source?: string;
  source_url?: string | null;
}

export interface BountyUpdate {
  title?: string;
  description?: string;
  criteria?: BountyCriteria;
  status?: BountyStatus;
  escrow_status?: EscrowStatus;
  escrow_tx_hash?: string | null;
  winner_id?: string | null;
  winning_submission_id?: string | null;
  payment_tx_hash?: string | null;
  completed_at?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  checks: ValidationCheck[];
  llmAssessment?: {
    passed: boolean;
    score: number;
    reasoning: string;
  };
  error?: string;
  validatedAt: string;
  validatorVersion: string;
}

export interface Submission {
  id: string;
  bounty_id: string;
  agent_id: string;
  payload: Record<string, unknown>;
  payload_hash: string | null;
  signature: string | null;
  status: SubmissionStatus;
  validation_result: ValidationResult | null;
  score: number | null;
  created_at: string;
  validated_at: string | null;
}

export interface SubmissionInsert {
  id?: string;
  bounty_id: string;
  agent_id: string;
  payload: Record<string, unknown>;
  payload_hash?: string | null;
  signature?: string | null;
  status?: SubmissionStatus;
}

export interface SubmissionUpdate {
  status?: SubmissionStatus;
  validation_result?: ValidationResult | null;
  score?: number | null;
  validated_at?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency_type: CurrencyType;
  reference_type: string | null;
  reference_id: string | null;
  tx_hash: string | null;
  chain: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TransactionInsert {
  id?: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency_type?: CurrencyType;
  reference_type?: string | null;
  reference_id?: string | null;
  tx_hash?: string | null;
  chain?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationQueueItem {
  id: string;
  submission_id: string;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  next_retry_at: string | null;
}

export interface ValidationQueueInsert {
  id?: string;
  submission_id: string;
  status?: string;
  priority?: number;
  max_attempts?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  bounty_id: string;
  author_id: string;
  author_type: 'user' | 'agent';
  content: string;
  parent_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE DATABASE TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      agents: {
        Row: Agent;
        Insert: AgentInsert;
        Update: AgentUpdate;
      };
      bounties: {
        Row: Bounty;
        Insert: BountyInsert;
        Update: BountyUpdate;
      };
      submissions: {
        Row: Submission;
        Insert: SubmissionInsert;
        Update: SubmissionUpdate;
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: never;
      };
      validation_queue: {
        Row: ValidationQueueItem;
        Insert: ValidationQueueInsert;
        Update: Partial<ValidationQueueItem>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Comment>;
      };
    };
    Enums: {
      currency_type: CurrencyType;
      bounty_status: BountyStatus;
      escrow_status: EscrowStatus;
      agent_status: AgentStatus;
      submission_status: SubmissionStatus;
      transaction_type: TransactionType;
    };
  };
}
