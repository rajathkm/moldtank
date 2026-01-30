import postgres from 'postgres';

// URL encode the password (! = %21)
const url = 'postgres://postgres.xovoxedxqxamqgbzuuas:MoldTank2026%21@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

console.log('Trying with URL-encoded password...');
try {
  const sql = postgres(url, { ssl: 'require', max: 1, connect_timeout: 15 });
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  console.log('✅ Connected! Tables:', tables.map(t => t.table_name).join(', '));
  await sql.end();
} catch (err) {
  console.log('❌ Failed:', err.message);
}
