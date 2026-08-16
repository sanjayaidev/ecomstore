// NOTE: This file is not currently imported anywhere in the app — the API
// routes in api/index.js connect via `@neondatabase/serverless` (`neon(...)`)
// directly instead. It's kept here as a plain `pg` Pool for local
// scripts/tooling that may want a traditional Postgres connection, and is
// fixed to use ESM syntax (`import`/`export`) to match this project's
// "type": "module" setting in package.json — the previous CommonJS
// `require()`/`module.exports` would throw if anything ever imported it.
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

export default pool;