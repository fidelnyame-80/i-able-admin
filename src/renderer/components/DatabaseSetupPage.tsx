import { useMemo, useState } from 'react'
import { CheckCircle2, Database, ExternalLink, RefreshCw, Shield } from 'lucide-react'
import { DatabaseStatus } from '../../lib/types'
import { useTheme } from '../context/ThemeContext'
import logoIcon from '../../images/i-able-logo.png'

interface DatabaseSetupPageProps {
  canCancel?: boolean
  onCancel?: () => void
  onConfigured: (status: DatabaseStatus) => void
  status: DatabaseStatus | null
}

export function DatabaseSetupPage({
  canCancel = false,
  onCancel,
  onConfigured,
  status,
}: DatabaseSetupPageProps) {
  const { theme } = useTheme()
  const [databaseUrl, setDatabaseUrl] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const schemaChecks = useMemo(
    () => [
      {
        label: 'Admin accounts table (`admin_users`)',
        passed: status?.schema.adminUsersTable ?? false,
      },
      {
        label: 'Appointment requests table (`appointment_requests`)',
        passed: status?.schema.appointmentRequestsTable ?? false,
      },
      {
        label: 'Required appointment status column',
        passed: status?.schema.appointmentStatusColumn ?? false,
      },
      {
        label: 'Required appointment notes column',
        passed: status?.schema.appointmentInternalNotesColumn ?? false,
      },
      {
        label: 'Required appointment contacted timestamp column',
        passed: status?.schema.appointmentContactedAtColumn ?? false,
      },
      {
        label: 'Required appointment session type column',
        passed: status?.schema.appointmentSessionTypeColumn ?? false,
      },
    ],
    [status],
  )

  const refreshStatus = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const response = await window.electronAPI.getDatabaseStatus()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to refresh database status')
      }

      onConfigured(response.data)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to refresh database status',
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await window.electronAPI.saveDatabaseConfig(databaseUrl)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to save database settings')
      }

      setDatabaseUrl('')
      onConfigured(response.data)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save database settings',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    setIsClearing(true)
    setError(null)

    try {
      const response = await window.electronAPI.clearDatabaseConfig()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to clear saved database settings')
      }

      onConfigured(response.data)
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : 'Unable to clear saved database settings',
      )
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 py-10 ${
        theme.isDark
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-slate-950'
          : 'bg-gradient-to-br from-slate-50 via-white to-amber-50'
      }`}
    >
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div
          className={`rounded-3xl border p-8 shadow-2xl ${
            theme.isDark
              ? 'border-gray-800 bg-gray-900/95'
              : 'border-white/70 bg-white/95'
          }`}
        >
          <div className="mb-8 flex items-center gap-4">
            <img
              src={logoIcon}
              alt="i-Able Logo"
              className="h-14 w-14 rounded-2xl object-contain"
            />
            <div>
              <p
                className={`text-sm font-semibold uppercase tracking-[0.2em] ${
                  theme.isDark ? 'text-yellow-400' : 'text-amber-700'
                }`}
              >
                First-run Setup
              </p>
              <h1
                className={`text-3xl font-bold ${
                  theme.isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Connect i-Able Admin to your database
              </h1>
            </div>
          </div>

          <p
            className={`mb-8 max-w-3xl text-base leading-7 ${
              theme.isDark ? 'text-gray-300' : 'text-slate-600'
            }`}
          >
            Paste your Neon Postgres connection string below. The app will save it
            for this Windows user, verify the connection, and run the safe schema
            setup for the admin dashboard.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span
                className={`mb-2 block text-sm font-semibold ${
                  theme.isDark ? 'text-gray-200' : 'text-slate-700'
                }`}
              >
                Postgres connection string
              </span>
              <div
                className={`rounded-2xl border px-4 py-4 ${
                  theme.isDark
                    ? 'border-gray-700 bg-gray-950'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <input
                  type={showUrl ? 'text' : 'password'}
                  value={databaseUrl}
                  onChange={(event) => setDatabaseUrl(event.target.value)}
                  placeholder="postgresql://user:password@host/database?sslmode=require"
                  className={`w-full bg-transparent text-sm outline-none ${
                    theme.isDark ? 'text-white' : 'text-slate-900'
                  }`}
                />
              </div>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !databaseUrl.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving and configuring...' : 'Save and configure'}
              </button>
              <button
                onClick={() => setShowUrl((previous) => !previous)}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  theme.isDark
                    ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {showUrl ? 'Hide URL' : 'Show URL'}
              </button>
              <button
                onClick={refreshStatus}
                disabled={isRefreshing}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  theme.isDark
                    ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh status
              </button>
              {status?.source === 'userConfig' && (
                <button
                  onClick={handleClear}
                  disabled={isClearing}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                    theme.isDark
                      ? 'bg-red-950/60 text-red-200 hover:bg-red-900/70'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isClearing ? 'Clearing...' : 'Clear saved config'}
                </button>
              )}
              {canCancel && onCancel && (
                <button
                  onClick={onCancel}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                    theme.isDark
                      ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Back to login
                </button>
              )}
            </div>
          </div>

          {(error || status?.lastError) && (
            <div
              className={`mt-6 rounded-2xl border px-4 py-4 text-sm ${
                theme.isDark
                  ? 'border-red-900/60 bg-red-950/40 text-red-200'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {error || status?.lastError}
            </div>
          )}

          <div
            className={`mt-8 rounded-2xl border p-5 ${
              theme.isDark
                ? 'border-gray-800 bg-gray-950/60'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <Database
                className={`h-5 w-5 ${
                  theme.isDark ? 'text-yellow-400' : 'text-amber-700'
                }`}
              />
              <h2
                className={`text-lg font-semibold ${
                  theme.isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Database readiness checklist
              </h2>
            </div>
            <div className="space-y-3">
              {schemaChecks.map((check) => (
                <div
                  key={check.label}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                    theme.isDark ? 'bg-gray-900' : 'bg-white'
                  }`}
                >
                  <CheckCircle2
                    className={`mt-0.5 h-5 w-5 ${
                      check.passed
                        ? 'text-emerald-500'
                        : theme.isDark
                          ? 'text-gray-600'
                          : 'text-slate-300'
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        theme.isDark ? 'text-gray-100' : 'text-slate-800'
                      }`}
                    >
                      {check.label}
                    </p>
                    <p
                      className={`text-xs ${
                        check.passed
                          ? theme.isDark
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                          : theme.isDark
                            ? 'text-gray-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {check.passed ? 'Ready' : 'Missing or not yet applied'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div
            className={`rounded-3xl border p-6 ${
              theme.isDark
                ? 'border-gray-800 bg-gray-900/95'
                : 'border-white/70 bg-white/95'
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <Shield
                className={`h-5 w-5 ${
                  theme.isDark ? 'text-yellow-400' : 'text-amber-700'
                }`}
              />
              <h2
                className={`text-lg font-semibold ${
                  theme.isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Current status
              </h2>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className={theme.isDark ? 'text-gray-400' : 'text-slate-500'}>
                  Configuration source
                </p>
                <p className={theme.isDark ? 'text-white' : 'text-slate-900'}>
                  {status?.source === 'userConfig'
                    ? 'Saved local app config'
                    : status?.source === 'bundledConfig'
                      ? 'Bundled with installer'
                    : status?.source === 'environment'
                      ? 'Environment variable'
                      : 'Not configured'}
                </p>
              </div>
              <div>
                <p className={theme.isDark ? 'text-gray-400' : 'text-slate-500'}>
                  Connection
                </p>
                <p className={theme.isDark ? 'text-white' : 'text-slate-900'}>
                  {status?.isConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <div>
                <p className={theme.isDark ? 'text-gray-400' : 'text-slate-500'}>
                  Local storage
                </p>
                <p className={theme.isDark ? 'text-white' : 'text-slate-900'}>
                  {status?.secureStorage
                    ? 'Protected with Windows secure storage when saved locally'
                    : 'Saved locally without OS encryption fallback'}
                </p>
              </div>
              {status?.configPath && (
                <div>
                  <p className={theme.isDark ? 'text-gray-400' : 'text-slate-500'}>
                    Config file path
                  </p>
                  <p
                    className={`break-all ${
                      theme.isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}
                  >
                    {status.configPath}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className={`rounded-3xl border p-6 ${
              theme.isDark
                ? 'border-gray-800 bg-gray-900/95'
                : 'border-white/70 bg-white/95'
            }`}
          >
            <h2
              className={`mb-3 text-lg font-semibold ${
                theme.isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Before you continue
            </h2>
            <ul
              className={`space-y-3 text-sm leading-6 ${
                theme.isDark ? 'text-gray-300' : 'text-slate-600'
              }`}
            >
              <li>
                Use the same Neon Postgres database your public i-Able website uses
                for `appointment_requests`.
              </li>
              <li>
                The saved connection string is stored per Windows user, so each
                workstation can point at the correct database.
              </li>
              <li>
                If you already use a `.env` file during development, this screen can
                still override it for the installed app.
              </li>
            </ul>

            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noreferrer"
              className={`mt-5 inline-flex items-center gap-2 text-sm font-medium ${
                theme.isDark ? 'text-yellow-400' : 'text-amber-700'
              }`}
            >
              Open Neon Console
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
