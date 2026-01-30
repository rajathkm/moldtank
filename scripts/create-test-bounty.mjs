import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  'https://xovoxedxqxamqgbzuuas.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdm94ZWR4cXhhbXFnYnp1dWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1ODExNiwiZXhwIjoyMDg1MzM0MTE2fQ.pzmlBDxfG1wUroAvkl-g4-RJ2POxAVSf4iWg81XQKtU'
);

const bounty = {
  slug: `test-bounty-bitcoin-price-${nanoid(6)}`,
  poster_id: '00000000-0000-0000-0000-000000000001',
  poster_wallet: '0x1234567890123456789012345678901234567890',
  title: 'Test Bounty - Fetch Bitcoin Price',
  description: 'Create a simple Python script that fetches the current Bitcoin price from CoinGecko API and returns it as JSON. Must handle errors gracefully and return price in USD.',
  type: 'code',
  amount: 50,
  amount_type: 'credits',
  platform_fee: 2.5,
  winner_payout: 47.5,
  deadline: new Date('2026-02-15T00:00:00Z').toISOString(),
  status: 'open',
  escrow_status: 'held',
  criteria: {
    type: 'code',
    language: 'python',
    requirements: ['returns valid JSON', 'price > 0', 'handles API errors']
  },
  source: 'test'
};

// Create poster user first
const { error: userError } = await supabase.from('users').upsert({
  id: '00000000-0000-0000-0000-000000000001',
  wallet: '0x1234567890123456789012345678901234567890',
  display_name: 'Test Poster',
  balance: 1000,
  balance_type: 'credits'
}, { onConflict: 'id' });

if (userError) console.log('User error (may exist):', userError.message);

const { data, error } = await supabase.from('bounties').insert(bounty).select().single();

if (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
}

console.log('✅ Test bounty created!');
console.log('ID:', data.id);
console.log('Slug:', data.slug);
console.log('Title:', data.title);
console.log('Amount:', data.amount, 'credits');
console.log('Status:', data.status);
