#!/usr/bin/env node
/**
 * 🦞 MoldTank Database Migration Script
 * Runs schema.sql against the Supabase database
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '../packages/database/schema.sql');

// Use DIRECT Supabase connection (bypasses pooler)
// Format: postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
const DATABASE_URL = 'postgres://postgres:MoldTank2026!@db.xovoxedxqxamqgbzuuas.supabase.co:5432/postgres';

async function migrate() {
  console.log('🦞 MoldTank Database Migration\n');
  
  // Read schema
  const schema = readFileSync(schemaPath, 'utf-8');
  console.log(`📄 Loaded schema.sql (${(schema.length / 1024).toFixed(1)}KB)\n`);
  
  // Connect to database
  const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30
  });
  
  try {
    // Check if tables already exist
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    if (existingTables.length > 0) {
      console.log('⚠️  Found existing tables:');
      existingTables.forEach(t => console.log(`   - ${t.table_name}`));
      console.log('\n');
      
      // Ask for confirmation
      console.log('Schema already exists. Run with --force to recreate.');
      console.log('(This will NOT drop existing tables - use Supabase Dashboard for that)\n');
      
      if (!process.argv.includes('--force')) {
        await sql.end();
        return;
      }
    }
    
    console.log('🚀 Running schema.sql...\n');
    
    // Run schema (postgres.js handles multi-statement execution)
    await sql.unsafe(schema);
    
    console.log('✅ Schema applied successfully!\n');
    
    // Verify tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log('📋 Created tables:');
    tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
    console.log('\n');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.code) console.error('   Code:', err.code);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate().catch(console.error);
