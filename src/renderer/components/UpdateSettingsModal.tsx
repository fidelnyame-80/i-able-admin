import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  RefreshCw,
  Rocket,
  Save,
  X,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { AppUpdateSettings, AppUpdateStatus } from '../../lib/types'

interface UpdateSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const defaultSettings: AppUpdateSettings = {
  provider: 'github',
  updateUrl: '',
  githubOwner: '',
  githubRepo: '',
  enabled: false,
  autoDownload: true,
  autoInstallOnQuit: true,
  checkIntervalMinutes: 5,
}

export function UpdateSettingsModal({
  isOpen,
  onClose,
}: UpdateSettingsModalProps) {
  const { theme } = useTheme()
  const [settings, setSettings] = useState<AppUpdateSettings>(defaultSettings)
  const [status, setStatus] = useState<AppUpdateStatus | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let unsubscribe = () => {}

    const load = async () => {
      setActionError('')

      const settingsResponse = await window.electronAPI.getUpdateSettings()
      if (settingsResponse.success && settingsResponse.data) {
        setSettings(settingsResponse.data)
      }

      const statusResponse = await window.electronAPI.getUpdateStatus()
      if (statusResponse.success && statusResponse.data) {
        setStatus(statusResponse.data)
      }

      unsubscribe = window.electronAPI.onUpdateStatusChanged((nextStatus) => {
        setStatus(nextStatus)
      })
    }

    void load()

    return () => {
      unsubscribe()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const statusTone = useMemo(() => {
    if (!status) {
      return 'text-gray-400'
    }

    if (status.phase === 'error') {
      return theme.isDark ? 'text-red-300' : 'text-red-700'
    }

    if (status.phase === 'downloaded') {
      return theme.isDark ? 'text-green-300' : 'text-green-700'
    }

    return theme.isDark ? 'text-gray-300' : 'text-gray-700'
  }, [status, theme.isDark])

  const updateUrlPlaceholder = 'http://192.168.1.50:4800/win'
  const githubRepoPlaceholder = 'fidelnyame-80 / i-able-admin'

  if (!isOpen) {
    return null
  }

  const updateField = <K extends keyof AppUpdateSettings>(
    key: K,
    value: AppUpdateSettings[K],
  ) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setActionError('')

    try {
      const response = await window.electronAPI.saveUpdateSettings(settings)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to save update settings')
      }

      setSettings(response.data)
    } catch (error: any) {
      setActionError(error.message || 'Unable to save update settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCheckNow = async () => {
    setActionError('')
    const response = await window.electronAPI.checkForAppUpdates()
    if (!response.success) {
      setActionError(response.error || 'Unable to check for updates')
    }
  }

  const handleDownload = async () => {
    setActionError('')
    const response = await window.electronAPI.downloadAppUpdate()
    if (!response.success) {
      setActionError(response.error || 'Unable to download the update')
    }
  }

  const handleInstall = async () => {
    setActionError('')
    const response = await window.electronAPI.installAppUpdate()
    if (!response.success) {
      setActionError(response.error || 'Unable to install the update')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={`flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          theme.isDark
            ? 'border-gray-800 bg-gray-950 text-white'
            : 'border-gray-200 bg-white text-gray-900'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            theme.isDark ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <div>
            <h2 className="text-xl font-bold">App Updates</h2>
            <p
              className={`mt-1 text-sm ${
                theme.isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Configure installed devices to update from GitHub Releases or a
              custom LAN feed.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close app update settings"
            className={`rounded-lg p-2 transition-colors ${
              theme.isDark
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Update source
              </label>
              <select
                value={settings.provider}
                onChange={(event) =>
                  updateField(
                    'provider',
                    event.target.value as AppUpdateSettings['provider'],
                  )
                }
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                  theme.isDark
                    ? 'border-gray-700 bg-gray-900 text-white focus:border-yellow-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-yellow-600'
                }`}
              >
                <option value="github">GitHub Releases</option>
                <option value="generic">Custom / local feed URL</option>
              </select>
            </div>

            {settings.provider === 'github' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    GitHub owner
                  </label>
                  <input
                    type="text"
                    value={settings.githubOwner}
                    onChange={(event) =>
                      updateField('githubOwner', event.target.value)
                    }
                    placeholder="fidelnyame-80"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                      theme.isDark
                        ? 'border-gray-700 bg-gray-900 text-white placeholder-gray-600 focus:border-yellow-500'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-yellow-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    GitHub repository
                  </label>
                  <input
                    type="text"
                    value={settings.githubRepo}
                    onChange={(event) =>
                      updateField('githubRepo', event.target.value)
                    }
                    placeholder="i-able-admin"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                      theme.isDark
                        ? 'border-gray-700 bg-gray-900 text-white placeholder-gray-600 focus:border-yellow-500'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-yellow-600'
                    }`}
                  />
                </div>

                <p
                  className={`sm:col-span-2 text-xs ${
                    theme.isDark ? 'text-gray-500' : 'text-gray-600'
                  }`}
                >
                  The app checks published GitHub Releases for `{githubRepoPlaceholder}`-style repositories.
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Update feed URL
                </label>
                <input
                  type="url"
                  value={settings.updateUrl}
                  onChange={(event) =>
                    updateField('updateUrl', event.target.value)
                  }
                  placeholder={updateUrlPlaceholder}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                    theme.isDark
                      ? 'border-gray-700 bg-gray-900 text-white placeholder-gray-600 focus:border-yellow-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-yellow-600'
                  }`}
                />
                <p
                  className={`mt-2 text-xs ${
                    theme.isDark ? 'text-gray-500' : 'text-gray-600'
                  }`}
                >
                  Example: `http://your-computer-ip:4800/win`
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  theme.isDark
                    ? 'border-gray-800 bg-gray-900'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) =>
                    updateField('enabled', event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-yellow-500"
                />
                <div>
                  <p className="font-medium">Enable automatic update checks</p>
                  <p
                    className={`mt-1 text-sm ${
                      theme.isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Installed devices will poll the update feed on launch and on
                    a schedule.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  theme.isDark
                    ? 'border-gray-800 bg-gray-900'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.autoDownload}
                  onChange={(event) =>
                    updateField('autoDownload', event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-yellow-500"
                />
                <div>
                  <p className="font-medium">Download updates automatically</p>
                  <p
                    className={`mt-1 text-sm ${
                      theme.isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    If turned off, the app will still detect updates and wait for
                    you to download them manually.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  theme.isDark
                    ? 'border-gray-800 bg-gray-900'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.autoInstallOnQuit}
                  onChange={(event) =>
                    updateField('autoInstallOnQuit', event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-yellow-500"
                />
                <div>
                  <p className="font-medium">Install downloaded update on exit</p>
                  <p
                    className={`mt-1 text-sm ${
                      theme.isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    When enabled, a downloaded update installs the next time the
                    app closes.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Check interval (minutes)
              </label>
              <input
                type="number"
                min={5}
                step={1}
                value={settings.checkIntervalMinutes}
                onChange={(event) =>
                  updateField(
                    'checkIntervalMinutes',
                    Math.max(5, Number(event.target.value) || 5),
                  )
                }
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                  theme.isDark
                    ? 'border-gray-700 bg-gray-900 text-white focus:border-yellow-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-yellow-600'
                }`}
              />
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              theme.isDark
                ? 'border-gray-800 bg-gray-900'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Rocket
                size={18}
                className={theme.isDark ? 'text-yellow-400' : 'text-yellow-600'}
              />
              <h3 className="font-semibold">Update Status</h3>
            </div>

            <div
              className={`mt-4 space-y-3 text-sm ${
                theme.isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              <p>Current version: {status?.currentVersion || 'Unknown'}</p>
              <p>
                Source:{' '}
                {status?.provider === 'github'
                  ? 'GitHub Releases'
                  : 'Custom / local feed'}
              </p>
              {status?.provider === 'github' ? (
                <p>
                  Repository:{' '}
                  {status.githubOwner && status.githubRepo
                    ? `${status.githubOwner}/${status.githubRepo}`
                    : 'Not configured'}
                </p>
              ) : (
                <p>Feed URL: {status?.updateUrl || 'Not configured'}</p>
              )}
              <p>Latest detected version: {status?.availableVersion || 'None yet'}</p>
              <p className={statusTone}>{status?.message || 'Loading update status...'}</p>
              {status && status.downloadProgress !== null && (
                <p>Download progress: {status.downloadProgress.toFixed(0)}%</p>
              )}
              {status && status.lastCheckedAt && (
                <p>
                  Last checked:{' '}
                  {new Date(status.lastCheckedAt).toLocaleString()}
                </p>
              )}
            </div>

            {!status?.isSupported && (
              <div
                className={`mt-4 flex gap-2 rounded-xl border p-3 text-sm ${
                  theme.isDark
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
                }`}
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>
                  Auto-updates only run in the installed Windows build, not inside
                  the local dev session.
                </p>
              </div>
            )}

            {status?.downloaded && (
              <div
                className={`mt-4 flex gap-2 rounded-xl border p-3 text-sm ${
                  theme.isDark
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : 'border-green-200 bg-green-50 text-green-800'
                }`}
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <p>The next update is already downloaded and ready.</p>
              </div>
            )}

            {(actionError || status?.error) && (
              <div
                className={`mt-4 flex gap-2 rounded-xl border p-3 text-sm ${
                  theme.isDark
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{actionError || status?.error}</p>
              </div>
            )}

            <div className="mt-5 grid gap-3">
              <button
                onClick={handleCheckNow}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  theme.isDark
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <RefreshCw size={16} />
                Check now
              </button>

              {status?.phase === 'available' && !settings.autoDownload && (
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-yellow-400"
                >
                  <Download size={16} />
                  Download update
                </button>
              )}

              {status?.downloaded && (
                <button
                  onClick={handleInstall}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-green-400"
                >
                  <Rocket size={16} />
                  Restart and install
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center justify-between gap-4 border-t px-6 py-4 ${
            theme.isDark ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <p
            className={`text-xs ${
              theme.isDark ? 'text-gray-500' : 'text-gray-600'
            }`}
          >
            {settings.provider === 'github'
              ? 'A GitHub push only becomes an app update after the release workflow publishes a new GitHub Release.'
              : 'To push updates to other devices, package a new version and keep your local update server running.'}
          </p>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
