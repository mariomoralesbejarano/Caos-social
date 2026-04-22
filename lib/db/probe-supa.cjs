const { Client } = require('pg');
const password = 'mariohugomb.02';
const ref = 'wmmxnplssfwycnsdtqqm';
const candidates = [
  `postgres://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
  `postgres://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  `postgres://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgres://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgres://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
  `postgres://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
];
(async () => {
  for (const url of candidates) {
    const safe = url.replace(/:[^:@/]+@/, ':***@');
    try {
      const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
      await c.connect();
      const r = await c.query('select now() as now');
      console.log('OK:', safe, r.rows[0].now);
      await c.end();
      console.log('USE:', safe);
      break;
    } catch (e) {
      console.log('FAIL:', safe, '-', e.code || e.message);
    }
  }
})();
