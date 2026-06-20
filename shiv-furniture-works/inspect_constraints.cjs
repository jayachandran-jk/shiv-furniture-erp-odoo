const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  user: 'postgres',
  password: 'Ks@kbd23777',
  database: 'shiv_erp',
  port: 5432,
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid IN ('stock_ledger'::regclass, 'products'::regclass, 'sales_orders'::regclass, 'purchase_orders'::regclass, 'manufacturing_orders'::regclass)
  `);
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
