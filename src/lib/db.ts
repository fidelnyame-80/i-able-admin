import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { resolveDatabaseConfig } from './app-config.js'
import { DatabaseSchemaStatus, DatabaseStatus } from './types.js'

let pool: Pool | null = null
let activeDatabaseUrl: string | null = null

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createPool(databaseUrl: string) {
  return new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // For Neon Postgres compatibility
    },
  })
}

function getEmptySchemaStatus(): DatabaseSchemaStatus {
  return {
    adminUsersTable: false,
    appointmentRequestsTable: false,
    appointmentStatusColumn: false,
    appointmentInternalNotesColumn: false,
    appointmentContactedAtColumn: false,
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown database error'
}

async function inspectDatabaseSchema(db: Pool): Promise<DatabaseSchemaStatus> {
  const result = await db.query(
    `SELECT
       to_regclass('public.admin_users') IS NOT NULL AS "adminUsersTable",
       to_regclass('public.appointment_requests') IS NOT NULL AS "appointmentRequestsTable",
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'appointment_requests'
           AND column_name = 'status'
       ) AS "appointmentStatusColumn",
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'appointment_requests'
           AND column_name = 'internal_notes'
       ) AS "appointmentInternalNotesColumn",
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'appointment_requests'
           AND column_name = 'contacted_at'
       ) AS "appointmentContactedAtColumn"`,
  )

  return result.rows[0] as DatabaseSchemaStatus
}

export async function testDatabaseConnection(databaseUrl: string) {
  const testPool = createPool(databaseUrl)

  try {
    await testPool.query('SELECT 1')
  } finally {
    await testPool.end()
  }
}

export async function initializeDatabase(databaseUrl?: string) {
  const resolvedDatabaseUrl = databaseUrl?.trim()
    || resolveDatabaseConfig().databaseUrl

  if (!resolvedDatabaseUrl) {
    throw new Error('Database is not configured')
  }

  if (pool && activeDatabaseUrl === resolvedDatabaseUrl) {
    try {
      await pool.query('SELECT 1')
      return pool
    } catch {
      await closeDatabase()
    }
  }

  if (pool) {
    await closeDatabase()
  }

  const nextPool = createPool(resolvedDatabaseUrl)
  await nextPool.query('SELECT 1')

  pool = nextPool
  activeDatabaseUrl = resolvedDatabaseUrl

  return pool
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const resolvedConfig = resolveDatabaseConfig()

  if (!resolvedConfig.databaseUrl) {
    return {
      isConfigured: false,
      isConnected: false,
      isReady: false,
      source: resolvedConfig.source,
      configPath: resolvedConfig.configPath,
      secureStorage: resolvedConfig.secureStorage,
      schema: getEmptySchemaStatus(),
      lastError: null,
    }
  }

  try {
    const db = await initializeDatabase(resolvedConfig.databaseUrl)
    const schema = await inspectDatabaseSchema(db)
    const isReady =
      schema.adminUsersTable
      && schema.appointmentRequestsTable
      && schema.appointmentStatusColumn
      && schema.appointmentInternalNotesColumn
      && schema.appointmentContactedAtColumn

    return {
      isConfigured: true,
      isConnected: true,
      isReady,
      source: resolvedConfig.source,
      configPath: resolvedConfig.configPath,
      secureStorage: resolvedConfig.secureStorage,
      schema,
      lastError: null,
    }
  } catch (error) {
    return {
      isConfigured: true,
      isConnected: false,
      isReady: false,
      source: resolvedConfig.source,
      configPath: resolvedConfig.configPath,
      secureStorage: resolvedConfig.secureStorage,
      schema: getEmptySchemaStatus(),
      lastError: getErrorMessage(error),
    }
  }
}

export async function ensureDatabaseSetup(databaseUrl?: string) {
  const resolvedDatabaseUrl = databaseUrl?.trim()
    || resolveDatabaseConfig().databaseUrl

  if (!resolvedDatabaseUrl) {
    return
  }

  await initializeDatabase(resolvedDatabaseUrl)
  await runDatabaseSetup()
}

export async function runDatabaseSetup() {
  const db = getDatabase()
  const migrationsPath = path.join(__dirname, '../../db/migrations.sql')
  const migrationSql = fs.readFileSync(migrationsPath, 'utf8')

  await db.query(migrationSql)
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
    activeDatabaseUrl = null
  }
}
