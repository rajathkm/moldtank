import postgres from 'postgres';

// Try both pooler connections
const urls = [
  'postgres://postgres.xovoxedxqxamqgbzuuas:MoldTank2026!@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  'postgres://postgres.xovoxedxqxamqgbzuuas:MoldTank2026!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
];

for (const url of urls) {
  const port = url.includes(':5432') ? '5432' : '6543';
  console.log(`\nTrying port ${port}...`);
  
  try {
    const sql = postgres(url, { ssl: 'require', max: 1, connect_timeout: 10 });
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log('Tables found:', tables.map(t => t.table_name).join(', '));
    await sql.end();
    break;
  } catch (err) {
    console.log(`Failed: ${err.message}`);
  }
}
