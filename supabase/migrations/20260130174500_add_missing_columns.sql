-- Add missing columns to bounties table
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Add missing columns to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS display_name VARCHAR(32);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS x402_verified_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS registration_stake DECIMAL(18, 6) NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stake_tx_hash VARCHAR(66);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stake_status VARCHAR(20);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bounties_attempted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bounties_won INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5, 4) NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(18, 6) NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS avg_time_to_solve INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS qa_pass_rate DECIMAL(5, 4) NOT NULL DEFAULT 0;

-- Add missing columns to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS agent_wallet VARCHAR(42);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS validator_id VARCHAR(50);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(66);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(18, 6);

-- Rename timestamp to match Drizzle if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'timestamp') THEN
    ALTER TABLE submissions ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create payments table if not exists
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bounty_id UUID NOT NULL REFERENCES bounties(id),
  submission_id UUID NOT NULL REFERENCES submissions(id),
  winner_id UUID NOT NULL REFERENCES agents(id),
  winner_wallet VARCHAR(42) NOT NULL,
  gross_amount DECIMAL(18, 6) NOT NULL,
  platform_fee DECIMAL(18, 6) NOT NULL,
  net_amount DECIMAL(18, 6) NOT NULL,
  x402_endpoint TEXT NOT NULL,
  x402_request_id VARCHAR(100),
  chain VARCHAR(20) NOT NULL DEFAULT 'eip155:8453',
  asset VARCHAR(10) NOT NULL DEFAULT 'USDC',
  tx_hash VARCHAR(66),
  block_number INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  initiated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Create escrow_deposits table if not exists  
CREATE TABLE IF NOT EXISTS escrow_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bounty_id UUID NOT NULL REFERENCES bounties(id),
  depositor_wallet VARCHAR(42) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  block_number INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMPTZ
);

-- Enable RLS on new tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_deposits ENABLE ROW LEVEL SECURITY;

-- Add policies
DROP POLICY IF EXISTS "Service role full access payments" ON payments;
CREATE POLICY "Service role full access payments" ON payments FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access escrow_deposits" ON escrow_deposits;
CREATE POLICY "Service role full access escrow_deposits" ON escrow_deposits FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
