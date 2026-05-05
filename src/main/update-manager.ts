import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import {
  resolveUpdateSettings,
  saveUpdateSettings as persistUpdateSettings,
} from '../lib/app-config.js'
import { AppUpdateSettings, AppUpdateStatus } from '../lib/types.js'

const { NsisUpdater } = electronUpdater
const MIN_CHECK_INTERVAL_MINUTES = 5

let updater: InstanceType<typeof NsisUpdater> | null = null
let configuredUpdateUrl: string | null = null
let periodicCheckTimer: NodeJS.Timeout | null = null
let isChecking = false

function isUpdateSupported() {
  return app.isPackaged && process.platform === 'win32'
}

function normalizeUpdateUrl(updateUrl: string) {
  return updateUrl.trim().replace(/\/+$/, '')
}

function getGithubReleasesUrl(owner: string, repo: string) {
  return `https://github.com/${owner}/${repo}/releases`
}

function getSettings() {
  const settings = resolveUpdateSettings()
  return {
    ...settings,
    updateUrl: normalizeUpdateUrl(settings.updateUrl),
    githubOwner: settings.githubOwner.trim(),
    githubRepo: settings.githubRepo.trim(),
  }
}

function createStatus(settings = getSettings()): AppUpdateStatus {
  const isSupported = isUpdateSupported()
  const isConfigured =
    settings.provider === 'github'
      ? Boolean(settings.githubOwner && settings.githubRepo)
      : Boolean(settings.updateUrl)

  let phase: AppUpdateStatus['phase'] = 'idle'
  let message = 'Ready to check for updates.'

  if (!isSupported) {
    phase = 'disabled'
    message = 'Automatic updates are only available in the installed Windows app.'
  } else if (!isConfigured) {
    phase = 'unconfigured'
    message =
      settings.provider === 'github'
        ? 'Set the GitHub owner and repository to enable app updates.'
        : 'Set an update URL to enable app updates.'
  } else if (!settings.enabled) {
    phase = 'idle'
    message = 'Automatic checks are off. You can still check for updates manually.'
  }

  return {
    phase,
    currentVersion: app.getVersion(),
    availableVersion: null,
    downloadProgress: null,
    lastCheckedAt: null,
    provider: settings.provider,
    updateUrl:
      settings.provider === 'generic'
        ? settings.updateUrl || null
        : getGithubReleasesUrl(settings.githubOwner, settings.githubRepo),
    githubOwner: settings.githubOwner || null,
    githubRepo: settings.githubRepo || null,
    enabled: settings.enabled,
    autoDownload: settings.autoDownload,
    autoInstallOnQuit: settings.autoInstallOnQuit,
    checkIntervalMinutes: settings.checkIntervalMinutes,
    isSupported,
    isConfigured,
    downloaded: false,
    message,
    error: null,
  }
}

let currentStatus = createStatus()

function broadcastStatus() {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('updates:stateChanged', currentStatus)
    }
  }
}

function setStatus(
  partial: Partial<AppUpdateStatus> | ((previous: AppUpdateStatus) => AppUpdateStatus),
) {
  currentStatus =
    typeof partial === 'function'
      ? partial(currentStatus)
      : { ...currentStatus, ...partial }
  broadcastStatus()
}

function stopPeriodicChecks() {
  if (periodicCheckTimer) {
    clearInterval(periodicCheckTimer)
    periodicCheckTimer = null
  }
}

function teardownUpdater() {
  if (updater) {
    updater.removeAllListeners()
  }
  updater = null
  configuredUpdateUrl = null
}

function applyUpdaterEvents(nextUpdater: InstanceType<typeof NsisUpdater>) {
  nextUpdater.on('checking-for-update', () => {
    setStatus({
      phase: 'checking',
      error: null,
      message: 'Checking for updates...',
      downloadProgress: null,
      downloaded: false,
    })
  })

  nextUpdater.on('update-available', (info) => {
    const settings = getSettings()
    setStatus({
      phase: settings.autoDownload ? 'downloading' : 'available',
      availableVersion: info.version,
      error: null,
      downloaded: false,
      downloadProgress: settings.autoDownload ? 0 : null,
      message: settings.autoDownload
        ? `Update ${info.version} found. Downloading now...`
        : `Update ${info.version} is available to download.`,
      lastCheckedAt: new Date().toISOString(),
    })
  })

  nextUpdater.on('update-not-available', () => {
    setStatus({
      phase: 'up-to-date',
      availableVersion: null,
      error: null,
      downloaded: false,
      downloadProgress: null,
      message: 'This device is already on the latest version.',
      lastCheckedAt: new Date().toISOString(),
    })
  })

  nextUpdater.on('download-progress', (progress) => {
    setStatus({
      phase: 'downloading',
      downloadProgress: progress.percent,
      error: null,
      message: `Downloading update... ${progress.percent.toFixed(0)}%`,
    })
  })

  nextUpdater.on('update-downloaded', (info) => {
    setStatus({
      phase: 'downloaded',
      availableVersion: info.version,
      downloadProgress: 100,
      downloaded: true,
      error: null,
      message: getSettings().autoInstallOnQuit
        ? `Update ${info.version} is ready and will install when the app closes.`
        : `Update ${info.version} is ready to install.`,
      lastCheckedAt: new Date().toISOString(),
    })
  })

  nextUpdater.on('error', (error) => {
    setStatus((previous) => ({
      ...previous,
      phase: 'error',
      error: error.message,
      downloadProgress: null,
      message: error.message || 'App update failed.',
      lastCheckedAt: new Date().toISOString(),
    }))
  })
}

