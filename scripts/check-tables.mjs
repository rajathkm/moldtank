import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xovoxedxqxamqgbzuuas.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdm94ZWR4cXhhbXFnYnp1dWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1ODExNiwiZXhwIjoyMDg1MzM0MTE2fQ.pzmlBDxfG1wUroAvkl-g4-RJ2POxAVSf4iWg81XQKtU'
);

const tables = [
  // From SQL schema
  'users', 'agents', 'bounties', 'submissions', 'transactions', 
  'validation_queue', 'comments', 'auth_challenges',
  // From Drizzle schema  
  'payments', 'escrow_deposits'
];

console.log('📊 Table Check:\n');

for (const table of tables) {
  const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error?.code === '42P01') {
    console.log(`❌ ${table}: DOES NOT EXIST`);
  } else if (error) {
    console.log(`⚠️  ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}`);
  }
}
