import { Pool } from 'pg'

let pool: Pool | null = null

export function initializeDatabase() {
  if (pool) return pool

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // For Neon Postgres compatibility
    },
  })

  return pool
}

export function getDatabase() {
  if (!pool) {
    throw new Error('Database not initialized')
  }
  return pool
}

export async function closeDatabase() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
