-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS POLICIES FOR SERVICE ROLE AND ADD TEST DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Add service role bypass policies for all tables
DO $$ 
BEGIN
  -- Users table policies
  DROP POLICY IF EXISTS "Service role full access users" ON users;
  CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (true) WITH CHECK (true);
  
  -- Agents table policies  
  DROP POLICY IF EXISTS "Service role full access agents" ON agents;
  CREATE POLICY "Service role full access agents" ON agents
    FOR ALL USING (true) WITH CHECK (true);
    
  -- Bounties table policies
  DROP POLICY IF EXISTS "Service role full access bounties" ON bounties;
  CREATE POLICY "Service role full access bounties" ON bounties
    FOR ALL USING (true) WITH CHECK (true);
    
  -- Submissions table policies
  DROP POLICY IF EXISTS "Service role full access submissions" ON submissions;
  CREATE POLICY "Service role full access submissions" ON submissions
    FOR ALL USING (true) WITH CHECK (true);
    
  -- Transactions table policies
  DROP POLICY IF EXISTS "Service role full access transactions" ON transactions;
  CREATE POLICY "Service role full access transactions" ON transactions
    FOR ALL USING (true) WITH CHECK (true);

  -- Comments table policies
  DROP POLICY IF EXISTS "Service role full access comments" ON comments;
  CREATE POLICY "Service role full access comments" ON comments
    FOR ALL USING (true) WITH CHECK (true);

  -- Auth challenges
  DROP POLICY IF EXISTS "Service role full access auth_challenges" ON auth_challenges;
  CREATE POLICY "Service role full access auth_challenges" ON auth_challenges
    FOR ALL USING (true) WITH CHECK (true);
    
  -- Validation queue
  DROP POLICY IF EXISTS "Service role full access validation_queue" ON validation_queue;
  CREATE POLICY "Service role full access validation_queue" ON validation_queue
    FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Create test user
INSERT INTO users (id, wallet, display_name, balance, balance_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '0x1234567890123456789012345678901234567890',
  'Test Poster',
  1000,
  'credits'
) ON CONFLICT (id) DO NOTHING;

-- Create test bounty
INSERT INTO bounties (
  slug, poster_id, poster_wallet, title, description, type,
  amount, amount_type, platform_fee, winner_payout,
  deadline, status, escrow_status, criteria, source
)
VALUES (
  'test-bounty-bitcoin-price-abc123',
  '00000000-0000-0000-0000-000000000001',
  '0x1234567890123456789012345678901234567890',
  'Test Bounty - Fetch Bitcoin Price',
  'Create a simple Python script that fetches the current Bitcoin price from CoinGecko API and returns it as JSON. Must handle errors gracefully and return price in USD. The script should be self-contained.',
  'code',
  50,
  'credits',
  2.5,
  47.5,
  '2026-02-15T00:00:00Z',
  'open',
  'held',
  '{"type": "code", "language": "python", "requirements": ["returns valid JSON", "price > 0", "handles API errors"]}',
  'test'
) ON CONFLICT (slug) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
