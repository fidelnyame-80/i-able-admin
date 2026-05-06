import fs from 'fs'
import path from 'path'
import dns from 'dns/promises'
import { Pool, PoolConfig } from 'pg'
import { resolveDatabaseConfig } from './app-config.js'
import { DatabaseSchemaStatus, DatabaseStatus } from './types.js'

let pool: Pool | null = null
let activeDatabaseUrl: string | null = null

async function resolveIpv4Host(hostname: string) {
  try {
    const result = await dns.lookup(hostname, { family: 4 })
    return result.address
  } catch {
    return hostname
  }
}

async function createPool(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl)
  const hostname = parsedUrl.hostname
  const host = await resolveIpv4Host(hostname)
  const database = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''))
  const sslMode = parsedUrl.searchParams.get('sslmode')
  const useSsl = sslMode !== 'disable'
  const poolConfig: PoolConfig = {
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database,
    host,
    port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
    application_name: 'i-able-admin',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 30_000,
  }

  if (useSsl) {
    poolConfig.ssl = {
      rejectUnauthorized: false, // For Neon Postgres compatibility
      servername: hostname,
    }
  }

  return new Pool({
    ...poolConfig,
  })
}

function getEmptySchemaStatus(): DatabaseSchemaStatus {
  return {
    adminUsersTable: false,
    appointmentRequestsTable: false,
    appointmentStatusColumn: false,
    appointmentInternalNotesColumn: false,
    appointmentContactedAtColumn: false,
    appointmentSessionTypeColumn: false,
  }
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown database error'
  const normalizedMessage = message.toLowerCase()
  const looksLikeTimeout =
    normalizedMessage.includes('timeout')
    || normalizedMessage.includes('etimedout')

  if (!looksLikeTimeout) {
    return message
  }

  return `${message}. The installer has a database URL, but this PC could not reach Postgres. Check internet access, VPN/proxy settings, firewall rules, and whether outbound PostgreSQL traffic on port 5432 is allowed.`
}

function getSchemaIssueMessage(schema: DatabaseSchemaStatus) {
  if (!schema.appointmentRequestsTable) {
    return 'Connected to Postgres, but the required "appointment_requests" table was not found. Use the same database your public i-Able website writes appointments to.'
  }

  if (!schema.adminUsersTable) {
    return 'Connected to Postgres, but the app could not create or access the "admin_users" table.'
  }

  const missingColumns: string[] = []

  if (!schema.appointmentStatusColumn) {
    missingColumns.push('status')
  }

  if (!schema.appointmentInternalNotesColumn) {
    missingColumns.push('internal_notes')
  }

  if (!schema.appointmentContactedAtColumn) {
    missingColumns.push('contacted_at')
  }

  if (!schema.appointmentSessionTypeColumn) {
    missingColumns.push('session_type')
  }

  if (missingColumns.length > 0) {
    return `Connected to Postgres, but the "appointment_requests" table is missing required columns: ${missingColumns.join(', ')}.`
  }

  return null
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
       ) AS "appointmentContactedAtColumn",
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'appointment_requests'
           AND column_name = 'session_type'
       ) AS "appointmentSessionTypeColumn"`,
  )

  return result.rows[0] as DatabaseSchemaStatus
}

export async function testDatabaseConnection(databaseUrl: string) {
  const testPool = await createPool(databaseUrl)

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

  const nextPool = await createPool(resolvedDatabaseUrl)
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
      && schema.appointmentSessionTypeColumn
    const schemaIssue = isReady ? null : getSchemaIssueMessage(schema)

    return {
      isConfigured: true,
      isConnected: true,
      isReady,
      source: resolvedConfig.source,
      configPath: resolvedConfig.configPath,
      secureStorage: resolvedConfig.secureStorage,
      schema,
      lastError: schemaIssue,
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
