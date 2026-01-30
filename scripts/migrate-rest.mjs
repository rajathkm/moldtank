#!/usr/bin/env node
/**
 * 🦞 MoldTank Database Migration via REST API
 * Uses Supabase's RPC endpoint to run SQL
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '../packages/database/schema.sql');

const SUPABASE_URL = 'https://xovoxedxqxamqgbzuuas.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdm94ZWR4cXhhbXFnYnp1dWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1ODExNiwiZXhwIjoyMDg1MzM0MTE2fQ.pzmlBDxfG1wUroAvkl-g4-RJ2POxAVSf4iWg81XQKtU';

async function checkTables() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_table_names`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (res.ok) {
    return await res.json();
  }
  return null;
}

async function listTables() {
  // Query information_schema via the REST API using a raw query
  // This won't work directly, so we'll query a known table instead
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  
  // 42P01 = table doesn't exist
  if (!res.ok) {
    const text = await res.text();
    if (text.includes('42P01') || text.includes('does not exist')) {
      return { exists: false };
    }
  }
  return { exists: true };
}

async function main() {
  console.log('🦞 MoldTank Database Setup Check\n');
  console.log(`Supabase Project: ${SUPABASE_URL}\n`);
  
  const result = await listTables();
  
  if (result.exists) {
    console.log('✅ Database tables already exist!\n');
    
    // List all tables by querying a few known ones
    const tables = ['users', 'agents', 'bounties', 'submissions', 'transactions'];
    for (const table of tables) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'count=exact'
        }
      });
      const count = res.headers.get('content-range')?.split('/')[1] || '?';
      console.log(`   ✓ ${table}: ${count} rows`);
    }
  } else {
    console.log('❌ Tables not found. Schema needs to be applied.\n');
    console.log('📋 To apply the schema:\n');
    console.log('   1. Open: https://supabase.com/dashboard/project/xovoxedxqxamqgbzuuas/sql/new');
    console.log('   2. Paste contents of: packages/database/schema.sql');
    console.log('   3. Click "Run"\n');
    
    console.log('Or use the Supabase MCP if available.');
  }
}

main().catch(console.error);
