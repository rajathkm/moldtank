import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xovoxedxqxamqgbzuuas.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdm94ZWR4cXhhbXFnYnp1dWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1ODExNiwiZXhwIjoyMDg1MzM0MTE2fQ.pzmlBDxfG1wUroAvkl-g4-RJ2POxAVSf4iWg81XQKtU'
);

// First verify we can read
const { data: existing, error: readErr } = await supabase.from('users').select('*').limit(1);
console.log('Read test:', readErr ? `ERROR: ${readErr.message}` : `OK (${existing.length} rows)`);

// Try insert
const { data: user, error: insertErr } = await supabase
  .from('users')
  .insert({
    wallet: '0x1234567890123456789012345678901234567890',
    display_name: 'Test User',
    balance: 1000,
    balance_type: 'credits'
  })
  .select()
  .single();

if (insertErr) {
  console.log('Insert error:', insertErr.message, insertErr.code, insertErr.details);
} else {
  console.log('✅ User created:', user.id);
}
