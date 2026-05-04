const { contextBridge, ipcRenderer } = require('electron')
import type {
  SignupRequest,
  LoginRequest,
  AdminSession,
  AppointmentRequest,
  DatabaseStatus,
} from './lib/types.js'

interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const electronAPI = {
  // Configuration APIs
  getDatabaseStatus: () =>
    ipcRenderer.invoke('config:getDatabaseStatus') as Promise<
      IpcResponse<DatabaseStatus>
    >,
  saveDatabaseConfig: (databaseUrl: string) =>
    ipcRenderer.invoke('config:saveDatabase', databaseUrl) as Promise<
      IpcResponse<DatabaseStatus>
    >,
  clearDatabaseConfig: () =>
    ipcRenderer.invoke('config:clearDatabase') as Promise<
      IpcResponse<DatabaseStatus>
    >,

  // Admin APIs
  adminSignup: (request: SignupRequest) =>
    ipcRenderer.invoke('admin:signup', request) as Promise<
      IpcResponse<any>
    >,
  adminLogin: (request: LoginRequest) =>
    ipcRenderer.invoke('admin:login', request) as Promise<
      IpcResponse<AdminSession>
    >,
  adminLogout: () =>
    ipcRenderer.invoke('admin:logout') as Promise<IpcResponse<void>>,
  getSession: () =>
    ipcRenderer.invoke('admin:getSession') as Promise<
      IpcResponse<AdminSession | null>
    >,
  getAdminCount: () =>
    ipcRenderer.invoke('admin:count') as Promise<IpcResponse<number>>,
  getAllAdmins: () =>
    ipcRenderer.invoke('admin:getAll') as Promise<IpcResponse<any[]>>,

  // Appointment APIs
  getAppointments: () =>
    ipcRenderer.invoke('appointments:getAll') as Promise<
      IpcResponse<AppointmentRequest[]>
    >,
  searchAppointments: (query: string) =>
    ipcRenderer.invoke('appointments:search', query) as Promise<
      IpcResponse<AppointmentRequest[]>
    >,
  getAppointmentById: (id: number) =>
    ipcRenderer.invoke('appointments:getById', id) as Promise<
      IpcResponse<AppointmentRequest>
    >,
  updateAppointmentStatus: (
    id: number,
    status: string,
    internalNotes?: string,
  ) =>
    ipcRenderer.invoke(
      'appointments:updateStatus',
      id,
      status,
      internalNotes,
    ) as Promise<IpcResponse<AppointmentRequest>>,
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}
