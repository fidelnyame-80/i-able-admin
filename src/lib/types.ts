export interface AppointmentRequest {
  id: number
  full_name: string
  phone: string
  email: string
  service: string
  session_type: string
  preferred_date: string
  preferred_time: string
  notes: string
  status: 'new' | 'contacted' | 'confirmed' | 'completed' | 'cancelled'
  internal_notes: string | null
  contacted_at: string | null
  created_at: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  role: 'master' | 'director' | 'dev'
  created_at: string
}

export interface AdminSession {
  id: number
  name: string
  email: string
  role: 'master' | 'director' | 'dev'
}

export interface SignupRequest {
  name: string
  email: string
  password: string
  role: 'master' | 'director' | 'dev'
}

export interface LoginRequest {
  email: string
  password: string
}

export type AppUpdateProvider = 'github' | 'generic'

export interface AppUpdateSettings {
  provider: AppUpdateProvider
  updateUrl: string
  githubOwner: string
  githubRepo: string
  enabled: boolean
  autoDownload: boolean
  autoInstallOnQuit: boolean
  checkIntervalMinutes: number
}

export type AppUpdatePhase =
  | 'disabled'
  | 'unconfigured'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error'

export interface AppUpdateStatus {
  phase: AppUpdatePhase
  currentVersion: string
  availableVersion: string | null
  downloadProgress: number | null
  lastCheckedAt: string | null
  provider: AppUpdateProvider
  updateUrl: string | null
  githubOwner: string | null
  githubRepo: string | null
  enabled: boolean
  autoDownload: boolean
  autoInstallOnQuit: boolean
  checkIntervalMinutes: number
  isSupported: boolean
  isConfigured: boolean
  downloaded: boolean
  message: string
  error: string | null
}

export type DatabaseConfigSource =
  | 'userConfig'
  | 'bundledConfig'
  | 'environment'
  | 'none'

export interface DatabaseSchemaStatus {
  adminUsersTable: boolean
  appointmentRequestsTable: boolean
  appointmentStatusColumn: boolean
  appointmentInternalNotesColumn: boolean
  appointmentContactedAtColumn: boolean
  appointmentSessionTypeColumn: boolean
}

export interface DatabaseStatus {
  isConfigured: boolean
  isConnected: boolean
  isReady: boolean
  source: DatabaseConfigSource
  configPath: string | null
  secureStorage: boolean
  schema: DatabaseSchemaStatus
  lastError: string | null
}
