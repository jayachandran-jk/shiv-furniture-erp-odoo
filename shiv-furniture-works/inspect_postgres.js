const { Client } = require('pg');

const passwords = ['', 'postgres', 'admin', 'password', 'Ks@kbd23777'];
const host = 'localhost';
const user = 'postgres';

async function tryConnect(password) {
  const client = new Client({
    host,
    user,
    password,
    database: 'postgres',
    port: 5432,
  });
  try {
    await client.connect();
    console.log(`Successfully connected to postgres with password: "${password}"`);
    return client;
  } catch (err) {
    return null;
  }
}

async function main() {
  let client = null;
  for (const pw of passwords) {
    client = await tryConnect(pw);
    if (client) break;
  }

  if (!client) {
    console.error('Could not connect to postgres with any standard credentials.');
    process.exit(1);
  }

  try {
    const dbsRes = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    const dbs = dbsRes.rows.map(r => r.datname);
    console.log('Available databases:', dbs);

    for (const dbName of dbs) {
      console.log(`\nChecking database: ${dbName}`);
      const dbClient = new Client({
        host,
        user,
        password: client.connectionParameters.password,
        database: dbName,
        port: 5432,
      });
      try {
        await dbClient.connect();
        const tablesRes = await dbClient.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`Tables in ${dbName}:`, tables);
        
        if (tables.length > 0) {
          console.log(`Schema found in ${dbName}!`);
          // Let's dump all table structures and column definitions
          for (const tbl of tables) {
            const colsRes = await dbClient.query(`
              SELECT column_name, data_type, column_default, is_nullable
              FROM information_schema.columns
              WHERE table_name = $1 AND table_schema = 'public'
              ORDER BY ordinal_position;
            `, [tbl]);
            console.log(`\nTable: ${tbl}`);
            console.table(colsRes.rows);
          }
        }
        await dbClient.end();
      } catch (err) {
        console.error(`Error connecting to database ${dbName}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error querying metadata:', err);
  } finally {
    await client.end();
  }
}

main();
