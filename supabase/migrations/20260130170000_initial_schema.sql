-- ═══════════════════════════════════════════════════════════════════════════
-- 🦞 MOLDTANK - DATABASE SCHEMA (Supabase/PostgreSQL)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor to set up the database
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

-- Currency/payment types supported
CREATE TYPE currency_type AS ENUM ('credits', 'usdc', 'stripe_usd');

-- Bounty status workflow
CREATE TYPE bounty_status AS ENUM (
  'draft',           -- Created but not funded
  'open',            -- Funded and accepting submissions
  'in_progress',     -- Has submissions, being validated
  'completed',       -- Winner selected, paid
  'expired',         -- Deadline passed, no winner
  'cancelled',       -- Cancelled by poster
  'refunded'         -- Escrow returned
);

-- Escrow status
CREATE TYPE escrow_status AS ENUM (
  'pending',         -- Awaiting deposit
  'held',            -- Funds locked
  'released',        -- Paid to winner
  'refunded'         -- Returned to poster
);

-- Agent status
CREATE TYPE agent_status AS ENUM (
  'pending_claim',   -- Registered, not claimed
  'active',          -- Claimed and operational
  'suspended',       -- Temporarily disabled
  'banned'           -- Permanently disabled
);

-- Submission status
CREATE TYPE submission_status AS ENUM (
  'pending',         -- Awaiting validation
  'validating',      -- Currently being validated
  'passed',          -- Passed all checks
  'failed',          -- Failed validation
  'winner',          -- Selected as winner
  'rejected'         -- Manually rejected
);

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
  'deposit',         -- Credits added
  'withdrawal',      -- Credits removed
  'escrow_lock',     -- Funds locked for bounty
  'escrow_release',  -- Funds released to winner
  'escrow_refund',   -- Funds returned to poster
  'bounty_win',      -- Earnings from winning
  'platform_fee',    -- Platform fee deduction
  'bonus'            -- Promotional credits
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  wallet VARCHAR(42) UNIQUE,
  
  -- Multi-currency balance support
  balance DECIMAL(18, 6) NOT NULL DEFAULT 0,
  balance_type currency_type NOT NULL DEFAULT 'credits',
  
  -- Profile
  display_name VARCHAR(64),
  avatar_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- At least one identifier required
  CONSTRAINT user_identifier_required CHECK (email IS NOT NULL OR wallet IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_wallet ON users(wallet) WHERE wallet IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Identity
  name VARCHAR(32) UNIQUE NOT NULL,
  description TEXT,
  wallet VARCHAR(42) NOT NULL,
  
  -- Authentication
  api_key_hash VARCHAR(64) NOT NULL,
  verification_code VARCHAR(20),
  
  -- Capabilities: what bounty types can this agent solve
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  
  -- x402 payment endpoint
  x402_endpoint TEXT,
  x402_verified BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Status
  status agent_status NOT NULL DEFAULT 'pending_claim',
  
  -- Stats (denormalized for performance)
  stats JSONB NOT NULL DEFAULT '{
    "bounties_attempted": 0,
    "bounties_won": 0,
    "total_earnings": 0,
    "win_rate": 0,
    "avg_score": 0
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_wallet CHECK (wallet ~ '^0x[a-fA-F0-9]{40}$'),
  CONSTRAINT valid_name CHECK (name ~ '^[a-zA-Z0-9_-]{3,32}$')
);

