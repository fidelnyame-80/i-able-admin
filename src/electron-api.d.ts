import type {
  AppointmentRequest,
  AdminSession,
  DatabaseStatus,
  SignupRequest,
  LoginRequest,
  AppUpdateSettings,
  AppUpdateStatus,
} from './lib/types.js'

interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: string
}

declare global {
  interface Window {
    electronAPI: {
      getDatabaseStatus: () => Promise<IpcResponse<DatabaseStatus>>
      saveDatabaseConfig: (databaseUrl: string) => Promise<IpcResponse<DatabaseStatus>>
      clearDatabaseConfig: () => Promise<IpcResponse<DatabaseStatus>>
      adminSignup: (request: SignupRequest) => Promise<IpcResponse<any>>
      adminLogin: (request: LoginRequest) => Promise<IpcResponse<AdminSession>>
      adminLogout: () => Promise<IpcResponse<void>>
      getSession: () => Promise<IpcResponse<AdminSession | null>>
      getAdminCount: () => Promise<IpcResponse<number>>
      getAllAdmins: () => Promise<IpcResponse<any[]>>
      getAppointments: () => Promise<IpcResponse<AppointmentRequest[]>>
      searchAppointments: (query: string) => Promise<IpcResponse<AppointmentRequest[]>>
      getAppointmentById: (id: number) => Promise<IpcResponse<AppointmentRequest>>
      updateAppointmentStatus: (id: number, status: string, internalNotes?: string) => Promise<IpcResponse<AppointmentRequest>>
      getUpdateSettings: () => Promise<IpcResponse<AppUpdateSettings>>
      saveUpdateSettings: (settings: AppUpdateSettings) => Promise<IpcResponse<AppUpdateSettings>>
      getUpdateStatus: () => Promise<IpcResponse<AppUpdateStatus>>
      checkForAppUpdates: () => Promise<IpcResponse<AppUpdateStatus>>
      downloadAppUpdate: () => Promise<IpcResponse<AppUpdateStatus>>
      installAppUpdate: () => Promise<IpcResponse<void>>
      onUpdateStatusChanged: (callback: (status: AppUpdateStatus) => void) => () => void
    }
  }
}

export {}
