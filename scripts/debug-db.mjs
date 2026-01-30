import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xovoxedxqxamqgbzuuas.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdm94ZWR4cXhhbXFnYnp1dWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1ODExNiwiZXhwIjoyMDg1MzM0MTE2fQ.pzmlBDxfG1wUroAvkl-g4-RJ2POxAVSf4iWg81XQKtU'
);

// Try to query tables directly
const tables = ['users', 'bounties', 'agents'];

for (const table of tables) {
  const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(1);
  console.log(`${table}:`, error ? `ERROR: ${error.message} (${error.code})` : `OK (${count} rows)`);
}