async function ensureUpdater() {
  const settings = getSettings()
  const isConfigured =
    settings.provider === 'github'
      ? Boolean(settings.githubOwner && settings.githubRepo)
      : Boolean(settings.updateUrl)

  if (!isUpdateSupported() || !isConfigured) {
    return null
  }

  const providerCacheKey =
    settings.provider === 'github'
      ? `github:${settings.githubOwner}/${settings.githubRepo}`
      : `generic:${settings.updateUrl}`

  if (updater && configuredUpdateUrl === providerCacheKey) {
    updater.autoDownload = settings.autoDownload
    updater.autoInstallOnAppQuit = settings.autoInstallOnQuit
    return updater
  }

  teardownUpdater()

  const nextUpdater =
    settings.provider === 'github'
      ? new NsisUpdater({
          provider: 'github',
          owner: settings.githubOwner,
          repo: settings.githubRepo,
          private: false,
          releaseType: 'release',
        })
      : new NsisUpdater({
          provider: 'generic',
          url: settings.updateUrl,
        })

  nextUpdater.autoDownload = settings.autoDownload
  nextUpdater.autoInstallOnAppQuit = settings.autoInstallOnQuit

  applyUpdaterEvents(nextUpdater)
  updater = nextUpdater
  configuredUpdateUrl = providerCacheKey

  return updater
}

function startPeriodicChecks() {
  stopPeriodicChecks()

  const settings = getSettings()
  const isConfigured =
    settings.provider === 'github'
      ? Boolean(settings.githubOwner && settings.githubRepo)
      : Boolean(settings.updateUrl)

  if (!settings.enabled || !isConfigured || !isUpdateSupported()) {
    return
  }

  const intervalMinutes = Math.max(
    MIN_CHECK_INTERVAL_MINUTES,
    settings.checkIntervalMinutes,
  )

  periodicCheckTimer = setInterval(() => {
    void checkForUpdates(false)
  }, intervalMinutes * 60 * 1000)
}

export function getUpdateSettings() {
  return getSettings()
}

export function getUpdateStatus() {
  return currentStatus
}

export async function refreshUpdateConfiguration(checkOnReady = false) {
  stopPeriodicChecks()
  teardownUpdater()

  const settings = getSettings()
  currentStatus = createStatus(settings)
  broadcastStatus()

  const isConfigured =
    settings.provider === 'github'
      ? Boolean(settings.githubOwner && settings.githubRepo)
      : Boolean(settings.updateUrl)

  if (isUpdateSupported() && isConfigured) {
    await ensureUpdater()
  }

  startPeriodicChecks()

  if (checkOnReady && settings.enabled && isConfigured) {
    void checkForUpdates(false)
  }

  return currentStatus
}

export async function saveUpdateSettings(settings: AppUpdateSettings) {
  const savedSettings = persistUpdateSettings(settings)
  await refreshUpdateConfiguration(savedSettings.enabled)
  return savedSettings
}

export async function checkForUpdates(manual = true) {
  const settings = getSettings()

  if (!isUpdateSupported()) {
    throw new Error(
      'Automatic updates are only available in the installed Windows app.',
    )
  }

  if (
    settings.provider === 'github'
    && (!settings.githubOwner || !settings.githubRepo)
  ) {
    throw new Error('Set the GitHub owner and repository before checking.')
  }

  if (settings.provider === 'generic' && !settings.updateUrl) {
    throw new Error('Set an update URL before checking for updates.')
  }

  if (isChecking || currentStatus.phase === 'downloading') {
    return currentStatus
  }

  const nextUpdater = await ensureUpdater()
  if (!nextUpdater) {
    throw new Error('Update service is not configured.')
  }

  isChecking = true
  if (manual) {
    setStatus({
      phase: 'checking',
      error: null,
      message: 'Checking for updates...',
    })
  }

  try {
    await nextUpdater.checkForUpdates()
  } finally {
    isChecking = false
  }

  return currentStatus
}

export async function downloadUpdate() {
  if (!currentStatus.availableVersion) {
    throw new Error('No update is currently available to download.')
  }

  const nextUpdater = await ensureUpdater()
  if (!nextUpdater) {
    throw new Error('Update service is not configured.')
  }

  setStatus({
    phase: 'downloading',
    error: null,
    downloadProgress: 0,
    message: 'Downloading update...',
  })

  await nextUpdater.downloadUpdate()
  return currentStatus
}

export function installDownloadedUpdate() {
  if (!currentStatus.downloaded || !updater) {
    throw new Error('No downloaded update is ready to install.')
  }

  updater.quitAndInstall()
}
