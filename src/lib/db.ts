import fs from 'fs'
import path from 'path'
import {
  neonConfig,
  Pool,
  PoolConfig,
} from '@neondatabase/serverless'
import WebSocket from 'ws'
import { resolveDatabaseConfig } from './app-config.js'
import { DatabaseSchemaStatus, DatabaseStatus } from './types.js'

neonConfig.poolQueryViaFetch = true
neonConfig.webSocketConstructor = WebSocket

let pool: Pool | null = null
let activeDatabaseUrl: string | null = null

function createPool(databaseUrl: string) {
  const poolConfig: PoolConfig = {
    connectionString: databaseUrl,
    application_name: 'i-able-admin',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 30_000,
  }

  return new Pool(poolConfig)
}

async function createConnectedPool(databaseUrl: string) {
  const nextPool = createPool(databaseUrl)
  await nextPool.query('SELECT 1')
  return nextPool
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

function splitSqlStatements(sql: string) {
  const statements: string[] = []
  let currentStatement = ''
  let dollarQuoteTag: string | null = null
  let isInSingleQuote = false
  let isInDoubleQuote = false
  let isInLineComment = false
  let isInBlockComment = false

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const nextChar = sql[index + 1]
    currentStatement += char

    if (isInLineComment) {
      if (char === '\n') {
        isInLineComment = false
      }
      continue
    }

    if (isInBlockComment) {
      if (char === '*' && nextChar === '/') {
        currentStatement += nextChar
        index += 1
        isInBlockComment = false
      }
      continue
    }

    if (dollarQuoteTag) {
      if (sql.startsWith(dollarQuoteTag, index)) {
        currentStatement += dollarQuoteTag.slice(1)
        index += dollarQuoteTag.length - 1
        dollarQuoteTag = null
      }
      continue
    }

    if (isInSingleQuote) {
      if (char === '\'' && nextChar === '\'') {
        currentStatement += nextChar
        index += 1
        continue
      }
      if (char === '\'') {
        isInSingleQuote = false
      }
      continue
    }

    if (isInDoubleQuote) {
      if (char === '"' && nextChar === '"') {
        currentStatement += nextChar
        index += 1
        continue
      }
      if (char === '"') {
        isInDoubleQuote = false
      }
      continue
    }

    if (char === '-' && nextChar === '-') {
      currentStatement += nextChar
      index += 1
      isInLineComment = true
      continue
    }

    if (char === '/' && nextChar === '*') {
      currentStatement += nextChar
      index += 1
      isInBlockComment = true
      continue
    }

    if (char === '\'') {
      isInSingleQuote = true
      continue
    }

    if (char === '"') {
      isInDoubleQuote = true
      continue
    }

    if (char === '$') {
      const remainder = sql.slice(index)
      const dollarQuoteMatch = remainder.match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u)
      if (dollarQuoteMatch) {
        dollarQuoteTag = dollarQuoteMatch[0]
        currentStatement += dollarQuoteTag.slice(1)
        index += dollarQuoteTag.length - 1
      }
      continue
    }

    if (char === ';') {
      const statement = currentStatement.trim()
      if (statement) {
        statements.push(statement)
      }
      currentStatement = ''
    }
  }

  const trailingStatement = currentStatement.trim()
  if (trailingStatement) {
    statements.push(trailingStatement)
  }

  return statements
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

  return `${message}. The installer has a database URL, but the app could not reach Neon using the serverless database connection. Check internet access, VPN/proxy settings, firewall rules, and whether security software is blocking i-Able Admin.`
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

export async function testDatabaseConnection(
  databaseUrl: string,
) {
  const testPool = await createConnectedPool(databaseUrl)

  try {
    await testPool.query('SELECT 1')
  } finally {
    await testPool.end()
  }
}

export async function initializeDatabase(
  databaseUrl?: string,
) {
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

  const nextPool = await createConnectedPool(resolvedDatabaseUrl)

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

export async function ensureDatabaseSetup(
  databaseUrl?: string,
) {
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
  const statements = splitSqlStatements(migrationSql)

  for (const statement of statements) {
    await db.query(statement)
  }
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
