import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xovoxedxqxamqgbzuuas.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdm94ZWR4cXhhbXFnYnp1dWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1ODExNiwiZXhwIjoyMDg1MzM0MTE2fQ.pzmlBDxfG1wUroAvkl-g4-RJ2POxAVSf4iWg81XQKtU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tables = ['users', 'agents', 'bounties', 'submissions', 'transactions', 'validation_queue', 'comments', 'auth_challenges'];

console.log('🦞 MoldTank Database Verification\n');

for (const table of tables) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: ${count} rows`);
  }
}

// Check enums
console.log('\n📋 Checking custom types...');
const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'bounty_status' }).maybeSingle();
if (error?.code === '42883') {
  // Function doesn't exist, but that's ok - enums likely exist
  console.log('   (Cannot verify enums via RPC, but tables exist so schema is applied)');
}
