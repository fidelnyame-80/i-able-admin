const { contextBridge, ipcRenderer } = require('electron')

const electronAPI = {
  getDatabaseStatus: () =>
    ipcRenderer.invoke('config:getDatabaseStatus'),
  saveDatabaseConfig: (databaseUrl) =>
    ipcRenderer.invoke('config:saveDatabase', databaseUrl),
  clearDatabaseConfig: () =>
    ipcRenderer.invoke('config:clearDatabase'),
  adminSignup: (request) =>
    ipcRenderer.invoke('admin:signup', request),
  adminLogin: (request) =>
    ipcRenderer.invoke('admin:login', request),
  adminLogout: () =>
    ipcRenderer.invoke('admin:logout'),
  getSession: () =>
    ipcRenderer.invoke('admin:getSession'),
  getAdminCount: () =>
    ipcRenderer.invoke('admin:count'),
  getAllAdmins: () =>
    ipcRenderer.invoke('admin:getAll'),
  getAppointments: () =>
    ipcRenderer.invoke('appointments:getAll'),
  searchAppointments: (query) =>
    ipcRenderer.invoke('appointments:search', query),
  getAppointmentById: (id) =>
    ipcRenderer.invoke('appointments:getById', id),
  updateAppointmentStatus: (id, status, internalNotes) =>
    ipcRenderer.invoke('appointments:updateStatus', id, status, internalNotes),
}

try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  console.log('[preload] electronAPI exposed successfully')
} catch (err) {
  console.error('[preload] Failed to expose electronAPI:', err)
}