CREATE INDEX idx_agents_user ON agents(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_wallet ON agents(wallet);
CREATE UNIQUE INDEX idx_agents_name ON agents(LOWER(name));

-- ─────────────────────────────────────────────────────────────────────────────
-- BOUNTIES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE bounties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Poster (can be user or agent)
  poster_id UUID NOT NULL REFERENCES users(id),
  poster_wallet VARCHAR(42),
  
  -- Content
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  
  -- Bounty type (code, data, content, url)
  type VARCHAR(20) NOT NULL DEFAULT 'code',
  
  -- Reward
  amount DECIMAL(18, 6) NOT NULL,
  amount_type currency_type NOT NULL DEFAULT 'credits',
  platform_fee DECIMAL(18, 6) NOT NULL DEFAULT 0,
  winner_payout DECIMAL(18, 6) NOT NULL,
  
  -- Validation criteria (flexible JSON structure)
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Status
  status bounty_status NOT NULL DEFAULT 'draft',
  
  -- Escrow
  escrow_status escrow_status NOT NULL DEFAULT 'pending',
  escrow_tx_hash VARCHAR(66),
  
  -- Winner
  winner_id UUID REFERENCES agents(id),
  winning_submission_id UUID,
  payment_tx_hash VARCHAR(66),
  
  -- Deadlines
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Counters (denormalized)
  submission_count INTEGER NOT NULL DEFAULT 0,
  
  -- Source tracking
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  source_url TEXT,
  
  -- Validation
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_deadline CHECK (deadline > created_at),
  CONSTRAINT valid_type CHECK (type IN ('code', 'data', 'content', 'url'))
);

CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_bounties_deadline ON bounties(deadline);
CREATE INDEX idx_bounties_poster ON bounties(poster_id);
CREATE INDEX idx_bounties_type ON bounties(type);
CREATE INDEX idx_bounties_created ON bounties(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SUBMISSIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  
  -- Submission content (flexible JSON)
  payload JSONB NOT NULL,
  payload_hash VARCHAR(64),
  signature TEXT,
  
  -- Status
  status submission_status NOT NULL DEFAULT 'pending',
  
  -- Validation results
  validation_result JSONB,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  
  -- One submission per agent per bounty
  CONSTRAINT unique_agent_submission UNIQUE (bounty_id, agent_id)
);

CREATE INDEX idx_submissions_bounty ON submissions(bounty_id);
CREATE INDEX idx_submissions_agent ON submissions(agent_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created ON submissions(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRANSACTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Transaction details
  type transaction_type NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency_type currency_type NOT NULL DEFAULT 'credits',
  
  -- Reference to related entity
  reference_type VARCHAR(50), -- 'bounty', 'submission', 'deposit', etc.
  reference_id UUID,
  
  -- Blockchain details (for crypto transactions)
  tx_hash VARCHAR(66),
  chain VARCHAR(20),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit
  CONSTRAINT valid_amount CHECK (amount != 0)
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id) 
  WHERE reference_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- VALIDATION QUEUE TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE validation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  -- Processing state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Error tracking
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  
  -- Ensure one queue entry per submission
  CONSTRAINT unique_submission_queue UNIQUE (submission_id)
);

CREATE INDEX idx_validation_queue_status ON validation_queue(status);
CREATE INDEX idx_validation_queue_priority ON validation_queue(priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMENTS TABLE (for bounty discussions)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  
  author_id UUID NOT NULL,
  author_type VARCHAR(20) NOT NULL, -- 'user' or 'agent'
  
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  status VARCHAR(20) NOT NULL DEFAULT 'visible',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_bounty ON comments(bounty_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTH CHALLENGES (for wallet-based auth)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE auth_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(42) NOT NULL,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_challenges_wallet ON auth_challenges(wallet_address);
CREATE INDEX idx_auth_challenges_expires ON auth_challenges(expires_at) WHERE NOT used;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bounties_updated_at
  BEFORE UPDATE ON bounties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment submission count on bounties
CREATE OR REPLACE FUNCTION increment_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bounties 
  SET submission_count = submission_count + 1 
  WHERE id = NEW.bounty_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_submission_insert
  AFTER INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION increment_submission_count();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) - Enable for Supabase
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Public read access for bounties and agents
CREATE POLICY "Public bounties are viewable by everyone" ON bounties
  FOR SELECT USING (status != 'draft');

CREATE POLICY "Active agents are viewable by everyone" ON agents
  FOR SELECT USING (status = 'active');

-- Users can view their own data
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypasses RLS (for backend operations)
-- These policies allow the service key to do everything

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA (Optional - for development)
-- ─────────────────────────────────────────────────────────────────────────────

-- Uncomment to add test data
/*
INSERT INTO users (email, wallet, balance, display_name) VALUES
  ('alice@example.com', '0x1234567890123456789012345678901234567890', 1000, 'Alice'),
  ('bob@example.com', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 500, 'Bob');
*/
