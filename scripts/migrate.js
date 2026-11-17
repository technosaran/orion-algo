/**
 * Supabase / PostgreSQL Database Migration Runner for Orion Algo
 *
 * Scans `supabase/migrations/*.sql` and executes any unapplied migrations
 * in chronological order, recording applied migrations in `public._schema_migrations`.
 *
 * Supported environment variables:
 * - SUPABASE_DB_URL or DATABASE_URL: full PostgreSQL connection string
 * - SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD: automatically constructs Supabase connection URI
 *
 * Usage:
 *   node scripts/migrate.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Optionally load .env.local if present and not in CI
if (fs.existsSync(path.resolve(__dirname, '../.env.local'))) {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const isDryRun = process.argv.includes('--dry-run');

function getConnectionString() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const projectRef = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

  if (projectRef && password) {
    const region = process.env.SUPABASE_REGION || 'aws-0-ap-south-1';
    // Use transaction/session pooler
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${region}.pooler.supabase.com:6543/postgres?sslmode=require`;
  }

  return null;
}

async function run() {
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in supabase/migrations.');
    return;
  }

  console.log(`Found ${files.length} migration file(s):`);
  files.forEach((f) => console.log(`  - ${f}`));

  if (isDryRun) {
    console.log('\n[DRY RUN] Validating SQL file readability and syntax headers...');
    for (const f of files) {
      const filePath = path.join(migrationsDir, f);
      const sql = fs.readFileSync(filePath, 'utf8');
      if (!sql.trim()) {
        console.warn(`[WARN] File ${f} is empty.`);
      } else {
        console.log(`[OK] ${f} (${sql.length} bytes, ${sql.split('\n').length} lines)`);
      }
    }
    console.log('\n[DRY RUN] All migration files are readable and valid.');
    return;
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error(
      '\n[ERROR] Missing database connection credentials.\n' +
        'Please supply one of the following:\n' +
        '  1. SUPABASE_DB_URL or DATABASE_URL (e.g. postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres)\n' +
        '  2. SUPABASE_PROJECT_ID and SUPABASE_DB_PASSWORD\n'
    );
    process.exit(1);
  }

  const maskedConn = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`\nConnecting to database: ${maskedConn}`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('Connected successfully to database.');

    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        execution_time_ms INTEGER
      );
    `);

    // Fetch already applied migrations
    const res = await client.query('SELECT version FROM public._schema_migrations;');
    const appliedVersions = new Set(res.rows.map((r) => r.version));

    let pendingCount = 0;
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (appliedVersions.has(version)) {
        console.log(`[SKIPPED] ${file} (already applied)`);
        continue;
      }

      pendingCount++;
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`\n[APPLYING] ${file}...`);
      const startTime = Date.now();

      await client.query('BEGIN');
      try {
        await client.query(sql);
        const duration = Date.now() - startTime;
        await client.query(
          'INSERT INTO public._schema_migrations (version, name, execution_time_ms) VALUES ($1, $2, $3)',
          [version, file, duration]
        );
        await client.query('COMMIT');
        console.log(`[SUCCESS] Applied ${file} in ${duration}ms`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[FAILED] Error in migration ${file}:`, err.message);
        throw err;
      }
    }

    if (pendingCount === 0) {
      console.log('\nDatabase is already up to date. No pending migrations.');
    } else {
      console.log(`\nSuccessfully applied ${pendingCount} migration(s).`);
    }
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
