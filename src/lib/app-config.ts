import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  AppUpdateProvider,
  AppUpdateSettings,
  DatabaseConfigSource,
} from './types.js'

interface PersistedAppConfig {
  database?: {
    value: string
    isEncrypted: boolean
  }
  updates?: AppUpdateSettings
}

interface BundledAppConfig {
  databaseUrl?: string
  databaseHostFallbacks?: string[]
  updateUrl?: string
  updateSettings?: Partial<AppUpdateSettings>
}

export interface ResolvedDatabaseConfig {
  databaseUrl: string | null
  databaseHostFallbacks: string[]
  source: DatabaseConfigSource
  configPath: string | null
  secureStorage: boolean
}

const CONFIG_FILE_NAME = 'config.json'
const BUNDLED_CONFIG_RELATIVE_PATH = path.join('config', 'default-config.json')
const DEFAULT_UPDATE_SETTINGS: AppUpdateSettings = {
  provider: 'github',
  updateUrl: '',
  githubOwner: '',
  githubRepo: '',
  enabled: false,
  autoDownload: true,
  autoInstallOnQuit: true,
  checkIntervalMinutes: 5,
}

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

function writePersistedConfig(config: PersistedAppConfig) {
  const configPath = getConfigPath()
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
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

function readBundledDatabaseHostFallbacks() {
  const fallbackHosts = readBundledConfig()?.databaseHostFallbacks
  if (!Array.isArray(fallbackHosts)) {
    return []
  }

  return fallbackHosts
    .map((host) => host.trim())
    .filter(Boolean)
}

function normalizeUpdateProvider(
  provider: string | undefined,
  updateUrl: string,
  githubOwner: string,
  githubRepo: string,
): AppUpdateProvider {
  if (provider === 'generic' || provider === 'github') {
    return provider
  }

  if (updateUrl) {
    return 'generic'
  }

  if (githubOwner && githubRepo) {
    return 'github'
  }

  return DEFAULT_UPDATE_SETTINGS.provider
}

function normalizeUpdateSettings(
  settings?: Partial<AppUpdateSettings> | null,
): AppUpdateSettings {
  const updateUrl = settings?.updateUrl?.trim() || ''
  const githubOwner = settings?.githubOwner?.trim() || ''
  const githubRepo = settings?.githubRepo?.trim() || ''
  const provider = normalizeUpdateProvider(
    settings?.provider,
    updateUrl,
    githubOwner,
    githubRepo,
  )

  return {
    provider,
    updateUrl,
    githubOwner,
    githubRepo,
    enabled: settings?.enabled ?? DEFAULT_UPDATE_SETTINGS.enabled,
    autoDownload:
      settings?.autoDownload ?? DEFAULT_UPDATE_SETTINGS.autoDownload,
    autoInstallOnQuit:
      settings?.autoInstallOnQuit ?? DEFAULT_UPDATE_SETTINGS.autoInstallOnQuit,
    checkIntervalMinutes: Math.max(
      5,
      Math.floor(
        settings?.checkIntervalMinutes
          ?? DEFAULT_UPDATE_SETTINGS.checkIntervalMinutes,
      ),
    ),
  }
}

export function resolveDatabaseConfig(): ResolvedDatabaseConfig {
  const configPath = getConfigPath()
  const bundledConfigPath = getBundledConfigPath()
  const secureStorage = safeStorage.isEncryptionAvailable()
  const bundledDatabaseUrl = readBundledDatabaseUrl()
  const bundledDatabaseHostFallbacks = readBundledDatabaseHostFallbacks()

  if (app.isPackaged && bundledDatabaseUrl) {
    return {
      databaseUrl: bundledDatabaseUrl,
      databaseHostFallbacks: bundledDatabaseHostFallbacks,
      source: 'bundledConfig',
      configPath: bundledConfigPath,
      secureStorage,
    }
  }

  const persistedConfig = readPersistedConfig()
  const storedDatabaseUrl = readStoredDatabaseUrl(persistedConfig)

  if (storedDatabaseUrl) {
    return {
      databaseUrl: storedDatabaseUrl,
      databaseHostFallbacks: [],
      source: 'userConfig',
      configPath,
      secureStorage,
    }
  }

  const environmentDatabaseUrl = process.env.DATABASE_URL?.trim()
  if (environmentDatabaseUrl) {
    return {
      databaseUrl: environmentDatabaseUrl,
      databaseHostFallbacks: [],
      source: 'environment',
      configPath: null,
      secureStorage,
    }
  }

  if (bundledDatabaseUrl) {
    return {
      databaseUrl: bundledDatabaseUrl,
      databaseHostFallbacks: bundledDatabaseHostFallbacks,
      source: 'bundledConfig',
      configPath: bundledConfigPath,
      secureStorage,
    }
  }

  return {
    databaseUrl: null,
    databaseHostFallbacks: [],
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

  const existingConfig = readPersistedConfig() || {}
  const secureStorage = safeStorage.isEncryptionAvailable()
  const payload: PersistedAppConfig = {
    ...existingConfig,
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

  writePersistedConfig(payload)

  const configPath = getConfigPath()

  return {
    configPath,
    secureStorage,
  }
}

export function clearStoredDatabaseConfig() {
  const configPath = getConfigPath()

  const existingConfig = readPersistedConfig()
  if (!existingConfig) {
    return
  }

  delete existingConfig.database

  if (!existingConfig.updates) {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath)
    }
    return
  }

  writePersistedConfig(existingConfig)
}

export function getDefaultUpdateSettings() {
  return { ...DEFAULT_UPDATE_SETTINGS }
}

export function resolveUpdateSettings(): AppUpdateSettings {
  const bundledConfig = readBundledConfig()
  const persistedConfig = readPersistedConfig()

  return normalizeUpdateSettings({
    ...bundledConfig?.updateSettings,
    ...(bundledConfig?.updateUrl
      ? {
          updateUrl: bundledConfig.updateUrl,
        }
      : {}),
    ...persistedConfig?.updates,
  })
}

export function saveUpdateSettings(settings: AppUpdateSettings) {
  const nextSettings = normalizeUpdateSettings(settings)
  const existingConfig = readPersistedConfig() || {}
  const payload: PersistedAppConfig = {
    ...existingConfig,
    updates: nextSettings,
  }

  writePersistedConfig(payload)
  return nextSettings
}
