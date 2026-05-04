import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import { DatabaseConfigSource } from './types.js'

interface PersistedAppConfig {
  database?: {
    value: string
    isEncrypted: boolean
  }
}

interface BundledAppConfig {
  databaseUrl?: string
}

export interface ResolvedDatabaseConfig {
  databaseUrl: string | null
  source: DatabaseConfigSource
  configPath: string | null
  secureStorage: boolean
}

const CONFIG_FILE_NAME = 'config.json'
const BUNDLED_CONFIG_RELATIVE_PATH = path.join('config', 'default-config.json')

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME)
}

function getBundledConfigPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, BUNDLED_CONFIG_RELATIVE_PATH)
    : path.join(process.cwd(), 'build', 'default-config.json')
}

function readPersistedConfig(): PersistedAppConfig | null {
  const configPath = getConfigPath()

  if (!fs.existsSync(configPath)) {
    return null
  }

  const fileContents = fs.readFileSync(configPath, 'utf8')
  return JSON.parse(fileContents) as PersistedAppConfig
}

function readStoredDatabaseUrl(config: PersistedAppConfig | null) {
  if (!config?.database?.value) {
    return null
  }

  if (!config.database.isEncrypted) {
    return config.database.value.trim()
  }

  const decrypted = safeStorage.decryptString(
    Buffer.from(config.database.value, 'base64'),
  )

  return decrypted.trim()
}

function readBundledConfig(): BundledAppConfig | null {
  const configPath = getBundledConfigPath()

  if (!fs.existsSync(configPath)) {
    return null
  }

  const fileContents = fs.readFileSync(configPath, 'utf8')
  return JSON.parse(fileContents) as BundledAppConfig
}

function readBundledDatabaseUrl() {
  return readBundledConfig()?.databaseUrl?.trim() || null
}

export function resolveDatabaseConfig(): ResolvedDatabaseConfig {
  const configPath = getConfigPath()
  const bundledConfigPath = getBundledConfigPath()
  const secureStorage = safeStorage.isEncryptionAvailable()
  const persistedConfig = readPersistedConfig()
  const storedDatabaseUrl = readStoredDatabaseUrl(persistedConfig)

  if (storedDatabaseUrl) {
    return {
      databaseUrl: storedDatabaseUrl,
      source: 'userConfig',
      configPath,
      secureStorage,
    }
  }

  const environmentDatabaseUrl = process.env.DATABASE_URL?.trim()
  if (environmentDatabaseUrl) {
    return {
      databaseUrl: environmentDatabaseUrl,
      source: 'environment',
      configPath: null,
      secureStorage,
    }
  }

  const bundledDatabaseUrl = readBundledDatabaseUrl()
  if (bundledDatabaseUrl) {
    return {
      databaseUrl: bundledDatabaseUrl,
      source: 'bundledConfig',
      configPath: bundledConfigPath,
      secureStorage,
    }
  }

  return {
    databaseUrl: null,
    source: 'none',
    configPath: null,
    secureStorage,
  }
}

export function saveDatabaseConfig(databaseUrl: string) {
  const normalizedDatabaseUrl = databaseUrl.trim()
  if (!normalizedDatabaseUrl) {
    throw new Error('Database URL is required')
  }

  const configPath = getConfigPath()
  const secureStorage = safeStorage.isEncryptionAvailable()
  const payload: PersistedAppConfig = {
    database: secureStorage
      ? {
          value: safeStorage
            .encryptString(normalizedDatabaseUrl)
            .toString('base64'),
          isEncrypted: true,
        }
      : {
          value: normalizedDatabaseUrl,
          isEncrypted: false,
        },
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(payload, null, 2), 'utf8')

  return {
    configPath,
    secureStorage,
  }
}

export function clearStoredDatabaseConfig() {
  const configPath = getConfigPath()

  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath)
  }
}
