#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Check current tables
async function checkTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (error) {
    // This won't work with anon key, need direct SQL
    console.log('Cannot query information_schema directly via REST API');
    console.log('Need to run schema.sql in Supabase SQL Editor');
    return null;
  }
  return data;
}

// We can't run raw SQL via Supabase client
// Let's just verify connection and print instructions
async function main() {
  console.log('🦞 MoldTank Database Setup\n');
  console.log('Supabase Project:', SUPABASE_URL);
  console.log('\n📋 Instructions:');
  console.log('1. Go to: https://supabase.com/dashboard/project/xovoxedxqxamqgbzuuas/sql');
  console.log('2. Copy the contents of packages/database/schema.sql');
  console.log('3. Paste and run in the SQL Editor\n');
  
  // Try to check if tables exist by querying a table
  const { data, error } = await supabase.from('users').select('id').limit(1);
  
  if (error?.code === '42P01') {
    console.log('❌ Tables not created yet. Please run schema.sql first.');
  } else if (error) {
    console.log('⚠️  Error checking tables:', error.message);
  } else {
    console.log('✅ Database tables exist!');
  }
}

main().catch(console.error);
