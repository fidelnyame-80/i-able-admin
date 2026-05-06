import fs from 'fs'
import path from 'path'
import dns from 'dns/promises'
import { Pool, PoolConfig } from 'pg'
import { resolveDatabaseConfig } from './app-config.js'
import { DatabaseSchemaStatus, DatabaseStatus } from './types.js'

let pool: Pool | null = null
let activeDatabaseUrl: string | null = null
const DNS_LOOKUP_TIMEOUT_MS = 2_000
const FALLBACK_DNS_SERVERS = ['1.1.1.1', '8.8.8.8', '9.9.9.9']

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('DNS lookup timed out')),
      timeoutMs,
    )
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

function getUniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function isIpv4Address(value: string) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/u.test(value)
}

async function resolveIpv4Hosts(hostname: string) {
  const resolvedAddresses: string[] = []
  const lookupAttempts = [
    async () => {
      const results = await dns.lookup(hostname, { family: 4, all: true })
      return results.map((result) => result.address)
    },
    ...FALLBACK_DNS_SERVERS.map((server) => async () => {
      const resolver = new dns.Resolver()
      resolver.setServers([server])
      return resolver.resolve4(hostname)
    }),
  ]

  for (const lookup of lookupAttempts) {
    try {
      const addresses = await withTimeout(lookup(), DNS_LOOKUP_TIMEOUT_MS)
      resolvedAddresses.push(...addresses)
    } catch {
      // Try the next resolver. Some Windows installs have broken local DNS.
    }
  }

  return getUniqueValues(resolvedAddresses)
}

async function getHostCandidates(
  hostname: string,
  databaseHostFallbacks: string[] = [],
) {
  const resolvedHosts = await resolveIpv4Hosts(hostname)
  const bundledFallbackHosts = databaseHostFallbacks
    .map((host) => host.trim())
    .filter(isIpv4Address)

  return getUniqueValues([...resolvedHosts, ...bundledFallbackHosts])
}

function createPool(databaseUrl: string, host: string, sslServername: string) {
  const parsedUrl = new URL(databaseUrl)
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
      servername: sslServername,
    }
  }

  return new Pool({
    ...poolConfig,
  })
}

async function createConnectedPool(
  databaseUrl: string,
  databaseHostFallbacks: string[] = [],
) {
  const { hostname } = new URL(databaseUrl)
  const hostCandidates = await getHostCandidates(hostname, databaseHostFallbacks)
  let lastError: unknown = null

  if (hostCandidates.length === 0) {
    throw new Error(
      `Unable to resolve database hostname "${hostname}". This installer did not include any usable IP fallback for the database host.`,
    )
  }

  for (const host of hostCandidates) {
    const nextPool = createPool(databaseUrl, host, hostname)
    try {
      await nextPool.query('SELECT 1')
      return nextPool
    } catch (error) {
      lastError = error
      await nextPool.end()
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to connect to the database')
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

export async function testDatabaseConnection(
  databaseUrl: string,
  databaseHostFallbacks: string[] = [],
) {
  const testPool = await createConnectedPool(databaseUrl, databaseHostFallbacks)

  try {
    await testPool.query('SELECT 1')
  } finally {
    await testPool.end()
  }
}

export async function initializeDatabase(
  databaseUrl?: string,
  databaseHostFallbacks?: string[],
) {
  const resolvedConfig = resolveDatabaseConfig()
  const resolvedDatabaseUrl = databaseUrl?.trim() || resolvedConfig.databaseUrl
  const resolvedDatabaseHostFallbacks = databaseHostFallbacks
    ?? (databaseUrl ? [] : resolvedConfig.databaseHostFallbacks)

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

  const nextPool = await createConnectedPool(
    resolvedDatabaseUrl,
    resolvedDatabaseHostFallbacks,
  )

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
    const db = await initializeDatabase(
      resolvedConfig.databaseUrl,
      resolvedConfig.databaseHostFallbacks,
    )
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
  databaseHostFallbacks?: string[],
) {
  const resolvedConfig = resolveDatabaseConfig()
  const resolvedDatabaseUrl = databaseUrl?.trim() || resolvedConfig.databaseUrl
  const resolvedDatabaseHostFallbacks = databaseHostFallbacks
    ?? (databaseUrl ? [] : resolvedConfig.databaseHostFallbacks)

  if (!resolvedDatabaseUrl) {
    return
  }

  await initializeDatabase(resolvedDatabaseUrl, resolvedDatabaseHostFallbacks)
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
